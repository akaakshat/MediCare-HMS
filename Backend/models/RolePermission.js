// models/RolePermission.js
// Schema for Role-Permission Mapping

const mongoose = require('mongoose');

const RolePermissionSchema = new mongoose.Schema({
  roleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MasterData',
    required: true
  },
  permissionId: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  description: String,
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
  collection: 'role_permissions'
});

// Ensure unique role-permission combinations
RolePermissionSchema.index({ roleId: 1, permissionId: 1 }, { unique: true });
RolePermissionSchema.index({ roleId: 1, isActive: 1 });

module.exports = mongoose.model('RolePermission', RolePermissionSchema);
