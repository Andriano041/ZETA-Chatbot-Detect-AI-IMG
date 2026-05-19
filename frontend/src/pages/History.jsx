import React, { useState, useEffect } from 'react';
import '../styles/PageStyles.css';

const History = () => {
  const [historyItems, setHistoryItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:5000";
        const response = await fetch(`${apiUrl}/history`);
        if (response.ok) {
          const data = await response.json();
          setHistoryItems(data);
        }
      } catch (error) {
        console.error("Gagal mengambil riwayat:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, []);

  const handleClearHistory = async () => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus seluruh riwayat deteksi?")) {
      return;
    }
    try {
      const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:5000";
      const response = await fetch(`${apiUrl}/clear-history`, {
        method: "POST"
      });
      if (response.ok) {
        setHistoryItems([]);
      }
    } catch (error) {
      console.error("Gagal membersihkan riwayat:", error);
    }
  };

  const formatDate = (isoString) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return isoString;
    }
  };

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <h1 className="page-title" style={{ margin: 0 }}>Detection History</h1>
        {historyItems.length > 0 && (
          <button
            onClick={handleClearHistory}
            className="exit-btn"
            style={{ fontSize: '0.875rem', padding: '6px 14px' }}
          >
            Hapus Riwayat
          </button>
        )}
      </div>
      <p className="page-description">
        Riwayat gambar yang telah Anda deteksi keasliannya sebelumnya.
      </p>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          Memuat riwayat...
        </div>
      ) : historyItems.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          Belum ada riwayat deteksi gambar.
        </div>
      ) : (
        <div className="history-list">
          {historyItems.map((item) => (
            <div key={item._id || item.id} className="history-item card" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt={item.filename}
                  style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border-light)' }}
                />
              ) : (
                <div className="history-img-placeholder" style={{ width: '80px', height: '80px', flexShrink: 0 }}></div>
              )}
              <div className="history-details" style={{ flex: 1 }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '1rem', color: 'var(--text-main)' }}>{item.filename}</h4>
                <p style={{ margin: '0 0 4px 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  Status: <span style={{
                    color: item.verdict.includes("AI") ? "#ff3838" : "var(--cyan-accent)",
                    fontWeight: 700
                  }}>{item.aiProbability}% AI ({item.verdict})</span>
                </p>
                <small style={{ color: 'var(--text-muted)' }}>Diunggah pada: {formatDate(item.createdAt || item.timestamp)}</small>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default History;
