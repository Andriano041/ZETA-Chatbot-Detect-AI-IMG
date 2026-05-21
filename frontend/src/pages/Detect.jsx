import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import gundamLogo from "../img/gundam.jpg";
import "../styles/Chat.css";

const Detect = () => {
  const [sessionId, setSessionId] = useState(() => {
    const savedSessionId = localStorage.getItem("detect_session_id");
    if (savedSessionId) return savedSessionId;
    const newSessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem("detect_session_id", newSessionId);
    return newSessionId;
  });

  const [messages, setMessages] = useState(() => {
    const savedMessages = localStorage.getItem("detect_chat_messages");
    if (savedMessages) {
      try {
        return JSON.parse(savedMessages);
      } catch (e) {
        console.error("Gagal memuat pesan tersimpan:", e);
      }
    }
    return [
      {
        sender: "bot",
        text: "Halo! Saya adalah **ZETA**, asisten analisis gambar Anda. Silakan unggah atau **seret gambar** ke sini untuk mendeteksi apakah gambar tersebut dihasilkan oleh kecerdasan buatan (AI-generated) atau merupakan foto asli.",
      },
    ];
  });

  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // Simpan pesan ke localStorage setiap kali ada perubahan
  useEffect(() => {
    localStorage.setItem("detect_chat_messages", JSON.stringify(messages));
  }, [messages]);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Auto scroll ke bawah ketika ada pesan baru
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Bersihkan URL pratinjau ketika komponen tidak aktif
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Handle perubahan file gambar
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith("image/")) {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  // Hapus file terpilih
  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Reset chat obrolan ke awal
  const handleResetChat = () => {
    if (!window.confirm("Apakah Anda yakin ingin mereset obrolan saat ini?")) {
      return;
    }
    const newSessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem("detect_session_id", newSessionId);
    setSessionId(newSessionId);

    const initialMsg = [
      {
        sender: "bot",
        text: "Halo! Saya adalah **ZETA**, asisten analisis gambar Anda. Silakan unggah atau **seret gambar** ke sini untuk mendeteksi apakah gambar tersebut dihasilkan oleh kecerdasan buatan (AI-generated) atau merupakan foto asli.",
      },
    ];
    setMessages(initialMsg);
    localStorage.setItem("detect_chat_messages", JSON.stringify(initialMsg));
  };

  // Drag and Drop Handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  // Handle kirim pesan
  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!inputValue.trim() && !selectedFile) {
      return;
    }

    const userMessage = inputValue;
    const currentFile = selectedFile;
    const currentPreview = previewUrl;

    // Bersihkan input segera agar UI responsif
    setInputValue("");
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    // Tambahkan pesan user ke riwayat chat
    setMessages((prev) => [
      ...prev,
      {
        sender: "user",
        text: userMessage || "Mendeteksi keaslian gambar ini...",
        image: currentPreview,
      },
    ]);

    setIsLoading(true);

    try {
      let response;
      if (currentFile) {
        // Kirim menggunakan FormData untuk file + teks
        const formData = new FormData();
        formData.append("image", currentFile);
        formData.append("sessionId", sessionId);
        if (userMessage.trim()) {
          formData.append("message", userMessage);
        }

        const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:5000";
        response = await fetch(`${apiUrl}/detect`, {
          method: "POST",
          body: formData,
        });
      } else {
        // Kirim JSON biasa untuk teks saja
        const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:5000";
        response = await fetch(`${apiUrl}/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message: userMessage, sessionId }),
        });
      }

      const data = await response.json();

      if (!response.ok) {
        setMessages((prev) => [
          ...prev,
          {
            sender: "bot",
            text: `❌ Error: ${data?.error || "Terjadi kesalahan."}`,
          },
        ]);
        return;
      }

      // Tambahkan respons bot dengan detail klasifikasi AI, serta ganti blob URL user dengan URL gambar statis dari server
      setMessages((prev) => {
        const updated = [...prev];
        // Cari pesan user terakhir yang mempunyai image blob, lalu ganti dengan static imageUrl dari server
        for (let i = updated.length - 1; i >= 0; i--) {
          if (
            updated[i].sender === "user" &&
            updated[i].image &&
            updated[i].image.startsWith("blob:")
          ) {
            updated[i].image = data.imageUrl || updated[i].image;
            break;
          }
        }
        updated.push({
          sender: "bot",
          text: data.message,
          verdict: data.verdict,
          aiProbability: data.aiProbability,
          anomalies: data.anomalies,
          metadata: data.metadata,
        });
        return updated;
      });
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "❌ Gagal terhubung ke server. Pastikan backend sedang berjalan di localhost:5000",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const getVerdictClass = (verdict) => {
    switch (verdict) {
      case "Sangat Mungkin AI":
        return "verdict-badge ai-high";
      case "Mungkin AI":
        return "verdict-badge ai-medium";
      case "Mungkin Asli":
        return "verdict-badge real-medium";
      case "Sangat Mungkin Asli":
        return "verdict-badge real-high";
      default:
        return "verdict-badge unknown";
    }
  };

  const getProgressBarColor = (prob) => {
    if (prob >= 75) return "#ff3838"; // Red
    if (prob >= 40) return "#f5a623"; // Orange/Yellow
    return "#00f0ff"; // Neon Cyan (Authentic/Safe)
  };

  return (
    <div className="page-container detect-page-container animate-fade-in">
      <h1 className="page-title">Detect AI Generated Image</h1>
      <p className="page-description">
        Gunakan kecerdasan buatan Gemini untuk mengidentifikasi apakah sebuah
        gambar dibuat oleh AI (seperti Midjourney, DALL-E, atau Stable
        Diffusion) atau merupakan foto nyata.
      </p>

      <div
        className={`chat-container ${isDragging ? "dragging" : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div
          className="chat-header"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h1> ZETA - AI Verification Chatbot</h1>
          <button
            onClick={handleResetChat}
            className="upload-btn"
            style={{
              padding: "6px 14px",
              fontSize: "0.85rem",
              background: "rgba(56, 169, 255, 0.15)",
              color: "#38b6ffff",
              border: "1px solid rgba(56, 162, 255, 0.3)",
              borderRadius: "6px",
              cursor: "pointer",
              transition: "all 0.3s ease",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = "#38a2ffff";
              e.currentTarget.style.color = "#fff";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "rgba(56, 252, 255, 0.15)";
              e.currentTarget.style.color = "#38d4ffff";
            }}
          >
            Reset Chat
          </button>
        </div>

        <div className="chat-messages">
          {isDragging && (
            <div className="drag-overlay">
              <div className="drag-overlay-content">
                <span className="drag-icon">📸</span>
                <p>Jatuhkan gambar di sini untuk menganalisis keaslian</p>
              </div>
            </div>
          )}

          {messages.map((msg, index) => (
            <div key={index} className={`message message-${msg.sender}`}>
              {msg.sender === "bot" && (
                <div className="message-avatar">
                  <img src={gundamLogo} alt="ZETA" className="avatar-img" />
                </div>
              )}
              <div className="message-content">
                {msg.sender === "bot" && (
                  <span className="bot-label">ZETA</span>
                )}
                {msg.sender === "user" && (
                  <span className="user-label">👤 Anda:</span>
                )}

                {/* Tampilkan gambar yang diunggah */}
                {msg.image && (
                  <div className="message-image-container">
                    <img
                      src={msg.image}
                      alt="User Upload"
                      className="message-image"
                    />
                  </div>
                )}

                {/* Hasil deteksi AI jika dikirim oleh bot */}
                {msg.verdict && (
                  <div className="ai-detection-panel">
                    <div className="detection-header">
                      <span className="panel-title">Hasil Verifikasi AI</span>
                      <span className={getVerdictClass(msg.verdict)}>
                        {msg.verdict}
                      </span>
                    </div>

                    <div className="probability-section">
                      <div className="probability-info">
                        <span>Probabilitas AI</span>
                        <span
                          style={{
                            color: getProgressBarColor(msg.aiProbability),
                            fontWeight: "bold",
                          }}
                        >
                          {msg.aiProbability}%
                        </span>
                      </div>
                      <div className="probability-bar-container">
                        <div
                          className="probability-bar"
                          style={{
                            width: `${msg.aiProbability}%`,
                            backgroundColor: getProgressBarColor(
                              msg.aiProbability,
                            ),
                            boxShadow: `0 0 10px ${getProgressBarColor(msg.aiProbability)}`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Tampilkan anomali jika ada */}
                    {msg.anomalies && msg.anomalies.length > 0 && (
                      <div className="anomalies-section">
                        <span className="section-title">Anomali Visual:</span>
                        <ul className="anomalies-list">
                          {msg.anomalies.map((anomaly, idx) => (
                            <li key={idx}>{anomaly}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Tampilkan EXIF metadata jika ada */}
                    {msg.metadata &&
                      (msg.metadata.make ||
                        msg.metadata.model ||
                        msg.metadata.software) && (
                        <div className="metadata-section">
                          <span className="section-title">
                            Metadata EXIF Gambar:
                          </span>
                          <div className="metadata-grid">
                            {msg.metadata.make && (
                              <div className="metadata-item">
                                <span className="meta-key">Kamera</span>
                                <span className="meta-val">
                                  {msg.metadata.make}
                                </span>
                              </div>
                            )}
                            {msg.metadata.model && (
                              <div className="metadata-item">
                                <span className="meta-key">Model</span>
                                <span className="meta-val">
                                  {msg.metadata.model}
                                </span>
                              </div>
                            )}
                            {msg.metadata.software && (
                              <div className="metadata-item">
                                <span className="meta-key">Software</span>
                                <span className="meta-val">
                                  {msg.metadata.software}
                                </span>
                              </div>
                            )}
                            {msg.metadata.dateTime && (
                              <div className="metadata-item">
                                <span className="meta-key">Tanggal</span>
                                <span className="meta-val">
                                  {new Date(
                                    msg.metadata.dateTime,
                                  ).toLocaleDateString("id-ID", {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                  })}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                  </div>
                )}

                <div className="markdown-content">
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="message message-bot">
              <div className="message-avatar">
                <img src={gundamLogo} alt="ZETA" className="avatar-img" />
              </div>
              <div className="message-content">
                <span className="bot-label">ZETA</span>
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <p
                  style={{
                    margin: "5px 0 0 0",
                    fontSize: "13px",
                    opacity: 0.8,
                  }}
                >
                  Menganalisis gambar dan mendeteksi anomali AI...
                </p>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input-form-container">
          {/* Pratinjau Gambar sebelum dikirim */}
          {previewUrl && (
            <div className="image-preview-bar">
              <div className="preview-container">
                <img src={previewUrl} alt="Preview" className="preview-image" />
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="remove-preview-btn"
                  title="Batalkan Gambar"
                >
                  ✕
                </button>
              </div>
              <span className="preview-label">
                Gambar siap dianalisis keasliannya
              </span>
            </div>
          )}

          <form onSubmit={handleSendMessage} className="chat-input-form">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="attach-button"
              disabled={isLoading}
              title="Pilih Gambar"
            >
              📷
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              style={{ display: "none" }}
            />

            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={
                selectedFile
                  ? "Tambahkan catatan instruksi atau tekan Kirim..."
                  : "Tulis pesan atau seret gambar ke sini..."
              }
              disabled={isLoading}
              className="chat-input"
            />
            <button
              type="submit"
              disabled={isLoading || (!inputValue.trim() && !selectedFile)}
              className="send-button"
            >
              {isLoading ? "Menganalisis..." : "Kirim"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Detect;
