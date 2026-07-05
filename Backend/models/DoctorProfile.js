// models/DoctorProfile.js
// Doctor-specific profile information

const mongoose = require('mongoose');

const DoctorProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  specialization: {
    type: String,
    required: true,
    enum: ['General', 'Cardiology', 'Neurology', 'Pediatrics', 'Orthopedics', 'Dermatology', 'Psychiatry', 'Surgery', 'ENT', 'Gynecology']
  },
  qualification: {
    type: String,
    required: true
    // e.g., "MBBS, MD Cardiology"
  },
  experience: {
    type: Number,
    required: true,
    min: 0
    // Years of experience
  },
  licenseNumber: {
    type: String,
    required: true,
    unique: true
  },
  licenseExpiry: {
    type: Date,
    required: true
  },
  consultationFees: {
    type: Number,
    required: true,
    min: 0
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MasterData',
    required: true
    // References MasterData of type 'department'
  },
  availableDays: {
    type: [String],
    required: true,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  },
  timeSlots: [
    {
      day: {
        type: String,
        enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
      },
      startTime: String,
      endTime: String,
      slotDuration: Number // in minutes
    }
  ],
  bio: {
    type: String,
    trim: true
  },
  registrationNumber: {
    type: String,
    required: true,
    unique: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { collection: 'doctor_profiles' });

module.exports = mongoose.model('DoctorProfile', DoctorProfileSchema);
