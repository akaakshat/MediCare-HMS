const mongoose = require('mongoose');

const SaleSchema = new mongoose.Schema(
  {
    medicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'PharmacyItem', required: true },
    quantity: { type: Number, required: true, min: 1 },
    billId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bill' },
    soldBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    department: { type: String, default: '' },
    date: { type: Date, required: true, default: () => new Date() },
  },
  { timestamps: true }
);

SaleSchema.index({ medicineId: 1 });
SaleSchema.index({ date: -1 });
SaleSchema.index({ billId: 1 });
SaleSchema.index({ soldBy: 1 });
SaleSchema.index({ department: 1 });

module.exports = mongoose.model('Sale', SaleSchema);
