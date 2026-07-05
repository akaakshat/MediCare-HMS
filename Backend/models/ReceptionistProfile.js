// models/ReceptionistProfile.js
// Receptionist-specific profile information

const mongoose = require('mongoose');

const ReceptionistProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  shiftTiming: {
    startTime: {
      type: String
      // e.g., "09:00"
    },
    endTime: {
      type: String
    },
    daysOfWeek: {
      type: [String],
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    }
  },
  workExperience: {
    type: Number,
    required: true,
    min: 0
    // Years
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MasterData',
    default: null
  },
  assignedToDoctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  skills: {
    type: [String],
    default: []
    // e.g., ['appointment_scheduling', 'billing', 'patient_registration']
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { collection: 'receptionist_profiles' });

module.exports = mongoose.model('ReceptionistProfile', ReceptionistProfileSchema);
