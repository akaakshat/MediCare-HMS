const mongoose = require('mongoose');

const PatientIcdMappingSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  icdCode: { type: mongoose.Schema.Types.ObjectId, ref: 'IcdCode', required: true },
  encounterDate: { type: Date, required: true },
  notes: { type: String, trim: true },
  status: {
    type: String,
    enum: ['active', 'resolved', 'chronic', 'inactive'],
    default: 'active',
  },
  isPrimary: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('PatientIcdMapping', PatientIcdMappingSchema);
