import { useState, useRef, useEffect } from "react";
import axios from "axios";
import "../App.css";
import UploadSection from "./UploadSection";
import RecordSection from "./RecordSection";
import HistorySection from "./HistorySection";

const Recorder = () => {
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [language, setLanguage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [audioFile, setAudioFile] = useState(null);
  const [audioURL, setAudioURL] = useState(null);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  useEffect(() => { fetchHistory(); }, []);

  // ── History Fetch ─────────────────────────────────────────
  const fetchHistory = async () => {
    try {
      setHistoryLoading(true);
      const response = await axios.get("http://localhost:3000/history");
      setHistory(response.data.transcripts);
    } catch (err) {
      console.log(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // ── Delete Transcript ─────────────────────────────────────
  const deleteTranscript = async (id) => {
    try {
      await axios.delete(`http://localhost:3000/history/${id}`);
      setHistory(history.filter((t) => t._id !== id));
    } catch (err) {
      console.log(err);
    }
  };

  // ── Send Audio ────────────────────────────────────────────
  const sendAudio = async (file) => {
    const formData = new FormData();
    formData.append("audio", file);
    try {
      setLoading(true);
      setError("");
      setTranscript("");
      setLanguage("");
      const response = await axios.post("http://localhost:3000/transcribe", formData);
      if (!response.data.transcript) {
        setError("No speech detected. Please speak clearly and try again.");
      } else {
        setTranscript(response.data.transcript);
        setLanguage(response.data.language || "");
        fetchHistory();
      }
    } catch (err) {
      setError("Transcription failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── File Upload ───────────────────────────────────────────
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAudioFile(file);
    setAudioURL(URL.createObjectURL(file));
    setTranscript("");
    setError("");
    setLanguage("");
    setCopied(false);
  };

  const handleFileSubmit = async () => {
    if (!audioFile) { setError("Please select an audio file first."); return; }
    await sendAudio(audioFile);
  };

  // ── Start Recording ───────────────────────────────────────
  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Browser does not support microphone. Please use Chrome.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus" : "audio/webm";
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const file = new File([audioBlob], "recording.webm", { type: mimeType });
        setAudioURL(URL.createObjectURL(audioBlob));
        await sendAudio(file);
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start();
      setRecording(true);
      setTranscript("");
      setError("");
      setLanguage("");
      setCopied(false);
      setAudioURL(null);
    } catch (err) {
      setError("Microphone access denied. Please allow microphone permissions.");
    }
  };

  // ── Stop Recording ────────────────────────────────────────
  const stopRecording = () => {
    mediaRecorderRef.current.stop();
    setRecording(false);
  };

  // ── Copy Transcript ───────────────────────────────────────
  const copyTranscript = () => {
    navigator.clipboard.writeText(transcript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Clear All ─────────────────────────────────────────────
  const clearAll = () => {
    setTranscript(""); setError(""); setAudioFile(null);
    setAudioURL(null); setLanguage(""); setCopied(false);
  };

  // ── UI ────────────────────────────────────────────────────
  return (
    <div className="container">
      <div className="wrapper">

        {/* Header */}
        <div className="header">
          <div className="header-icon">🎙️</div>
          <h1>Speech to Text</h1>
          <p>Upload or record audio — get instant transcriptions</p>
        </div>

        {/* Main Card */}
        <div className="card">

          {/* Upload Section */}
          {/* Upload Section */}
<UploadSection
  audioFile={audioFile}
  audioURL={audioURL}
  loading={loading}
  recording={recording}
  onFileUpload={handleFileUpload}
  onFileSubmit={handleFileSubmit}
  onError={setError}  // ✅ Error setter pass karo
/>

          {/* Divider */}
          <div className="divider">
            <hr /><span>or</span><hr />
          </div>

          {/* Record Section */}
          <RecordSection
            recording={recording}
            loading={loading}
            onStart={startRecording}
            onStop={stopRecording}
          />

          {/* Loading */}
          {loading && (
            <div className="loading-box">
              <div className="spinner"></div>
              Generating transcript, please wait...
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="error-box">
              <span>⚠️</span> {error}
            </div>
          )}

          {/* Transcript */}
          {transcript && (
            <div className="transcript-box">
              <div className="transcript-header">
                <div className="transcript-title">
                  <span className="dot"></span>
                  Transcript Ready
                </div>
                <div className="transcript-actions">
                  {language && (
                    <span className="badge badge-indigo">
                      🌐 {language.toUpperCase()}
                    </span>
                  )}
                  <button onClick={copyTranscript} className="btn-sm btn-copy">
                    {copied ? "✅ Copied!" : "📋 Copy"}
                  </button>
                  <button onClick={clearAll} className="btn-sm btn-clear">
                    Clear
                  </button>
                </div>
              </div>
              <p className="transcript-text">{transcript}</p>
            </div>
          )}
        </div>

        {/* History Section */}
        <HistorySection
          history={history}
          historyLoading={historyLoading}
          onDelete={deleteTranscript}
        />

        {/* Footer */}
        <p className="footer">Built with ❤️ using React + Node.js + AssemblyAI</p>

      </div>
    </div>
  );
};

export default Recorder;