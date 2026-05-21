import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import gundamLogo from '../img/gundam.jpg';
import '../styles/Navbar.css';

const Navbar = () => {
  const navigate = useNavigate();
  const [userName, setUserName] = useState('Pengguna');

  useEffect(() => {
    const storedUser = localStorage.getItem('userZeta');
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        if (userData && userData.name) {
          setUserName(userData.name);
        }
      } catch (error) {
        console.error("Gagal mengambil data user dari localStorage:", error);
      }
    }
  }, []);

  const handleExit = () => {
    localStorage.removeItem("detect_chat_messages");
    localStorage.removeItem("detect_session_id");
    localStorage.removeItem("userZeta"); // 👈 Hapus sesi user saat logout
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src={gundamLogo} alt="ZETA Logo" className="navbar-logo" style={{ width: '36px', height: '36px', borderRadius: '50%', border: '1.5px solid var(--cyan-accent)', objectFit: 'cover', boxShadow: '0 0 10px rgba(0, 240, 255, 0.25)' }} />
          <span className="brand-text">ZETA<span className="text-cyan"> AI</span></span>
        </div>

        <div className="navbar-menu">
          <NavLink to="/app/home" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
            Home
          </NavLink>
          <NavLink to="/app/detect" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
            Detect AI
          </NavLink>
          <NavLink to="/app/history" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
            History
          </NavLink>
          <NavLink to="/app/about" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
            About
          </NavLink>
        </div>
        {/* Bagian Actions / Tombol */}
        <div className="navbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {/* 👇 Menampilkan Nama Pengguna di Sebelah Kiri Tombol Exit 👇 */}
          <span className="user-profile-name" style={{ color: '#fff', fontSize: '14px', fontWeight: '500' }}>
            Hai, <span className="text-cyan" style={{ color: 'var(--cyan-accent, #00f0ff)' }}>{userName}</span>
          </span>
          <button className="exit-btn" onClick={handleExit}>
            Exit
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
