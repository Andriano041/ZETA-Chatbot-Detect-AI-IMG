const express = require("express");
const cors = require("cors");
const multer = require("multer");
const exifr = require("exifr");
const Groq = require("groq-sdk");
const fs = require("fs");
const bcrypt = require("bcrypt");
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

mongoose
  .connect(mongoURI)
  .then(() => console.log("✅ Mantap! MongoDB Atlas Berhasil Terhubung."))
  .catch((err) => console.error("❌ Gagal Konek ke MongoDB:", err.message));

// ==================== MONGOOSE SCHEMAS & MODELS ====================
// Schema untuk Riwayat Deteksi Umum
const HistorySchema = new mongoose.Schema({
  filename: String,
  imageUrl: String,
  verdict: String,
  aiProbability: Number,
  message: String,
  createdAt: { type: Date, default: Date.now },
});
const HistoryModel = mongoose.model("History", HistorySchema);

// Schema untuk Sesi Chatbot (Context Memory)
const ChatSessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  messages: [
    {
      role: { type: String, enum: ["user", "model", "assistant"] },
      parts: [{ text: String }],
    },
  ],
  updatedAt: { type: Date, default: Date.now },
});
const ChatSessionModel = mongoose.model("ChatSession", ChatSessionSchema);
// ===================================================================
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: String,
  avatar: String,
  password: { type: String }, // 👈 Tambahkan kolom password
  authMethod: { type: String, enum: ["manual", "google"], default: "manual" },
  createdAt: { type: Date, default: Date.now },
});
const UserModel = mongoose.model("User", UserSchema);
// ===================================================================

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Helper untuk konversi format riwayat percakapan MongoDB ke format Groq SDK
function convertSessionMessagesToGroq(sessionMessages) {
  return sessionMessages.map((msg) => {
    const role = msg.role === "model" ? "assistant" : msg.role;
    const textContent = msg.parts && msg.parts[0] ? msg.parts[0].text : "";
    return {
      role: role,
      content: textContent,
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
      return res
        .status(400)
        .json({ error: "Gambar harus diunggah untuk dianalisis." });
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
          dateTime:
            parsedExif.DateTimeOriginal || parsedExif.CreateDate || null,
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
3. Refleksi dan Pencahayaan (AI sering gagal merender pantulan cahaya yang simetris dan logis pada pupil mata kiri dan kanan. Periksa juga apakah arah bayangan konsisten dengan sumber cahaya).
4. Teks atau simbol (AI seringkali gagal merender teks yang terbaca dengan jelas, biasanya hurufnya meliuk atau acak).
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

    const contohLembarLatihan = [
      {
        role: "user",
        content:
          "Contoh Analisis Kasus Gambar Manusia Asli yang diedit mulus menggunakan filter aplikasi.",
      },
      {
        role: "assistant",
        content: JSON.stringify({
          verdict: "Mungkin Asli",
          aiProbability: 20,
          analysisReasoning:
            "Meskipun area kulit wajah terlihat sangat halus menyerupai renderan AI akibat penggunaan filter kecantikan (smoothing filter), struktur kelopak mata, keaslian tekstur helai rambut, serta pantulan cahaya pada pupil mata kanan dan kiri terbukti sangat simetris dan logis. Arah bayangan pada leher juga konsisten dengan pencahayaan dari atas.",
          identifiedAnomalies: [
            "Kulit mengalami kehilangan pori-pori akibat pasca-pemrosesan filter digital, namun anatomi fisik dasar tetap akurat.",
          ],
        }),
      },
    ];

    const messages = [
      ...groqHistory,
      ...contohLembarLatihan,
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          {
            type: "image_url",
            image_url: { url: `data:${mimeType};base64,${base64Image}` },
          },
        ],
      },
    ];

    const chatCompletion = await groq.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: messages,
      response_format: { type: "json_object" },
    });

    const rawText = chatCompletion.choices[0]?.message?.content || "{}";
    const cleanJson = rawText.replace(/```json|```/g, "").trim();
    let geminiResponse;
    try {
      geminiResponse = JSON.parse(cleanJson);
    } catch (parseError) {
      console.error(
        "❌ Gagal memparse respon JSON Gemini:",
        parseError.message,
      );
      geminiResponse = {
        verdict: "Tidak Diketahui",
        aiProbability: 50,
        analysisReasoning:
          rawText || "Gagal menganalisis gambar secara terstruktur.",
        identifiedAnomalies: ["Gagal menganalisis anomali secara terpisah."],
      };
    }

    const verdictText = geminiResponse.verdict || "Tidak Diketahui";
    const probabilityNum =
      geminiResponse.aiProbability !== undefined
        ? geminiResponse.aiProbability
        : 50;
    const explanationText = geminiResponse.analysisReasoning || rawText;

    // 3. Simpan riwayat percakapan baru ke MongoDB Atlas (Sesi Chat)
    const newUserMsg = {
      role: "user",
      parts: [{ text: `Menganalisis gambar: ${file.originalname}.` }],
    };
    const newBotMsg = { role: "model", parts: [{ text: explanationText }] };
    const updatedMessages = [...sessionMessages, newUserMsg, newBotMsg];

    await ChatSessionModel.findOneAndUpdate(
      { sessionId },
      { messages: updatedMessages, updatedAt: Date.now() },
      { upsert: true, new: true },
    );

    // 4. Simpan ke MongoDB Atlas untuk Riwayat Umum
    const newHistory = new HistoryModel({
      filename: file.originalname,
      imageUrl: imageUrl,
      verdict: verdictText,
      aiProbability: probabilityNum,
      message: explanationText,
    });
    await newHistory.save();

    return res.json({
      status: "success",
      verdict: verdictText,
      aiProbability: probabilityNum,
      message: explanationText,
      anomalies: geminiResponse.identifiedAnomalies || [],
      metadata: metadata,
      imageUrl: imageUrl,
    });
  } catch (error) {
    console.error("❌ Error in /detect endpoint:", error);
    let friendlyMessage = "Terjadi kesalahan saat mendeteksi keaslian gambar.";
    if (
      error.message &&
      (error.message.includes("quota") ||
        error.message.includes("429") ||
        error.message.includes("limit") ||
        error.message.includes("EXHAUSTED"))
    ) {
      friendlyMessage =
        "Batas kuota gratis Groq API Key Anda telah terlampaui. Mohon tunggu beberapa detik sebelum mencoba kembali, atau gunakan API Key yang baru.";
    } else if (
      error.message &&
      (error.message.includes("expired") ||
        error.message.includes("INVALID_ARGUMENT") ||
        error.message.includes("key"))
    ) {
      friendlyMessage =
        "API Key Groq Anda kedaluwarsa atau tidak valid. Silakan buat/perbarui API Key baru di berkas .env.";
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
        content:
          "Anda adalah ZETA, asisten AI ramah yang terintegrasi di dalam aplikasi AI Detector. Jawab pertanyaan pengguna dengan merujuk pada analisis gambar terakhir yang dilakukan bila relevan.",
      },
      ...groqHistory,
      { role: "user", content: message },
    ];

    const chatCompletion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: messages,
    });

    const botResponse =
      chatCompletion.choices[0]?.message?.content ||
      "Maaf, saya tidak dapat memberikan tanggapan saat ini.";

    // 6. Update Sesi Chat dengan pesan baru ke MongoDB Atlas
    const updatedMessages = [
      ...sessionMessages,
      { role: "user", parts: [{ text: message }] },
      { role: "model", parts: [{ text: botResponse }] },
    ];

    await ChatSessionModel.findOneAndUpdate(
      { sessionId },
      { messages: updatedMessages, updatedAt: Date.now() },
      { upsert: true },
    );

    return res.json({
      status: "success",
      message: botResponse,
    });
  } catch (error) {
    console.error("❌ Groq API Error dalam /chat:", error.message);
    let friendlyMessage = "Terjadi kesalahan saat memproses pesan ke Groq AI.";
    if (
      error.message &&
      (error.message.includes("quota") ||
        error.message.includes("429") ||
        error.message.includes("limit") ||
        error.message.includes("EXHAUSTED"))
    ) {
      friendlyMessage =
        "Batas kuota gratis Groq API Key Anda telah terlampaui. Mohon tunggu beberapa detik sebelum mencoba kembali, atau gunakan API Key yang baru.";
    } else if (
      error.message &&
      (error.message.includes("expired") ||
        error.message.includes("INVALID_ARGUMENT") ||
        error.message.includes("key"))
    ) {
      friendlyMessage =
        "API Key Groq Anda kedaluwarsa atau tidak valid. Silakan buat/perbarui API Key baru di berkas .env.";
    }
    return res
      .status(500)
      .json({ error: friendlyMessage, details: error.message });
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
    return res.json({
      status: "success",
      message: "Seluruh data riwayat di MongoDB berhasil dibersihkan.",
    });
  } catch (error) {
    console.error("❌ Gagal membersihkan riwayat:", error.message);
    return res.status(500).json({ error: "Gagal membersihkan riwayat." });
  }
});

