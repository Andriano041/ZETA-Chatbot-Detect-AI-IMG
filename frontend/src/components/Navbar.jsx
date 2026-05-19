import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import gundamLogo from '../img/gundam.jpg';
import '../styles/Navbar.css';

const Navbar = () => {
  const navigate = useNavigate();

  const handleExit = () => {
    localStorage.removeItem("detect_chat_messages");
    localStorage.removeItem("detect_session_id");
    navigate('/');
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

        <div className="navbar-actions">
          <button className="exit-btn" onClick={handleExit}>
            Exit
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
