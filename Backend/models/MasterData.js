// models/MasterData.js
// Generic Master Data schema that can be used for all master collections

const mongoose = require('mongoose');

const MasterDataSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: [
      // User & Access Control
      'role', 'permission', 'role_permission_mapping', 'user_status', 'feature_access',
      // Patient
      'gender', 'blood_group', 'marital_status', 'patient_type',
      // Doctor
      'department', 'specialization', 'qualification',
      // Appointment
      'appointment_status', 'visit_type', 'consultation_type',
      // Billing
      'payment_status', 'payment_method', 'invoice_type', 'tax_configuration',
      // Medical
      'icd_code', 'symptom', 'allergy', 'diagnosis_type', 'vital_type',
      // Pharmacy
      'medicine_master', 'medicine_category', 'dosage_form', 'unit', 'vendor'
    ]
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
    index: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  features: {
    type: [String],
    default: []
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  // For specific types, store additional structured data
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MasterData',
    default: null // For hierarchical data like category → medicine type
  },
  displayOrder: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { 
  timestamps: true,
  collection: 'master_data'
});

// Compound unique index on type and code
MasterDataSchema.index({ type: 1, code: 1 }, { unique: true });

// Index for queries
MasterDataSchema.index({ type: 1, isActive: 1 });
MasterDataSchema.index({ type: 1, name: 1 });
MasterDataSchema.index({ parentId: 1 });

// Pre-save middleware to update updatedAt
MasterDataSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('MasterData', MasterDataSchema);
