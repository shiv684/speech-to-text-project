const mongoose = require("mongoose");

const transcriptSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true,
    },
    language: {
      type: String,
      default: "unknown",
    },
    // ✅ User reference add kiya
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Transcript", transcriptSchema);