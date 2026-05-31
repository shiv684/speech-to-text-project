const express = require("express");
const cors = require("cors");
const multer = require("multer");
const mongoose = require("mongoose");
const fs = require("fs");
const { AssemblyAI } = require("assemblyai");
const Transcript = require("./models/Transcript");
require("dotenv").config();

const app = express();

app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:5174"],
  methods: ["GET", "POST", "DELETE"],
}));
app.use(express.json());

// ── AssemblyAI Client ─────────────────────────────────────
const client = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY,
});

// ── Multer — File Type + Size Validation ──────────────────
const allowedMimeTypes = [
  "audio/mpeg",       // mp3
  "audio/mp3",        // mp3
  "audio/wav",        // wav
  "audio/wave",       // wav
  "audio/webm",       // webm
  "audio/ogg",        // ogg
  "audio/mp4",        // m4a
  "audio/x-m4a",      // m4a
  "audio/flac",       // flac
];

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

// ✅ File type validation
const fileFilter = (req, file, cb) => {
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true); // file allow karo
  } else {
    cb(new Error("INVALID_FILE_TYPE"), false); // reject karo
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024, // ✅ 25MB max size
  },
});

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
app.post("/transcribe", (req, res, next) => {
  upload.single("audio")(req, res, (err) => {

    // ✅ Multer errors handle karo
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          message: "File too large. Maximum size allowed is 25MB.",
        });
      }
      if (err.message === "INVALID_FILE_TYPE") {
        return res.status(400).json({
          success: false,
          message: "Invalid file type. Please upload MP3, WAV, WEBM, OGG, or M4A.",
        });
      }
      return res.status(400).json({
        success: false,
        message: "File upload failed. Please try again.",
      });
    }

    // ✅ File exist check
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No audio file received. Please select a file.",
      });
    }

    // ✅ File size 0 check
    if (req.file.size === 0) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: "Audio file is empty. Please record or upload a valid file.",
      });
    }

    next();
  });
}, async (req, res) => {
  try {
    const filePath = req.file.path;

    // AssemblyAI transcribe
    const result = await client.transcripts.transcribe({
      audio: fs.createReadStream(filePath),
      speech_models: ["universal-2"],
      language_detection: true,
      punctuate: true,
      format_text: true,
    });

    // File delete karo
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Empty transcript check
    if (!result.text || result.text.trim() === "") {
      return res.json({
        success: true,
        transcript: "",
        message: "No speech detected. Please speak clearly and try again.",
      });
    }

    // MongoDB mein save karo
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
    console.error("Transcription error:", error);

    // File cleanup
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    // ✅ Specific error messages
    if (error.message?.includes("network") || error.code === "ECONNREFUSED") {
      return res.status(503).json({
        success: false,
        message: "Network error. Please check your internet connection.",
      });
    }

    if (error.message?.includes("auth") || error.message?.includes("API")) {
      return res.status(401).json({
        success: false,
        message: "API authentication failed. Please check your API key.",
      });
    }

    res.status(500).json({
      success: false,
      message: "Transcription failed. Please try again.",
    });
  }
});

// ── History Route ─────────────────────────────────────────
app.get("/history", async (req, res) => {
  try {
    const transcripts = await Transcript.find()
      .sort({ createdAt: -1 })
      .limit(20);
    res.json({ success: true, transcripts });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch history. Please try again.",
    });
  }
});

// ── Delete Route ──────────────────────────────────────────
app.delete("/history/:id", async (req, res) => {
  try {
    // ✅ Valid ID check
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid transcript ID.",
      });
    }

    const deleted = await Transcript.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Transcript not found.",
      });
    }

    res.json({ success: true, message: "Deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to delete. Please try again.",
    });
  }
});

// ── Global Error Handler ──────────────────────────────────
app.use((err, req, res, next) => {
  console.error("Global error:", err);
  res.status(500).json({
    success: false,
    message: "Something went wrong. Please try again.",
  });
});

// ── Server Start ──────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});