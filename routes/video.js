const express = require("express");
const router = express.Router();
const multer = require("multer");
const ffmpeg = require("fluent-ffmpeg");
const File = require("../models/File");

const path = require("path");
const fs = require("fs");

if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + ext);
  },
});

// const upload = multer({ storage });
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  //   fileFilter: (req, file, cb) => {
  //     if (file.mimetype !== "video/mp4") {
  //       return cb(new Error("Only MP4 allowed"), false);
  //     }
  //     cb(null, true);
  //   },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();

    if (file.mimetype === "video/mp4" && ext === ".mp4") {
      cb(null, true);
    } else {
      cb(new Error("Only MP4 files allowed"), false);
    }
  },
});

// Route upload
router.post("/upload", upload.single("video"), async (req, res) => {
  try {
    const file = new File({
      originalName: req.file.originalname,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
      status: "uploaded",
    });
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "File upload failed" });
    }
    await file.save();
    return res
      .status(201)
      .json({ success: true, fileId: file._id, file: file });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
