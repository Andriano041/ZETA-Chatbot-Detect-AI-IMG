import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/PageStyles.css';

const Home = () => {
  const navigate = useNavigate();
  const [historyCount, setHistoryCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchHistoryCount = async () => {
      try {
        const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:5000";
        const response = await fetch(`${apiUrl}/history`);
        if (response.ok) {
          const data = await response.json();
          setHistoryCount(data.length);
        }
      } catch (error) {
        console.error("Gagal mengambil data statistik:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchHistoryCount();
  }, []);

  return (
    <div className="page-container animate-fade-in">
      {/* 1. Hero Section (Bagian Atas) */}
      <div className="home-hero">
        <h1 className="home-hero-title">
          ZETA Deteksi Keaslian Gambar
        </h1>
        <p className="home-hero-subtitle">
          Periksa apakah gambar Anda asli, hasil rekayasa, atau dibuat oleh AI (Generative AI) menggunakan teknologi pemindaian tingkat lanjut.
        </p>
        <button className="cta-button" onClick={() => navigate('/app/detect')}>
          <span>Mulai Deteksi Sekarang</span>
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7"></path>
          </svg>
        </button>
      </div>

      {/* 2. Fitur Utama (3 Kartu di Bawah) */}
      <div className="card-grid">
        <div className="card clickable-card" onClick={() => navigate('/app/detect')}>
          <div className="card-icon">
            <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path>
            </svg>
          </div>
          <h3>Detect AI</h3>
          <p>Unggah gambar untuk dianalisis oleh AI kami.</p>
        </div>

        <div className="card clickable-card" onClick={() => navigate('/app/detect')}>
          <div className="card-icon">
            <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path>
            </svg>
          </div>
          <h3>Chatbot ZETA</h3>
          <p>Tanya asisten virtual tentang indikasi manipulasi gambar.</p>
        </div>

        <div className="card clickable-card" onClick={() => navigate('/app/history')}>
          <div className="card-icon">
            <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <h3>History</h3>
          <p>Lihat riwayat analisis gambar sebelumnya.</p>
        </div>
      </div>

      {/* 3. Section "Cara Kerja" (How It Works) */}
      <div className="how-it-works">
        <h2 className="section-title">Cara Kerja</h2>
        <div className="steps-grid">
          <div className="step-card">
            <div className="step-num">01</div>
            <div className="step-icon">
              <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path>
              </svg>
            </div>
            <h4>Langkah 1: Unggah Gambar</h4>
            <p>Masukkan gambar berformat JPG/PNG yang ingin Anda periksa ke panel deteksi.</p>
          </div>

          <div className="step-card">
            <div className="step-num">02</div>
            <div className="step-icon">
              <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"></path>
              </svg>
            </div>
            <h4>Langkah 2: Analisis Sistem</h4>
            <p>Model AI kami akan memindai struktur piksel, metadata EXIF, dan anomali khas rekayasa generator AI.</p>
          </div>

          <div className="step-card">
            <div className="step-num">03</div>
            <div className="step-icon">
              <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
              </svg>
            </div>
            <h4>Langkah 3: Lihat Hasil</h4>
            <p>Dapatkan laporan komprehensif berupa persentase probabilitas AI dan daftar anomali secara instan.</p>
          </div>
        </div>
      </div>

      {/* 4. Dashboard Statis Singkat (Quick Insights) */}
      <div className="insights-section">
        <div className="insight-item">
          <span className="insight-val">
            {isLoading ? "..." : `${historyCount} Gambar`}
          </span>
          <span className="insight-label">Total Gambar Diperiksa</span>
        </div>
        <div className="insight-item">
          <span className="insight-val" style={{ color: '#10B981' }}>Online</span>
          <span className="insight-label">Status Sistem</span>
        </div>
        <div className="insight-item">
          <span className="insight-val">100%</span>
          <span className="insight-label">Akurasi API</span>
        </div>
      </div>

      {/* 5. Footer */}
      <footer className="app-footer">
        <p>© 2026 ZETA AI. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Home;
