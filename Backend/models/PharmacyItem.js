const mongoose = require('mongoose');

const PharmacyItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  medicineMasterId: { type: mongoose.Schema.Types.ObjectId, ref: 'MasterData' },
  sku: { type: String },
  category: { type: String },
  medicineCategoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'MasterData' },
  quantity: { type: Number, default: 0 },
  minStock: { type: Number, default: 0 },
  unitPrice: { type: Number, default: 0 },
  dosageFormId: { type: mongoose.Schema.Types.ObjectId, ref: 'MasterData' },
  unitId: { type: mongoose.Schema.Types.ObjectId, ref: 'MasterData' },
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'MasterData' },
  expiryDate: { type: Date },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('PharmacyItem', PharmacyItemSchema);
