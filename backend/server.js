const express = require("express");
const cors = require("cors");
const multer = require("multer");
const mongoose = require("mongoose");
const fs = require("fs");
const { AssemblyAI } = require("assemblyai");
require("dotenv").config();

const app = express();

app.use(cors({
  origin: "http://localhost:5173",
  methods: ["GET", "POST"],
}));
app.use(express.json());

// ── AssemblyAI Client ─────────────────────────────────────
const client = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY,
});

// ── Multer Setup ──────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

// ── MongoDB Connect ───────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log(err));

const PORT = 3000;

// ── Home Route ────────────────────────────────────────────
app.get("/", (req, res) => {
  res.send("Backend is running");
});

// ── Upload Route ──────────────────────────────────────────
app.post("/upload", upload.single("audio"), (req, res) => {
  res.json({
    message: "File uploaded successfully",
    file: req.file,
  });
});

// ── Transcribe Route ──────────────────────────────────────
app.post("/transcribe", upload.single("audio"), async (req, res) => {
  try {
    // Validate file
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No audio file received",
      });
    }

    const filePath = req.file.path;

    // ✅ AssemblyAI transcribe with speech_model
   const result = await client.transcripts.transcribe({
  audio: fs.createReadStream(filePath),
  speech_models: ["universal-2"],
  language_detection: true,
  punctuate: true,
  format_text: true,
});

    // Delete file after transcription
    fs.unlinkSync(filePath);

    // Check if transcript is empty
    if (!result.text || result.text.trim() === "") {
      return res.json({
        success: true,
        transcript: "",
        message: "No speech detected. Please speak clearly and try again.",
      });
    }

    res.json({
      success: true,
      transcript: result.text,
      language: result.language_code,
    });

  } catch (error) {
    console.error("Full error:", error);
    res.status(500).json({
      success: false,
      message: "Transcription failed",
      error: error.message,
    });
  }
});

// ── Server Start ──────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});