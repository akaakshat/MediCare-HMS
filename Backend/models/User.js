const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ['admin', 'doctor', 'nurse', 'receptionist', 'staff'],
    default: 'receptionist'
  },
  permissions: [{ type: String }], // Array of permission strings
  specialization: { type: String },
  experience: { type: Number },
  phone: { type: String },
  availability: { type: String, enum: ['Available', 'Unavailable'], default: 'Available' },
  availabilitySchedule: { type: [String] },
  slotCapacities: { type: Object, default: {} },
  rating: { type: Number, min: 0, max: 5 },
  
  // MDM References for Doctors
  specializationId: { type: mongoose.Schema.Types.ObjectId, ref: 'MasterData' },
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'MasterData' },
  qualificationIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MasterData' }],
  licenseStatusId: { type: mongoose.Schema.Types.ObjectId, ref: 'MasterData' },
  
  // Profile image/avatar
  profileImage: {
    filename: String,
    path: String,
    mimetype: String,
    uploadedAt: Date
  },
  
  // Common fields for clinic user module
  gender: String,
  dateOfBirth: Date,
  address: String,
  username: { type: String, unique: true, sparse: true },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  }
}, { timestamps: true });

// Index for efficient queries
UserSchema.index({ departmentId: 1, role: 1 });
UserSchema.index({ specializationId: 1 });
UserSchema.index({ licenseStatusId: 1 });

UserSchema.pre('save', async function(next) {
  // Normalize role to lowercase for consistency with frontend and token roles
  if (this.role && typeof this.role === 'string') {
    this.role = this.role.toLowerCase();
  }

  // Only hash password if it's not already hashed (check for bcrypt prefix)
  if (!this.isModified('password') || (this.password && this.password.startsWith('$2'))) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

UserSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
