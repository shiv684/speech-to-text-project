import { useState, useRef } from "react";
import axios from "axios";

const Recorder = () => {
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [language, setLanguage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [audioFile, setAudioFile] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // ── Send Audio to Backend ────────────────────────────────
  const sendAudio = async (file) => {
    const formData = new FormData();
    formData.append("audio", file);

    try {
      setLoading(true);
      setError("");
      setTranscript("");

      const response = await axios.post(
        "http://localhost:3000/transcribe",
        formData
      );

      if (!response.data.transcript) {
        setError("No speech detected. Please speak clearly and try again.");
      } else {
        setTranscript(response.data.transcript);
        setLanguage(response.data.language || "");
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
    setTranscript("");
    setError("");
    setLanguage("");
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
      setError("Your browser does not support microphone access. Please use Chrome.");
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
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const file = new File([audioBlob], "recording.webm", { type: mimeType });
        await sendAudio(file);

        // Stop microphone
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setRecording(true);
      setTranscript("");
      setError("");
      setLanguage("");

    } catch (err) {
      console.log("Microphone error:", err);
      setError("Microphone access denied. Please allow microphone permissions.");
    }
  };

  // ── Recording Stop ───────────────────────────────────────
  const stopRecording = () => {
    mediaRecorderRef.current.stop();
    setRecording(false);
  };

  // ── UI ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-lg">

        {/* Heading */}
        <h1 className="text-3xl font-bold text-center text-blue-600 mb-8">
          🎙️ Speech to Text
        </h1>

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
              {language && (
                <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full">
                  🌐 {language.toUpperCase()}
                </span>
              )}
            </div>
            <p className="text-gray-800 leading-relaxed">{transcript}</p>
          </div>
        )}

      </div>
    </div>
  );
};

export default Recorder;