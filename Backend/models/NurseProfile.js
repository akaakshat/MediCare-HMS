// models/NurseProfile.js
// Nurse-specific profile information

const mongoose = require('mongoose');

const NurseProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  qualification: {
    type: String,
    required: true,
    enum: ['GNM', 'BSc Nursing', 'MSc Nursing', 'Diploma Nursing', 'ANM']
  },
  registrationNumber: {
    type: String,
    required: true,
    unique: true
  },
  experience: {
    type: Number,
    required: true,
    min: 0
    // Years
  },
  assignedDoctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedDepartment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MasterData'
    // References MasterData of type 'department'
  },
  shiftTiming: {
    startTime: {
      type: String
    },
    endTime: {
      type: String
    },
    daysOfWeek: {
      type: [String],
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    }
  },
  specialization: {
    type: String,
    default: 'General'
    // e.g., 'General', 'ICU', 'Operation Theatre', 'Emergency'
  },
  certifications: {
    type: [String],
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { collection: 'nurse_profiles' });

module.exports = mongoose.model('NurseProfile', NurseProfileSchema);
