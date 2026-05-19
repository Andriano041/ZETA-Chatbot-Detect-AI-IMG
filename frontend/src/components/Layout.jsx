import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import '../styles/Layout.css';

const Layout = () => {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    // Generate 45 random particles distributed vertically via negative animation delay
    const generatedParticles = Array.from({ length: 45 }).map((_, i) => ({
      id: i,
      size: Math.random() * 3.5 + 1.5, // 1.5px to 5.0px
      left: Math.random() * 100, // horizontal start position percentage
      delay: Math.random() * -35, // negative delay so they start immediately at different points of the animation
      duration: Math.random() * 20 + 15, // speed: 15s to 35s
      opacity: Math.random() * 0.35 + 0.15, // slightly less opaque so it doesn't distract from content
      wobble: Math.random() * 60 - 30 // horizontal wobble amplitude
    }));
    setParticles(generatedParticles);
  }, []);

  return (
    <div className="layout-container">
      <div className="layout-background">
        <div className="layout-glow top-left"></div>
        <div className="layout-glow bottom-right"></div>
        {particles.map((p) => (
          <div
            key={p.id}
            className="layout-particle"
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
      <Navbar />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
