const RecordSection = ({ recording, loading, onStart, onStop }) => {
  return (
    <div>
      <p className="section-label">🎙️ Record Audio</p>

      {/* Recording Indicator */}
      {recording && (
        <div className="recording-indicator">
          <div className="recording-dot">
            <span className="ping"></span>
            <span className="dot"></span>
          </div>
          <span style={{ color: "#ef4444", fontWeight: "700", fontSize: "14px" }}>
            Recording... speak clearly
          </span>
        </div>
      )}

      {/* Start / Stop Button */}
      {!recording ? (
        <button onClick={onStart} disabled={loading} className="btn btn-red">
          <span style={{ width: "14px", height: "14px", background: "white", borderRadius: "50%" }}></span>
          Start Recording
        </button>
      ) : (
        <button onClick={onStop} className="btn btn-dark">
          <span style={{ width: "14px", height: "14px", background: "white", borderRadius: "3px" }}></span>
          Stop Recording
        </button>
      )}
    </div>
  );
};

export default RecordSection;