// ==================== ENDPOINT REGISTER MANUAL ====================
app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Semua kolom wajib diisi." });
    }

    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        error:
          "Email sudah terdaftar. Silakan gunakan email lain atau login via Google.",
      });
    }

    // 3. 🔥 INTEGRASI ABSTRACT API: Cek apakah email benar-benar ada di dunia nyata
    const apiKey = process.env.ABSTRACT_EMAIL_API_KEY;
    const abstractUrl = `https://emailvalidation.abstractapi.com/v1/?api_key=${apiKey}&email=${email}`;

    const abstractResponse = await fetch(abstractUrl);
    const emailData = await abstractResponse.json();

    // Sesuai dengan data JSON yang kamu lihat di layar Abstract API:
    const isDeliverable =
      emailData.email_deliverability?.status === "deliverable";
    const isSmtpValid = emailData.email_deliverability?.is_smtp_valid;

    // Jika statusnya tidak deliverable ATAU server SMTP menyatakan email tidak ada
    if (!isDeliverable || !isSmtpValid) {
      return res.status(400).json({
        error:
          "Email yang Anda masukkan tidak valid atau tidak terdaftar di Google/Yahoo. Gunakan email asli!",
      });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const newUser = new UserModel({
      name,
      email,
      password: hashedPassword,
      authMethod: "manual",
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
    });

    await newUser.save();
    console.log(`📝 User baru terdaftar secara manual: ${email}`);

    return res.json({
      status: "success",
      message: "Registrasi berhasil! Silakan login.",
    });
  } catch (error) {
    console.error("❌ Error pada Register Manual backend:", error.message);
    return res
      .status(500)
      .json({ error: "Terjadi kesalahan pada server saat registrasi." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email dan password wajib diisi." });
    }

    const user = await UserModel.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "Email atau password salah." });
    }

    if (user.authMethod !== "manual") {
      return res.status(401).json({
        error: `Akun ini terdaftar melalui ${user.authMethod}. Silakan login menggunakan Google.`,
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password || "");
    if (!passwordMatch) {
      return res.status(401).json({ error: "Email atau password salah." });
    }

    return res.json({
      status: "success",
      message: "Login berhasil.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    console.error("❌ Error pada Login Manual backend:", error.message);
    return res
      .status(500)
      .json({ error: "Terjadi kesalahan pada server saat login." });
  }
});

app.post("/api/auth/google", async (req, res) => {
  try {
    const { token } = req.body;
    if (!token)
      return res.status(400).json({ error: "Token Google diperlukan." });

    const googleResponse = await fetch(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    if (!googleResponse.ok)
      return res.status(401).json({ error: "Token tidak valid." });

    const userData = await googleResponse.json();
    const { email, name, picture } = userData;

    let user = await UserModel.findOne({ email });
    if (!user) {
      user = new UserModel({
        email,
        name,
        avatar: picture,
        authMethod: "google",
      });
      await user.save();
    } else {
      user.name = name;
      user.avatar = picture;
      await user.save();
    }

    return res.json({
      status: "success",
      message: "Login Google berhasil.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    console.error("❌ Error Google Auth:", error.message);
    return res.status(500).json({ error: "Server error." });
  }
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", type: "chatbot-groq" });
});

app.listen(5000, () => {
  console.log("✅ Server running on port 5000 dengan MongoDB Atlas & Groq AI");
});
