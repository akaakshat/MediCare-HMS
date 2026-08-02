const { enqueueSyncOperation, bulkEnqueueSyncOperations, getSyncStatus, processPendingOperations } = require('../services/syncService');

exports.postSync = async (req, res) => {
  try {
    const payload = req.body;
    const meta = {
      userId: req.user?._id || req.user?.id || null,
      performedBy: {
        userId: req.user?._id || req.user?.id || null,
        email: req.user?.email || null,
        role: req.user?.role || null,
        name: req.user?.name || null
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || null
    };
    const operation = await enqueueSyncOperation(payload, req.user, meta);
    res.json({ success: true, operation });
  } catch (err) {
    console.error('POST /sync failed:', err);
    res.status(400).json({ success: false, message: err.message || 'Invalid sync request' });
  }
};

exports.postBulkSync = async (req, res) => {
  try {
    const payloads = req.body;
    const meta = {
      userId: req.user?._id || req.user?.id || null,
      performedBy: {
        userId: req.user?._id || req.user?.id || null,
        email: req.user?.email || null,
        role: req.user?.role || null,
        name: req.user?.name || null
      },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || null
    };
    const operations = await bulkEnqueueSyncOperations(payloads, req.user, meta);
    res.json({ success: true, operations });
  } catch (err) {
    console.error('POST /sync/bulk failed:', err);
    res.status(400).json({ success: false, message: err.message || 'Invalid bulk sync request' });
  }
};

exports.getSyncStatus = async (req, res) => {
  try {
    const status = await getSyncStatus();
    res.json({ success: true, status });
  } catch (err) {
    console.error('GET /sync/status failed:', err);
    res.status(500).json({ success: false, message: err.message || 'Unable to fetch sync status' });
  }
};

exports.postConflict = async (req, res) => {
  try {
    const { operationId, resolution, mergedPayload } = req.body;
    if (!operationId || !resolution) {
      return res.status(400).json({ success: false, message: 'operationId and resolution are required' });
    }

    const operation = await require('../models/SyncOperation').findOne({ operationId });
    if (!operation) {
      return res.status(404).json({ success: false, message: 'Sync operation not found' });
    }

    if (resolution === 'keepLocal') {
      operation.status = 'pending';
      operation.retryCount = 0;
      operation.errorMessage = null;
      operation.resolvedBy = req.user?.email || req.user?.name || null;
      operation.resolvedAt = new Date();
      await operation.save();
      return res.json({ success: true, operation });
    }

    if (resolution === 'keepServer') {
      operation.status = 'synced';
      operation.errorMessage = null;
      operation.resolvedBy = req.user?.email || req.user?.name || null;
      operation.resolvedAt = new Date();
      await operation.save();
      return res.json({ success: true, operation });
    }

    if (resolution === 'merge' && mergedPayload) {
      operation.payload = mergedPayload;
      operation.status = 'pending';
      operation.retryCount = 0;
      operation.errorMessage = null;
      operation.resolvedBy = req.user?.email || req.user?.name || null;
      operation.resolvedAt = new Date();
      await operation.save();
      return res.json({ success: true, operation });
    }

    return res.status(400).json({ success: false, message: 'Invalid conflict resolution action' });
  } catch (err) {
    console.error('POST /sync/conflict failed:', err);
    res.status(500).json({ success: false, message: err.message || 'Unable to resolve sync conflict' });
  }
};

exports.processSync = async (req, res) => {
  try {
    const results = await processPendingOperations();
    res.json({ success: true, results });
  } catch (err) {
    console.error('POST /sync/process failed:', err);
    res.status(500).json({ success: false, message: err.message || 'Sync processing failed' });
  }
};
