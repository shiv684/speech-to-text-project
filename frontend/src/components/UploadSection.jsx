const UploadSection = ({ audioFile, audioURL, loading, recording, onFileUpload, onFileSubmit }) => {
  return (
    <div>
      <p className="section-label">📁 Upload Audio File</p>

      <label className="upload-box">
        <span style={{ fontSize: "28px" }}>⬆️</span>
        <span>{audioFile ? audioFile.name : "Click to choose audio file"}</span>
        <small>MP3, WAV, WEBM supported</small>
        <input
          type="file"
          accept="audio/*"
          onChange={onFileUpload}
          style={{ display: "none" }}
        />
      </label>

      {/* Audio Preview */}
      {audioURL && !recording && (
        <div className="audio-preview">
          <p>🔊 Preview</p>
          <audio controls src={audioURL} />
        </div>
      )}

      {/* Transcribe Button */}
      <button
        onClick={onFileSubmit}
        disabled={loading || !audioFile}
        className="btn btn-indigo"
      >
        {loading ? (
          <><div className="spinner"></div> Transcribing...</>
        ) : "🚀 Transcribe File"}
      </button>
    </div>
  );
};

export default UploadSection;