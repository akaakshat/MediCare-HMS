const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  // Action details
  action: {
    type: String,
    enum: ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'PASSWORD_CHANGE', 'STATUS_CHANGE'],
    required: true
  },
  
  // User involved
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Target (the resource being acted upon)
  targetType: {
    type: String,
    enum: ['USER', 'PATIENT', 'APPOINTMENT', 'BILLING', 'MASTER_DATA'],
    default: 'USER'
  },
  targetId: mongoose.Schema.Types.ObjectId,
  
  // Who performed the action
  performedBy: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    email: String,
    role: String,
    name: String
  },
  
  // What changed (for updates)
  changes: {
    before: mongoose.Schema.Types.Mixed,
    after: mongoose.Schema.Types.Mixed
  },
  
  // Additional context
  details: String,
  ipAddress: String,
  userAgent: String,
  
  // Status
  success: { type: Boolean, default: true },
  errorMessage: String,
  
  // Metadata
  metadata: mongoose.Schema.Types.Mixed,
  
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { 
  timestamps: false,
  collection: 'auditLogs'
});

// Indexes for efficient queries
AuditLogSchema.index({ userId: 1, createdAt: -1 });
AuditLogSchema.index({ performedBy: 1, createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });
AuditLogSchema.index({ targetId: 1, targetType: 1 });
AuditLogSchema.index({ createdAt: -1 });

// TTL index - keep audit logs for 1 year then auto-delete
AuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 31536000 });

/**
 * Static method to create audit log entry
 */
AuditLogSchema.statics.log = async function(
  action,
  userId,
  performedBy,
  targetType = 'USER',
  targetId = null,
  changes = null,
  details = null,
  ipAddress = null,
  userAgent = null,
  metadata = null,
  success = true,
  errorMessage = null
) {
  try {
    const performedByData = performedBy || {};
    const auditLog = new this({
      action,
      userId,
      performedBy: {
        userId: performedByData._id || performedByData.userId || performedByData.id,
        email: performedByData.email || performedByData.userEmail || performedByData.emailAddress,
        role: performedByData.role,
        name: performedByData.name || performedByData.fullName || performedByData.displayName
      },
      targetType,
      targetId,
      changes,
      details,
      ipAddress,
      userAgent,
      metadata,
      success,
      errorMessage
    });
    
    await auditLog.save();
    return auditLog;
  } catch (error) {
    console.error('Error creating audit log:', error);
    // Don't throw - audit logging failure shouldn't break main operations
    return null;
  }
};

/**
 * Get audit history for a user
 */
AuditLogSchema.statics.getUserHistory = async function(userId, limit = 50, skip = 0) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .populate('performedBy.userId', 'name email role')
    .lean();
};

/**
 * Get actions performed by a user
 */
AuditLogSchema.statics.getActionsByUser = async function(performedByUserId, limit = 50, skip = 0) {
  return this.find({ 'performedBy.userId': performedByUserId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .populate('userId', 'name email role')
    .lean();
};

/**
 * Get all changes to a specific resource
 */
AuditLogSchema.statics.getResourceHistory = async function(targetId, targetType = 'USER', limit = 50) {
  return this.find({ targetId, targetType })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('performedBy.userId', 'name email role')
    .populate('userId', 'name email')
    .lean();
};

module.exports = mongoose.model('AuditLog', AuditLogSchema);
