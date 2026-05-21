import React from "react";
import gundamLogo from "../img/gundam.jpg";
import "../styles/PageStyles.css";

const About = () => {
  return (
    <div className="page-container animate-fade-in">
      <h1 className="page-title">About ZETA AI</h1>

      <div className="about-layout">
        <div className="about-image-container">
          <img src={gundamLogo} alt="ZETA Gundam" className="about-image" />
        </div>

        <div className="about-card card">
          <h3>AI Image Detector & Chatbot</h3>
          <p className="about-text">
            Aplikasi ini dirancang untuk mendeteksi apakah sebuah gambar
            dihasilkan oleh kecerdasan buatan (AI) atau merupakan foto asli.
            Dilengkapi dengan asisten virtual bernama <strong>ZETA</strong> yang
            dapat membantu menjelaskan hasil deteksi secara detail, menganalisis
            keganjilan visual, membaca metadata EXIF, dan menjawab pertanyaan
            Anda secara interaktif.
          </p>
          <div className="about-features-list">
            <div className="about-feature-item">
              <span className="feature-dot"></span>
              <span>Model Analisis Gambar Llama 3.2 Vision & Gemini API</span>
            </div>
            <div className="about-feature-item">
              <span className="feature-dot"></span>
              <span>Analisis Metadata EXIF Terintegrasi</span>
            </div>
            <div className="about-feature-item">
              <span className="feature-dot"></span>
              <span>Memory Sesi Obrolan dengan MongoDB Atlas</span>
            </div>
          </div>
        </div>
      </div>

      <footer className="app-footer">
        <p>© 2026 ZETA AI. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default About;
