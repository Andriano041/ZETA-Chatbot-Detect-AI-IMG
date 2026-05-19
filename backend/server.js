const express = require("express");
const cors = require("cors");
const multer = require("multer");
const exifr = require("exifr");
const Groq = require("groq-sdk");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose"); // 1. Import Mongoose

require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// ==================== MONGOOSE CONNECTION ====================
// Ambil URL dari .env, jika tidak ada pakai fallback cluster gratis kamu
const mongoURI = process.env.MONGO_URI;

if (!mongoURI) {
  console.error("❌ ERROR: MONGO_URI tidak terdefinisi di berkas .env");
  process.exit(1);
}

mongoose.connect(mongoURI)
  .then(() => console.log("✅ Mantap! MongoDB Atlas Berhasil Terhubung."))
  .catch(err => console.error("❌ Gagal Konek ke MongoDB:", err.message));

// ==================== MONGOOSE SCHEMAS & MODELS ====================
// Schema untuk Riwayat Deteksi Umum
const HistorySchema = new mongoose.Schema({
  filename: String,
  imageUrl: String,
  verdict: String,
  aiProbability: Number,
  message: String,
  createdAt: { type: Date, default: Date.now }
});
const HistoryModel = mongoose.model("History", HistorySchema);

// Schema untuk Sesi Chatbot (Context Memory)
const ChatSessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  messages: [
    {
      role: { type: String, enum: ["user", "model", "assistant"] },
      parts: [{ text: String }]
    }
  ],
  updatedAt: { type: Date, default: Date.now }
});
const ChatSessionModel = mongoose.model("ChatSession", ChatSessionSchema);
// ===================================================================

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Helper untuk konversi format riwayat percakapan MongoDB ke format Groq SDK
function convertSessionMessagesToGroq(sessionMessages) {
  return sessionMessages.map(msg => {
    const role = msg.role === "model" ? "assistant" : msg.role;
    const textContent = msg.parts && msg.parts[0] ? msg.parts[0].text : "";
    return {
      role: role,
      content: textContent
    };
  });
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

// Endpoint untuk mendeteksi keaslian gambar
app.post("/detect", upload.single("image"), async (req, res) => {
  try {
    const { message, sessionId = "default" } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: "Gambar harus diunggah untuk dianalisis." });
    }

    const safeFilename = `${Date.now()}-${file.originalname.replace(/\s+/g, "_")}`;
    const uploadPath = path.join(uploadsDir, safeFilename);
    try {
      fs.writeFileSync(uploadPath, file.buffer);
    } catch (fsError) {
      console.error("⚠️ Gagal menyimpan file gambar ke disk:", fsError.message);
    }
    const imageUrl = `http://localhost:5000/uploads/${safeFilename}`;

    let metadata = null;
    try {
      const parsedExif = await exifr.parse(file.buffer);
      if (parsedExif) {
        metadata = {
          make: parsedExif.Make || null,
          model: parsedExif.Model || null,
          software: parsedExif.Software || null,
          dateTime: parsedExif.DateTimeOriginal || parsedExif.CreateDate || null,
        };
      }
    } catch (exifError) {
      console.warn("⚠️ Gagal mengekstrak EXIF data:", exifError.message);
    }

    const base64Image = file.buffer.toString("base64");
    const mimeType = file.mimetype;

    let exifPromptSegment = "";
    if (metadata && (metadata.make || metadata.model || metadata.software)) {
      exifPromptSegment = `\nBerikut adalah informasi metadata EXIF yang berhasil diekstrak dari gambar:
- Merek Kamera/Device: ${metadata.make || "Tidak diketahui"}
- Model Device: ${metadata.model || "Tidak diketahui"}
- Software Editor/Pembuat: ${metadata.software || "Tidak diketahui"}
- Waktu Pengambilan: ${metadata.dateTime || "Tidak diketahui"}
Gunakan informasi EXIF di atas sebagai indikator tambahan dalam analisis Anda.`;
    } else {
      exifPromptSegment = `\nMetadata EXIF (seperti info kamera/hp) tidak ditemukan dalam gambar ini. Hal ini umum terjadi jika gambar diunduh dari internet, dikompres, atau merupakan hasil generator AI.`;
    }

    const prompt = `Analisis gambar yang diunggah ini untuk menentukan apakah gambar ini dihasilkan oleh kecerdasan buatan (AI-Generated / Synthetic / AI Art) atau merupakan karya asli manusia (Real / Authentic Photo / Digital Art manual).

Lakukan pengamatan mendalam pada detail visual:
1. Keganjilan struktural atau fisik (misal: jumlah jari yang tidak biasa, bentuk pupil mata tidak bulat sempurna, ketidaksinambungan kacamata, anomali latar belakang).
2. Tekstur dan pencahayaan (misal: area kulit yang terlalu halus seperti plastik, pencahayaan yang tidak konsisten dengan bayangan, detail yang meleleh pada objek kecil di latar belakang).
3. Teks atau simbol (AI seringkali gagal merender teks yang terbaca dengan jelas).
${exifPromptSegment}

Keluarkan hasil analisis dalam format JSON yang valid seperti contoh berikut (tidak boleh ada format teks lain di luar JSON ini):
{
  "verdict": "Sangat Mungkin AI",
  "aiProbability": 95,
  "analysisReasoning": "Tulis penjelasan detail mengapa Anda mengkategorikan gambar tersebut. Sebutkan kelemahan visual atau petunjuk metadata yang Anda temukan dalam bahasa Indonesia.",
  "identifiedAnomalies": [
    "Ditemukan distorsi bentuk pada jari tangan kanan subjek.",
    "Latar belakang memiliki pola geometris yang meleleh dan tidak konsisten.",
    "Tidak ditemukan metadata EXIF kamera."
  ]
}

PENTING: Nilai "verdict" harus salah satu dari: "Sangat Mungkin AI", "Mungkin AI", "Mungkin Asli", "Sangat Mungkin Asli". Nilai "aiProbability" adalah angka 0 sampai 100.`;

    // 2. Ambil riwayat chat Sesi dari MongoDB Atlas
    let sessionData = await ChatSessionModel.findOne({ sessionId });
    const sessionMessages = sessionData ? sessionData.messages : [];

    const groqHistory = convertSessionMessagesToGroq(sessionMessages);

    const messages = [
      ...groqHistory,
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Image}` } }
        ]
      }
    ];

    const chatCompletion = await groq.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: messages,
      response_format: { type: "json_object" }
    });

    const rawText = chatCompletion.choices[0]?.message?.content || "{}";
    const cleanJson = rawText.replace(/```json|```/g, "").trim();
    let geminiResponse;
    try {
      geminiResponse = JSON.parse(cleanJson);
    } catch (parseError) {
      console.error("❌ Gagal memparse respon JSON Gemini:", parseError.message);
      geminiResponse = {
        verdict: "Tidak Diketahui",
        aiProbability: 50,
        analysisReasoning: rawText || "Gagal menganalisis gambar secara terstruktur.",
        identifiedAnomalies: ["Gagal menganalisis anomali secara terpisah."]
      };
    }

    const verdictText = geminiResponse.verdict || "Tidak Diketahui";
    const probabilityNum = geminiResponse.aiProbability !== undefined ? geminiResponse.aiProbability : 50;
    const explanationText = geminiResponse.analysisReasoning || rawText;

    // 3. Simpan riwayat percakapan baru ke MongoDB Atlas (Sesi Chat)
    const newUserMsg = { role: "user", parts: [{ text: `Menganalisis gambar: ${file.originalname}.` }] };
    const newBotMsg = { role: "model", parts: [{ text: explanationText }] };
    const updatedMessages = [...sessionMessages, newUserMsg, newBotMsg];

    await ChatSessionModel.findOneAndUpdate(
      { sessionId },
      { messages: updatedMessages, updatedAt: Date.now() },
      { upsert: true, new: true }
    );

    // 4. Simpan ke MongoDB Atlas untuk Riwayat Umum
    const newHistory = new HistoryModel({
      filename: file.originalname,
      imageUrl: imageUrl,
      verdict: verdictText,
      aiProbability: probabilityNum,
      message: explanationText
    });
    await newHistory.save();

    return res.json({
      status: "success",
      verdict: verdictText,
      aiProbability: probabilityNum,
      message: explanationText,
      anomalies: geminiResponse.identifiedAnomalies || [],
      metadata: metadata,
      imageUrl: imageUrl
    });
  } catch (error) {
    console.error("❌ Error in /detect endpoint:", error);
    let friendlyMessage = "Terjadi kesalahan saat mendeteksi keaslian gambar.";
    if (error.message && (error.message.includes("quota") || error.message.includes("429") || error.message.includes("limit") || error.message.includes("EXHAUSTED"))) {
      friendlyMessage = "Batas kuota gratis Groq API Key Anda telah terlampaui. Mohon tunggu beberapa detik sebelum mencoba kembali, atau gunakan API Key yang baru.";
    } else if (error.message && (error.message.includes("expired") || error.message.includes("INVALID_ARGUMENT") || error.message.includes("key"))) {
      friendlyMessage = "API Key Groq Anda kedaluwarsa atau tidak valid. Silakan buat/perbarui API Key baru di berkas .env.";
    }
    return res.status(500).json({
      error: friendlyMessage,
      details: error.message,
    });
  }
});

app.post("/chat", async (req, res) => {
  try {
    const { message, sessionId = "default" } = req.body;

    if (!message || message.trim() === "") {
      return res.status(400).json({ error: "Pesan tidak boleh kosong." });
    }

    // 5. Ambil riwayat sesi chat dari MongoDB Atlas
    let sessionData = await ChatSessionModel.findOne({ sessionId });
    const sessionMessages = sessionData ? sessionData.messages : [];

    const groqHistory = convertSessionMessagesToGroq(sessionMessages);

    const messages = [
      {
        role: "system",
        content: "Anda adalah ZETA, asisten AI ramah yang terintegrasi di dalam aplikasi AI Detector. Jawab pertanyaan pengguna dengan merujuk pada analisis gambar terakhir yang dilakukan bila relevan."
      },
      ...groqHistory,
      { role: "user", content: message }
    ];

    const chatCompletion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: messages,
    });

    const botResponse = chatCompletion.choices[0]?.message?.content || "Maaf, saya tidak dapat memberikan tanggapan saat ini.";

    // 6. Update Sesi Chat dengan pesan baru ke MongoDB Atlas
    const updatedMessages = [
      ...sessionMessages,
      { role: "user", parts: [{ text: message }] },
      { role: "model", parts: [{ text: botResponse }] }
    ];

    await ChatSessionModel.findOneAndUpdate(
      { sessionId },
      { messages: updatedMessages, updatedAt: Date.now() },
      { upsert: true }
    );

    return res.json({
      status: "success",
      message: botResponse,
    });
  } catch (error) {
    console.error("❌ Groq API Error dalam /chat:", error.message);
    let friendlyMessage = "Terjadi kesalahan saat memproses pesan ke Groq AI.";
    if (error.message && (error.message.includes("quota") || error.message.includes("429") || error.message.includes("limit") || error.message.includes("EXHAUSTED"))) {
      friendlyMessage = "Batas kuota gratis Groq API Key Anda telah terlampaui. Mohon tunggu beberapa detik sebelum mencoba kembali, atau gunakan API Key yang baru.";
    } else if (error.message && (error.message.includes("expired") || error.message.includes("INVALID_ARGUMENT") || error.message.includes("key"))) {
      friendlyMessage = "API Key Groq Anda kedaluwarsa atau tidak valid. Silakan buat/perbarui API Key baru di berkas .env.";
    }
    return res.status(500).json({ error: friendlyMessage, details: error.message });
  }
});

// Endpoint untuk mendapatkan riwayat deteksi dari MongoDB Atlas
app.get("/history", async (req, res) => {
  try {
    // 7. Ambil data dari MongoDB urutkan berdasarkan waktu terbaru
    const history = await HistoryModel.find().sort({ createdAt: -1 });
    return res.json(history);
  } catch (error) {
    console.error("❌ Gagal mengambil riwayat:", error.message);
    return res.status(500).json({ error: "Gagal mengambil riwayat." });
  }
});

// Endpoint untuk membersihkan seluruh riwayat deteksi di MongoDB Atlas
app.post("/clear-history", async (req, res) => {
  try {
    // 8. Hapus semua data di tabel History dan Sesi Chat
    await HistoryModel.deleteMany({});
    await ChatSessionModel.deleteMany({});
    return res.json({ status: "success", message: "Seluruh data riwayat di MongoDB berhasil dibersihkan." });
  } catch (error) {
    console.error("❌ Gagal membersihkan riwayat:", error.message);
    return res.status(500).json({ error: "Gagal membersihkan riwayat." });
  }
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", type: "chatbot-groq" });
});

app.listen(5000, () => {
  console.log("✅ Server running on port 5000 dengan MongoDB Atlas & Groq AI");
});