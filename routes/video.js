const express = require('express');
const router = express.Router();
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const File = require('../models/File');

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// Route upload
router.post('/upload', upload.single('video'), async (req, res) => {
  const file = new File({
    originalName: req.file.filename,
    status: 'uploaded'
  });
  await file.save();
  res.json({ success: true, fileId: file._id, filename: req.file.filename });
});

module.exports = router;

