import { useState, useRef, useEffect } from "react";
import axios from "axios";

const Recorder = () => {
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [language, setLanguage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [audioFile, setAudioFile] = useState(null);
  const [audioURL, setAudioURL] = useState(null);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState([]);        // ✅ History
  const [historyLoading, setHistoryLoading] = useState(false); // ✅ History loading

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // ── History Fetch — Page load hone pe ───────────────────
  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setHistoryLoading(true);
      const response = await axios.get("http://localhost:3000/history");
      setHistory(response.data.transcripts);
    } catch (err) {
      console.log("History fetch error:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // ── Delete Transcript ────────────────────────────────────
  const deleteTranscript = async (id) => {
    try {
      await axios.delete(`http://localhost:3000/history/${id}`);
      setHistory(history.filter((t) => t._id !== id)); // UI se bhi hatao
    } catch (err) {
      console.log("Delete error:", err);
    }
  };

  // ── Send Audio to Backend ────────────────────────────────
  const sendAudio = async (file) => {
    const formData = new FormData();
    formData.append("audio", file);

    try {
      setLoading(true);
      setError("");
      setTranscript("");
      setLanguage("");

      const response = await axios.post(
        "http://localhost:3000/transcribe",
        formData
      );

      if (!response.data.transcript) {
        setError("No speech detected. Please speak clearly and try again.");
      } else {
        setTranscript(response.data.transcript);
        setLanguage(response.data.language || "");
        fetchHistory(); // ✅ Naya transcript save hone ke baad history refresh karo
      }
    } catch (err) {
      console.log("Error:", err.response?.data || err.message);
      setError("Transcription failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── File Upload Handler ──────────────────────────────────
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

  // ── File Submit ──────────────────────────────────────────
  const handleFileSubmit = async () => {
    if (!audioFile) {
      setError("Please select an audio file first.");
      return;
    }
    await sendAudio(audioFile);
  };

  // ── Recording Start ──────────────────────────────────────
  const startRecording = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("Your browser does not support microphone. Please use Chrome.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

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
        stream.getTracks().forEach((track) => track.stop());
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

  // ── Recording Stop ───────────────────────────────────────
  const stopRecording = () => {
    mediaRecorderRef.current.stop();
    setRecording(false);
  };

  // ── Copy Transcript ──────────────────────────────────────
  const copyTranscript = () => {
    navigator.clipboard.writeText(transcript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Clear All ────────────────────────────────────────────
  const clearAll = () => {
    setTranscript("");
    setError("");
    setAudioFile(null);
    setAudioURL(null);
    setLanguage("");
    setCopied(false);
  };

  // ── Date Format karo ─────────────────────────────────────
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ── UI ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-2xl mx-auto">

        {/* Main Card */}
        <div className="bg-white p-8 rounded-2xl shadow-lg mb-6">

          {/* Heading */}
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-blue-600">
              🎙️ Speech to Text
            </h1>
            {(transcript || audioURL || error) && (
              <button
                onClick={clearAll}
                className="text-sm text-gray-400 hover:text-red-500 transition-all"
              >
                🗑️ Clear
              </button>
            )}
          </div>

          {/* File Upload */}
          <div className="mb-6">
            <p className="text-gray-600 font-semibold mb-2">
              📁 Upload Audio File:
            </p>
            <input
              type="file"
              accept="audio/*"
              onChange={handleFileUpload}
              className="w-full border border-gray-300 rounded-lg p-2 text-sm"
            />
            {audioURL && !recording && (
              <div className="mt-3 bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">🔊 Audio Preview:</p>
                <audio controls src={audioURL} className="w-full" />
              </div>
            )}
            <button
              onClick={handleFileSubmit}
              disabled={loading || !audioFile}
              className="mt-3 w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 rounded-lg disabled:opacity-50 transition-all"
            >
              {loading ? "Transcribing..." : "Transcribe"}
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center my-4">
            <hr className="flex-grow border-gray-300" />
            <span className="mx-3 text-gray-400 font-semibold">OR</span>
            <hr className="flex-grow border-gray-300" />
          </div>

          {/* Record */}
          <div className="mb-6">
            <p className="text-gray-600 font-semibold mb-2">
              🎙️ Record Audio:
            </p>
            {recording && (
              <div className="flex items-center gap-2 mb-2 text-red-500 text-sm font-semibold">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
                Recording in progress...
              </div>
            )}
            {!recording ? (
              <button
                onClick={startRecording}
                disabled={loading}
                className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-2 rounded-lg disabled:opacity-50 transition-all"
              >
                🔴 Start Recording
              </button>
            ) : (
              <button
                onClick={stopRecording}
                className="w-full bg-gray-700 hover:bg-gray-800 text-white font-semibold py-2 rounded-lg animate-pulse"
              >
                ⏹️ Stop Recording
              </button>
            )}
          </div>

          {/* Loading */}
          {loading && (
            <div className="text-center text-blue-500 font-semibold my-4 animate-pulse">
              ⏳ Generating transcript, please wait...
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-100 text-red-600 p-3 rounded-lg my-4">
              ❌ {error}
            </div>
          )}

          {/* Transcript */}
          {transcript && (
            <div className="bg-green-50 border border-green-300 p-4 rounded-lg mt-4">
              <div className="flex justify-between items-center mb-2">
                <p className="text-green-700 font-semibold">✅ Transcript:</p>
                <div className="flex items-center gap-2">
                  {language && (
                    <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full">
                      🌐 {language.toUpperCase()}
                    </span>
                  )}
                  <button
                    onClick={copyTranscript}
                    className="text-xs bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1 rounded-full transition-all"
                  >
                    {copied ? "✅ Copied!" : "📋 Copy"}
                  </button>
                </div>
              </div>
              <p className="text-gray-800 leading-relaxed">{transcript}</p>
            </div>
          )}
        </div>

        {/* ✅ History Section */}
        <div className="bg-white p-6 rounded-2xl shadow-lg">
          <h2 className="text-xl font-bold text-gray-700 mb-4">
            📋 Transcript History
          </h2>

          {/* History Loading */}
          {historyLoading && (
            <p className="text-center text-blue-400 animate-pulse">
              Loading history...
            </p>
          )}

          {/* No History */}
          {!historyLoading && history.length === 0 && (
            <p className="text-center text-gray-400">
              No transcripts yet. Record or upload audio to get started!
            </p>
          )}

          {/* History List */}
          <div className="space-y-3">
            {history.map((item) => (
              <div
                key={item._id}
                className="border border-gray-200 rounded-xl p-4 hover:bg-gray-50 transition-all"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    {/* Language badge */}
                    {item.language && item.language !== "unknown" && (
                      <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full">
                        🌐 {item.language.toUpperCase()}
                      </span>
                    )}
                    {/* Date */}
                    <span className="text-xs text-gray-400">
                      🕐 {formatDate(item.createdAt)}
                    </span>
                  </div>
                  {/* Delete Button */}
                  <button
                    onClick={() => deleteTranscript(item._id)}
                    className="text-gray-300 hover:text-red-500 transition-all text-sm"
                  >
                    🗑️
                  </button>
                </div>
                {/* Transcript text */}
                <p className="text-gray-700 text-sm leading-relaxed">
                  {item.text.length > 150
                    ? item.text.substring(0, 150) + "..."
                    : item.text}
                </p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Recorder;