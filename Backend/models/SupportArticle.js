const mongoose = require('mongoose');

const SupportArticleSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
  keywords: [{ type: String, trim: true }],
  roles: [{ type: String, trim: true, lowercase: true }],
  requiresFeatures: [{ type: String, trim: true, lowercase: true }],
  answer: { type: String, required: true },
  steps: [{ type: String, trim: true }],
  module: { type: String, default: 'dashboard' },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('SupportArticle', SupportArticleSchema);
