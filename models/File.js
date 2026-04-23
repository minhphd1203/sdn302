const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  originalName: String,
  outputName: String,
  type: String,        // 'mp3', 'compress', 'thumbnail'
  status: String,      // 'uploaded', 'done', 'error'
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('File', fileSchema);