const SyncOperation = require('../models/SyncOperation');
const Patient = require('../models/Patient');
const Appointment = require('../models/Appoinment');
const Bill = require('../models/Bill');
const PharmacyItem = require('../models/PharmacyItem');
const EMR = require('../models/EMR');
const AuditLog = require('../models/AuditLog');

const SUPPORTED_COLLECTIONS = ['patients', 'appointments', 'billing', 'inventory', 'emr'];
const SYNCABLE_COLLECTIONS = {
  patients: Patient,
  appointments: Appointment,
  billing: Bill,
  inventory: PharmacyItem,
  emr: EMR
};

const getSyncStatus = async () => {
  const pending = await SyncOperation.countDocuments({ status: 'pending' });
  const processing = await SyncOperation.countDocuments({ status: 'processing' });
  const failed = await SyncOperation.countDocuments({ status: 'failed' });
  const synced = await SyncOperation.countDocuments({ status: 'synced' });
  const lastSync = await SyncOperation.findOne({ status: 'synced' }).sort({ resolvedAt: -1, lastAttemptAt: -1 }).lean();

  return {
    pending,
    processing,
    failed,
    synced,
    lastSuccessfulSync: lastSync?.resolvedAt || lastSync?.lastAttemptAt || null,
    updatedAt: new Date()
  };
};

const validateSyncPayload = (payload) => {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid sync payload');
  }
  const { operationId, collection, action, documentId, payload: docPayload } = payload;
  if (!operationId || !collection || !action || !docPayload) {
    throw new Error('Missing required sync fields');
  }
  if (!SUPPORTED_COLLECTIONS.includes(collection)) {
    throw new Error(`Unsupported collection ${collection}`);
  }
  if (!['CREATE', 'UPDATE', 'DELETE'].includes(action)) {
    throw new Error(`Unsupported sync action ${action}`);
  }
  return { operationId, collection, action, documentId, payload: docPayload };
};

const handleConflict = async (operation, existingDoc) => {
  operation.status = 'conflicted';
  operation.lastAttemptAt = new Date();
  await operation.save();

  await AuditLog.log(
    'UPDATE',
    operation.userId || null,
    operation.performedBy || {},
    operation.collection.toUpperCase(),
    existingDoc?._id || operation.documentId || null,
    { before: existingDoc, after: operation.payload },
    'Sync conflict detected',
    operation.ipAddress || null,
    operation.userAgent || null,
    { operationId: operation.operationId, conflict: true },
    false,
    'Conflict detected while syncing'
  );

  return {
    conflict: true,
    operationId: operation.operationId,
    collection: operation.collection,
    action: operation.action,
    serverVersion: existingDoc,
    localPayload: operation.payload
  };
};

const applySyncOperation = async (operation) => {
  const Model = SYNCABLE_COLLECTIONS[operation.collection];
  if (!Model) {
    throw new Error(`No model available for collection ${operation.collection}`);
  }

  const { action, payload, documentId } = operation;
  if (action === 'CREATE') {
    const created = await Model.create(payload);
    operation.status = 'synced';
    operation.lastAttemptAt = new Date();
    operation.resolvedAt = new Date();
    operation.serverVersion = created.toObject();
    await operation.save();
    return created;
  }

  if (action === 'UPDATE') {
    const targetId = documentId || payload._id;
    if (!targetId) {
      throw new Error('Update operation requires documentId or payload._id');
    }
    const existing = await Model.findById(targetId).lean();
    if (!existing) {
      const created = await Model.create({ ...payload, _id: targetId });
      operation.status = 'synced';
      operation.lastAttemptAt = new Date();
      operation.resolvedAt = new Date();
      operation.serverVersion = created.toObject();
      await operation.save();
      return created;
    }

    const merged = { ...existing, ...payload, updatedAt: new Date() };
    await Model.findByIdAndUpdate(targetId, merged, { new: true, upsert: true });

    operation.status = 'synced';
    operation.lastAttemptAt = new Date();
    operation.resolvedAt = new Date();
    operation.serverVersion = merged;
    await operation.save();
    return merged;
  }

  if (action === 'DELETE') {
    const targetId = documentId || payload._id;
    if (!targetId) {
      throw new Error('Delete operation requires documentId or payload._id');
    }
    const existing = await Model.findById(targetId).lean();
    if (!existing) {
      operation.status = 'synced';
      operation.lastAttemptAt = new Date();
      operation.resolvedAt = new Date();
      operation.serverVersion = null;
      await operation.save();
      return { deleted: true };
    }
    await Model.deleteOne({ _id: targetId });
    operation.status = 'synced';
    operation.lastAttemptAt = new Date();
    operation.resolvedAt = new Date();
    operation.serverVersion = existing;
    await operation.save();
    return { deleted: true };
  }

  throw new Error(`Unknown action ${action}`);
};

const processSyncOperation = async (operation) => {
  operation.status = 'processing';
  operation.lastAttemptAt = new Date();
  operation.retryCount += 1;
  await operation.save();

  const existingDoc = operation.documentId ? await SYNCABLE_COLLECTIONS[operation.collection].findById(operation.documentId).lean() : null;

  if (existingDoc && operation.action === 'UPDATE') {
    const serverUpdatedAt = new Date(existingDoc.updatedAt || existingDoc.createdAt || 0).getTime();
    const clientUpdatedAt = new Date(operation.payload.updatedAt || operation.payload.createdAt || 0).getTime();
    if (serverUpdatedAt > clientUpdatedAt) {
      return handleConflict(operation, existingDoc);
    }
  }

  const result = await applySyncOperation(operation);
  return { conflict: false, result };
};

const enqueueSyncOperation = async (payload, user = {}, meta = {}) => {
  const validated = validateSyncPayload(payload);
  const operation = new SyncOperation({
    ...validated,
    status: 'pending',
    retryCount: 0,
    createdAt: new Date(),
    ...meta
  });
  await operation.save();
  return operation;
};

const bulkEnqueueSyncOperations = async (payloads, user = {}, meta = {}) => {
  if (!Array.isArray(payloads) || payloads.length === 0) {
    throw new Error('Bulk sync payload must be a non-empty array');
  }
  const ops = [];
  for (const raw of payloads) {
    const validated = validateSyncPayload(raw);
    const operation = new SyncOperation({
      ...validated,
      status: 'pending',
      retryCount: 0,
      createdAt: new Date(),
      ...meta
    });
    ops.push(operation);
  }
  await SyncOperation.insertMany(ops, { ordered: false });
  return ops;
};

const processPendingOperations = async () => {
  const pendingOps = await SyncOperation.find({ status: { $in: ['pending', 'failed'] } })
    .sort({ createdAt: 1 })
    .limit(50);

  const results = [];
  for (const operation of pendingOps) {
    try {
      const result = await processSyncOperation(operation);
      results.push({ operationId: operation.operationId, status: operation.status, conflict: result.conflict });
    } catch (error) {
      operation.status = 'failed';
      operation.errorMessage = error.message;
      operation.lastAttemptAt = new Date();
      await operation.save();
      results.push({ operationId: operation.operationId, status: 'failed', error: error.message });
    }
  }
  return results;
};

module.exports = {
  getSyncStatus,
  enqueueSyncOperation,
  bulkEnqueueSyncOperations,
  processPendingOperations,
  validateSyncPayload,
  handleConflict,
  processSyncOperation
};
