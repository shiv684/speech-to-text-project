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
  },
  {
    timestamps: true, // createdAt aur updatedAt automatically add hoga
  }
);

module.exports = mongoose.model("Transcript", transcriptSchema);