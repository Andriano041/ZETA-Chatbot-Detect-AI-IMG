import React, { useEffect } from "react";
import "../styles/CustomModal.css";

const CustomModal = ({ isOpen, onClose, type = "success", title, message }) => {
  // Menutup otomatis menggunakan timer jika modal terbuka
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        onClose();
      }, 1000); // Otomatis menutup setelah 1 detik
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className={`modal-mini-box ${type}`}>
        <div className="modal-main-body">
          {/* Sisi Kiri: Ikon Dinamis */}
          <div className="modal-icon-wrapper">
            {type === "success" ? (
              <svg
                className="modal-icon"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            ) : (
              <svg
                className="modal-icon"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            )}
          </div>

          {/* Sisi Kanan: Kotak Khusus Pembungkus Tulisan */}

          <h4 className="modal-title">{title}</h4>
          <p className="modal-message">{message}</p>
        </div>

        {/* Garis Loading Animasi Tipis di Bagian Paling Bawah */}
        <div className="modal-progress-bar">
          <div className="modal-progress-fill"></div>
        </div>
      </div>
    </div>
  );
};

export default CustomModal;
