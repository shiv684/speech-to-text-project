const HistorySection = ({ history, historyLoading, onDelete }) => {

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  };

  return (
    <div className="card">
      <div className="history-header">
        <div>
          <h2>📋 Transcript History</h2>
          <p>Your last 20 transcriptions</p>
        </div>
        <span className="count-badge">{history.length} total</span>
      </div>

      {/* Loading */}
      {historyLoading && (
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <div className="spinner" style={{ margin: "0 auto" }}></div>
          <p style={{ color: "#9ca3af", marginTop: "12px", fontSize: "14px" }}>Loading...</p>
        </div>
      )}

      {/* Empty */}
      {!historyLoading && history.length === 0 && (
        <div className="history-empty">
          <p>🎙️</p>
          <p className="title">No transcripts yet</p>
          <p className="subtitle">Record or upload audio to get started</p>
        </div>
      )}

      {/* Cards */}
      <div className="history-list">
        {history.map((item) => (
          <div key={item._id} className="history-card">
            <div className="history-card-header">
              <div className="history-meta">
                {item.language && item.language !== "unknown" && (
                  <span className="badge badge-indigo">
                    🌐 {item.language.toUpperCase()}
                  </span>
                )}
                <span className="date-text">🕐 {formatDate(item.createdAt)}</span>
              </div>
              <button onClick={() => onDelete(item._id)} className="delete-btn">
                🗑️
              </button>
            </div>
            <p className="history-text">
              {item.text.length > 150
                ? item.text.substring(0, 150) + "..."
                : item.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HistorySection;