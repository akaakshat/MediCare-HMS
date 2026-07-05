// routes/auditLogs.js
// Audit log routes

const express = require('express');
const router = express.Router();
const auditLogController = require('../controllers/auditLogController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(protect);

// Get audit logs for a specific user
router.get('/user/:userId', auditLogController.getUserAuditLogs);

// Get actions performed by a user
router.get('/actions-by/:userId', auditLogController.getActionsByUser);

// Get change history for a specific resource
router.get('/resource/:resourceId', auditLogController.getResourceHistory);

// Get all audit logs (admin only)
router.get('/', authorize('admin'), auditLogController.getAllAuditLogs);

// Get audit statistics (admin only)
router.get('/stats', authorize('admin'), auditLogController.getAuditLogStats);

// Export audit logs to CSV (admin only)
router.get('/export/csv', authorize('admin'), auditLogController.exportAuditLogs);

module.exports = router;
