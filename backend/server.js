const express = require("express");
const cors = require("cors");
const multer = require("multer");
const mongoose = require("mongoose");
const fs = require("fs");
const https = require("https");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

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
  res.send("backend is running");
});

// ── Upload Route ──────────────────────────────────────────
app.post("/upload", upload.single("audio"), (req, res) => {
  res.json({
    message: "upload successfully",
    file: req.file,
  });
});

// ── Transcribe Route (SDK nahi, direct API call) ──────────
app.post("/transcribe", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "file not found",
      });
    }

    const audioData = fs.readFileSync(req.file.path);

    // Deepgram ko direct fetch se call karo
    const fetch = (await import("node-fetch")).default;

    // ✅ Ye use karo — auto detect karega Hindi ya English

const response = await fetch(
  "https://api.deepgram.com/v1/listen?model=whisper-large&detect_language=true&punctuate=true",
  {
    method: "POST",
    headers: {
      Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`,
      "Content-Type": req.file.mimetype,
    },
    body: audioData,
  }
);

    const data = await response.json();

    // transcript nikalo
    const transcript =
    // console.log("Deepgram Response:", JSON.stringify(data, null, 2));
      data.results.channels[0].alternatives[0].transcript;

    // file delete karo
    fs.unlinkSync(req.file.path);

    res.json({ success: true, transcript });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Transcription fail ho gayi",
    });
  }
});

// ── Server Start ──────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});