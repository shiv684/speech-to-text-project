const express = require("express");
const cors = require("cors");
const multer = require("multer");
const mongoose = require("mongoose");
const fs = require("fs");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { AssemblyAI } = require("assemblyai");
const Transcript = require("./models/Transcript");
const User = require("./models/User");
const authMiddleware = require("./middleware/auth");
require("dotenv").config();

const app = express();

app.use(cors({
  origin: [
    "http://localhost:5173",
    "http://localhost:5174",
    "https://shiny-fudge-1a802e.netlify.app", // ✅ Add karo
  ],
  methods: ["GET", "POST", "DELETE"],
}));
app.use(express.json());

// ── AssemblyAI Client ─────────────────────────────────────
const client = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY,
});

// ── Multer Setup ──────────────────────────────────────────
const allowedMimeTypes = [
  "audio/mpeg", "audio/mp3", "audio/wav", "audio/wave",
  "audio/webm", "audio/ogg", "audio/mp4", "audio/x-m4a", "audio/flac",
];

const storage = multer.diskStorage({
  destination: (req, file, cb) => { cb(null, "uploads/"); },
  filename: (req, file, cb) => { cb(null, Date.now() + "-" + file.originalname); },
});

const fileFilter = (req, file, cb) => {
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("INVALID_FILE_TYPE"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 25 * 1024 * 1024 },
});
// ── uploads folder banao agar exist nahi karta ────────────
const path = require("path");
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// ── MongoDB Connect ───────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log(err));

const PORT = process.env.PORT || 3000;

// ── Home Route ────────────────────────────────────────────
app.get("/", (req, res) => {
  res.send("Backend is running");
});

// ══════════════════════════════════════════════════════════
// AUTH ROUTES
// ══════════════════════════════════════════════════════════

// ── Register ──────────────────────────────────────────────
app.post("/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide name, email and password.",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters.",
      });
    }

    // Email already exists?
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already registered. Please login.",
      });
    }

    // Password encrypt karo
    const hashedPassword = await bcrypt.hash(password, 12);

    // User save karo
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    // JWT token banao
    const token = jwt.sign(
      { id: user._id, name: user.name, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      success: true,
      message: "Account created successfully!",
      token,
      user: { id: user._id, name: user.name, email: user.email },
    });

  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({
      success: false,
      message: "Registration failed. Please try again.",
    });
  }
});

// ── Login ─────────────────────────────────────────────────
app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and password.",
      });
    }

    // User dhundo
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Email not found. Please register first.",
      });
    }

    // Password check karo
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Incorrect password. Please try again.",
      });
    }

    // JWT token banao
    const token = jwt.sign(
      { id: user._id, name: user.name, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      message: "Login successful!",
      token,
      user: { id: user._id, name: user.name, email: user.email },
    });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Login failed. Please try again.",
    });
  }
});

// ── Get Current User ──────────────────────────────────────
app.get("/auth/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to get user info." });
  }
});

// ══════════════════════════════════════════════════════════
// TRANSCRIBE ROUTES
// ══════════════════════════════════════════════════════════

app.post("/transcribe", authMiddleware, (req, res, next) => {
  upload.single("audio")(req, res, (err) => {
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
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No audio file received.",
      });
    }
    if (req.file.size === 0) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: "Audio file is empty.",
      });
    }
    next();
  });
}, async (req, res) => {
  try {
    const filePath = req.file.path;

    const result = await client.transcripts.transcribe({
      audio: fs.createReadStream(filePath),
      speech_models: ["universal-2"],
      language_detection: true,
      punctuate: true,
      format_text: true,
    });

    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    if (!result.text || result.text.trim() === "") {
      return res.json({
        success: true,
        transcript: "",
        message: "No speech detected. Please speak clearly.",
      });
    }

    // ✅ User ke saath save karo
    const saved = await Transcript.create({
      text: result.text,
      language: result.language_code || "unknown",
      user: req.user.id,
    });

    res.json({
      success: true,
      transcript: result.text,
      language: result.language_code,
      id: saved._id,
    });

  } catch (error) {
    console.error("Transcription error:", error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      success: false,
      message: "Transcription failed. Please try again.",
    });
  }
});

// ── History — Sirf current user ki ───────────────────────
app.get("/history", authMiddleware, async (req, res) => {
  try {
    const transcripts = await Transcript.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .limit(20);
    res.json({ success: true, transcripts });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch history.",
    });
  }
});

// ── Delete ────────────────────────────────────────────────
app.delete("/history/:id", authMiddleware, async (req, res) => {
  try {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid transcript ID.",
      });
    }

    // ✅ Sirf apna transcript delete kar sakta hai
    const deleted = await Transcript.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Transcript not found.",
      });
    }

    res.json({ success: true, message: "Deleted successfully" });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete.",
    });
  }
});

// ── Server Start ──────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});