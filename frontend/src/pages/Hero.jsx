import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import '../styles/Hero.css';

const Hero = () => {
  const navigate = useNavigate();
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    // Generate 45 random particles distributed vertically via negative animation delay
    const generatedParticles = Array.from({ length: 45 }).map((_, i) => ({
      id: i,
      size: Math.random() * 3.5 + 1.5, // 1.5px to 5.0px
      left: Math.random() * 100, // horizontal start position percentage
      delay: Math.random() * -35, // negative delay so they start immediately at different points of the animation
      duration: Math.random() * 20 + 15, // speed: 15s to 35s
      opacity: Math.random() * 0.45 + 0.2, // alpha transparency
      wobble: Math.random() * 60 - 30 // horizontal wobble amplitude
    }));
    setParticles(generatedParticles);
  }, []);

  return (
    <div className="hero-container">
      <div className="hero-background">
        <div className="glow-circle top-left"></div>
        <div className="glow-circle bottom-right"></div>
        {particles.map((p) => (
          <div
            key={p.id}
            className="particle"
            style={{
              width: `${p.size}px`,
              height: `${p.size}px`,
              left: `${p.left}%`,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
              opacity: p.opacity,
              '--wobble-x': `${p.wobble}px`
            }}
          />
        ))}
      </div>

      <div className="hero-content animate-fade-in">
        <h1 className="hero-title">
          ZETA - Chatbot <span className="text-cyan">Deteksi GAMBAR AI</span>
        </h1>
        <p className="hero-subtitle">
          Platform pintar untuk mendeteksi gambar hasil AI dan berinteraksi dengan asisten virtual.
        </p>
        <div className="hero-actions">
          <Button onClick={() => navigate('/login')}>
            Masuk
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Hero;
