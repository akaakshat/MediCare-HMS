const mongoose = require('mongoose');

const SyncOperationSchema = new mongoose.Schema({
  operationId: { type: String, required: true, unique: true },
  collection: { type: String, required: true },
  action: { type: String, required: true, enum: ['CREATE', 'UPDATE', 'DELETE'] },
  documentId: { type: String },
  payload: { type: mongoose.Schema.Types.Mixed },
  status: {
    type: String,
    enum: ['pending', 'processing', 'synced', 'failed', 'conflicted'],
    default: 'pending'
  },
  retryCount: { type: Number, default: 0 },
  lastAttemptAt: { type: Date },
  errorMessage: { type: String },
  resolvedBy: { type: String },
  resolvedAt: { type: Date },
  serverVersion: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now }
}, { collection: 'syncOperations' });

SyncOperationSchema.index({ operationId: 1 }, { unique: true });
SyncOperationSchema.index({ status: 1, createdAt: 1 });
SyncOperationSchema.index({ collection: 1, documentId: 1 });
SyncOperationSchema.index({ createdAt: 1 }, { expireAfterSeconds: Number(process.env.SYNC_OPERATION_RETENTION_SECONDS || 2592000) });

module.exports = mongoose.model('SyncOperation', SyncOperationSchema);
