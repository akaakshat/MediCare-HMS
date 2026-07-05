const mongoose = require('mongoose');

const AppointmentSchema = new mongoose.Schema({
  appointmentId: { type: String, unique: true },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  doctor: { type: String, required: true },
  scheduledAt: { type: Date, required: true },
  type: { type: String, enum: ['Consultation', 'Follow-up', 'Emergency'], default: 'Consultation' },
  visitTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'MasterData' },
  consultationTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'MasterData' },
  reason: { type: String },
  status: { type: String, enum: ['Pending', 'Confirmed', 'Completed', 'Cancelled'], default: 'Pending' },
  statusId: { type: mongoose.Schema.Types.ObjectId, ref: 'MasterData' },
}, { timestamps: true });

AppointmentSchema.index({ doctor: 1, scheduledAt: 1 });

// Generate a sequential human-friendly appointment ID like APT0001
AppointmentSchema.pre('save', async function () {
  if (this.appointmentId) return;

  try {
    const Appointment = mongoose.model('Appointment');
    const last = await Appointment.findOne({ appointmentId: { $exists: true } })
      .sort({ createdAt: -1 })
      .lean();

    let nextNumber = 1;
    if (last && last.appointmentId) {
      const match = String(last.appointmentId).match(/APT(\d+)/);
      if (match) nextNumber = Number(match[1]) + 1;
    }

    this.appointmentId = `APT${String(nextNumber).padStart(4, '0')}`;
  } catch (err) {
    console.error('Error generating appointmentId:', err);
    // If generation fails, allow save to proceed without appointmentId but log.
  }
});

module.exports = mongoose.model('Appointment', AppointmentSchema);
