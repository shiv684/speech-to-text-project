// ✅ Allowed file types
const ALLOWED_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/wave",
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/x-m4a",
  "audio/flac",
];

const MAX_SIZE_MB = 25;

const UploadSection = ({ audioFile, audioURL, loading, recording, onFileUpload, onFileSubmit, onError }) => {

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // ✅ File type check
    if (!ALLOWED_TYPES.includes(file.type)) {
      onError("Invalid file type. Please upload MP3, WAV, WEBM, OGG, or M4A.");
      e.target.value = ""; // input clear karo
      return;
    }

    // ✅ File size check
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > MAX_SIZE_MB) {
      onError(`File too large. Maximum size is ${MAX_SIZE_MB}MB. Your file is ${fileSizeMB.toFixed(1)}MB.`);
      e.target.value = "";
      return;
    }

    // ✅ Empty file check
    if (file.size === 0) {
      onError("File is empty. Please select a valid audio file.");
      e.target.value = "";
      return;
    }

    onFileUpload(e); // sab theek hai toh parent ko bhejo
  };

  return (
    <div>
      <p className="section-label">📁 Upload Audio File</p>

      <label className="upload-box">
        <span style={{ fontSize: "28px" }}>⬆️</span>
        <span>{audioFile ? audioFile.name : "Click to choose audio file"}</span>
        <small>MP3, WAV, WEBM, OGG, M4A — Max 25MB</small>
        <input
          type="file"
          accept="audio/*"
          onChange={handleFileChange}
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