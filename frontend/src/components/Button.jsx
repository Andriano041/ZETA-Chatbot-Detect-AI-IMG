import React from 'react';
import '../styles/Button.css';

const Button = ({ children, onClick, type = 'primary', className = '' }) => {
  return (
    <button
      className={`custom-button ${type} ${className}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
};

export default Button;
