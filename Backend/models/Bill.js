const mongoose = require('mongoose');

const BillSchema = new mongoose.Schema({
  invoiceId: { type: String, unique: true },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
  patientName: { type: String },
  uhid: { type: String },
  date: { type: Date, default: Date.now },
  items: [{ name: String, quantity: Number, price: Number }],
  amount: { type: Number, required: true },
  
  // MDM References
  billStatusId: { type: mongoose.Schema.Types.ObjectId, ref: 'MasterData' },
  paymentMethodId: { type: mongoose.Schema.Types.ObjectId, ref: 'MasterData' },
  invoiceTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'MasterData' },
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'MasterData' },
  
  // Legacy status fields (for backward compatibility, will be deprecated)
  status: { type: String, enum: ['Pending', 'Paid', 'Cancelled'], default: 'Pending' },
  paymentMethod: { type: String },
  paid: { type: Boolean, default: false },
  
  description: { type: String },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Index for efficient queries
BillSchema.index({ billStatusId: 1, date: -1 });
BillSchema.index({ paymentMethodId: 1 });
BillSchema.index({ departmentId: 1 });

module.exports = mongoose.model('Bill', BillSchema);
