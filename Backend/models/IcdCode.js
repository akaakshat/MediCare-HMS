const mongoose = require('mongoose');

const IcdCodeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, trim: true },
  description: { type: String, required: true, trim: true },
  chapter: { type: String, trim: true },
  category: { type: String, trim: true },
  active: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('IcdCode', IcdCodeSchema);
