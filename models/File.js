const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  originalName: String,
  outputName: String,
  type: String,
  status: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('File', fileSchema);