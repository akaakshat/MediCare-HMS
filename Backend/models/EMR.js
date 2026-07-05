const mongoose = require('mongoose');

const EMRHistorySchema = new mongoose.Schema({
  action: { type: String, required: true },
  by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  byName: { type: String },
  at: { type: Date, default: Date.now },
  changes: { type: mongoose.Schema.Types.Mixed }
});

const EMRRecordSchema = new mongoose.Schema({
  uhid: { type: String, required: true },
  patient: { type: String, required: true },
  date: { type: String, required: true },
  doctor: { type: String, required: true },
  complaint: { type: String, required: true },
  hopi: { type: String, default: '' },
  physicalExamination: { type: String, default: '' },
  diagnosis: { type: String, required: true },
  prescription: { type: String, required: true },
  tests: { type: String, required: true },
  
  // MDM References
  diagnosisIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MasterData' }],
  treatmentTypeIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MasterData' }],
  symptomIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MasterData' }],
  prescribedMedicineIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MasterData' }],
  
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  deleted: { type: Boolean, default: false },
  deletedAt: { type: Date },
  history: [EMRHistorySchema]
}, { timestamps: true });

// Index for efficient queries
EMRRecordSchema.index({ uhid: 1, date: -1 });
EMRRecordSchema.index({ diagnosisIds: 1 });
EMRRecordSchema.index({ prescribedMedicineIds: 1 });

module.exports = mongoose.model('EMR', EMRRecordSchema);
