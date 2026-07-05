const mongoose = require('mongoose');

const StaffProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  
  // Role/Title
  jobTitle: {
    type: String,
    enum: [
      'Ward Attendant',
      'Lab Technician',
      'Clerical Staff',
      'Maintenance Staff',
      'Security',
      'Housekeeping',
      'Medical Records Officer',
      'Administrative Officer',
      'Other'
    ],
    required: true
  },
  
  // Work details
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MasterData'
  },
  
  shiftTiming: {
    startTime: String,    // HH:MM format
    endTime: String,      // HH:MM format
    daysOfWeek: [String]  // ['Monday', 'Tuesday', etc.]
  },
  
  // Experience
  workExperience: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Certifications/Skills
  certifications: [String],
  
  skills: [String],
  
  // Employment
  employmentType: {
    type: String,
    enum: ['Full-time', 'Part-time', 'Contract', 'Temporary'],
    default: 'Full-time'
  },
  
  joiningDate: Date,
  
  // Supervisor/Manager
  supervisorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Performance
  performanceRating: {
    type: Number,
    min: 0,
    max: 5
  },
  
  // Address for emergency contact
  emergencyContactName: String,
  emergencyContactPhone: String,
  emergencyContactRelation: String,
  
  // Additional notes
  remarks: String,
  
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
  collection: 'staffProfiles'
});

// Indexes
StaffProfileSchema.index({ department: 1 });
StaffProfileSchema.index({ supervisorId: 1 });

module.exports = mongoose.model('StaffProfile', StaffProfileSchema);
