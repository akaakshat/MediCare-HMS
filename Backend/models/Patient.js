const mongoose = require('mongoose');

const PatientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  age: { type: Number },
  gender: { type: String, enum: ['Male', 'Female', 'Other'] },
  genderId: { type: mongoose.Schema.Types.ObjectId, ref: 'MasterData' },
  bloodGroup: { type: String },
  bloodGroupId: { type: mongoose.Schema.Types.ObjectId, ref: 'MasterData' },
  maritalStatus: { type: String },
  maritalStatusId: { type: mongoose.Schema.Types.ObjectId, ref: 'MasterData' },
  patientType: { type: String },
  patientTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'MasterData' },
  phone: { type: String, required: true },
  email: { type: String },
  address: { type: String },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  statusId: { type: mongoose.Schema.Types.ObjectId, ref: 'MasterData' },
  uhid: { type: String, unique: true },
  lastVisit: { type: Date },
  lastActivityDate: { type: Date, default: Date.now },
  isInactive: { type: Boolean, default: false },
  notes: { type: String },
}, { timestamps: true });

PatientSchema.index({ isInactive: 1 });
PatientSchema.index({ lastActivityDate: 1 });
PatientSchema.index({ isInactive: 1, lastActivityDate: 1 });

// Generate unique UHID before saving
PatientSchema.pre('save', async function(next) {
  if (this.uhid) return next();

  try {
    const Patient = mongoose.model('Patient');
    const lastPatient = await Patient.findOne({ uhid: { $exists: true } })
      .sort({ createdAt: -1 })
      .select('uhid')
      .lean();

    let nextNumber = 1;
    if (lastPatient && lastPatient.uhid) {
      const match = lastPatient.uhid.match(/^UHID(\d+)$/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    this.uhid = `UHID${String(nextNumber).padStart(6, '0')}`;
    next();
  } catch (err) {
    console.error('Error generating UHID:', err);
    next(err);
  }
});

module.exports = mongoose.model('Patient', PatientSchema);
