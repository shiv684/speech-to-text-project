const express = require("express");
const cors = require("cors");
const multer = require("multer");
const mongoose = require("mongoose");
const fs = require("fs");
const { AssemblyAI } = require("assemblyai");
const Transcript = require("./models/Transcript"); // ✅ Model import
require("dotenv").config();

const app = express();

app.use(cors({
  origin: "http://localhost:5173",
  methods: ["GET", "POST", "DELETE"],
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

// ── Transcribe Route ──────────────────────────────────────
app.post("/transcribe", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No audio file received",
      });
    }

    const filePath = req.file.path;

    // AssemblyAI se transcript lo
    const result = await client.transcripts.transcribe({
      audio: fs.createReadStream(filePath),
      speech_models: ["universal-2"],
      language_detection: true,
      punctuate: true,
      format_text: true,
    });

    // File delete karo
    fs.unlinkSync(filePath);

    if (!result.text || result.text.trim() === "") {
      return res.json({
        success: true,
        transcript: "",
        message: "No speech detected. Please speak clearly.",
      });
    }

    // ✅ MongoDB mein save karo
    const saved = await Transcript.create({
      text: result.text,
      language: result.language_code || "unknown",
    });

    res.json({
      success: true,
      transcript: result.text,
      language: result.language_code,
      id: saved._id,
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

// ── History Route — Sab transcripts lo ───────────────────
app.get("/history", async (req, res) => {
  try {
    const transcripts = await Transcript.find()
      .sort({ createdAt: -1 }) // newest pehle
      .limit(20);              // sirf 20 dikhao

    res.json({ success: true, transcripts });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to fetch history" });
  }
});

// ── Delete Route — Ek transcript delete karo ─────────────
app.delete("/history/:id", async (req, res) => {
  try {
    await Transcript.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to delete" });
  }
});

// ── Server Start ──────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});