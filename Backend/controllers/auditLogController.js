// controllers/auditLogController.js
// Audit log management

const AuditLog = require('../models/AuditLog');

/**
 * Get audit logs for a specific user
 * GET /api/audit-logs/user/:userId
 */
exports.getUserAuditLogs = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, skip = 0 } = req.query;

    const logs = await AuditLog.getUserHistory(
      userId,
      parseInt(limit),
      parseInt(skip)
    );

    const total = await AuditLog.countDocuments({ userId });

    res.status(200).json({
      success: true,
      data: logs,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        hasMore: total > (parseInt(skip) + parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching user audit logs:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch audit logs'
    });
  }
};

/**
 * Get actions performed by a user
 * GET /api/audit-logs/actions-by/:userId
 */
exports.getActionsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, skip = 0 } = req.query;

    const logs = await AuditLog.getActionsByUser(
      userId,
      parseInt(limit),
      parseInt(skip)
    );

    const total = await AuditLog.countDocuments({ 'performedBy.userId': userId });

    res.status(200).json({
      success: true,
      data: logs,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        hasMore: total > (parseInt(skip) + parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching actions by user:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch audit logs'
    });
  }
};

/**
 * Get change history for a specific resource
 * GET /api/audit-logs/resource/:resourceId?targetType=USER
 */
exports.getResourceHistory = async (req, res) => {
  try {
    const { resourceId } = req.params;
    const { targetType = 'USER', limit = 50 } = req.query;

    const logs = await AuditLog.getResourceHistory(
      resourceId,
      targetType,
      parseInt(limit)
    );

    res.status(200).json({
      success: true,
      data: logs,
      count: logs.length
    });
  } catch (error) {
    console.error('Error fetching resource history:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch audit logs'
    });
  }
};

/**
 * Get all audit logs (admin only)
 * GET /api/audit-logs
 */
exports.getAllAuditLogs = async (req, res) => {
  try {
    // Check admin access
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only administrators can view all audit logs'
      });
    }

    const { limit = 100, skip = 0, action, startDate, endDate } = req.query;

    // Build query
    const query = {};

    if (action) {
      query.action = action;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    const logs = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .populate('userId', 'name email role')
      .populate('performedBy.userId', 'name email role')
      .lean();

    const total = await AuditLog.countDocuments(query);

    res.status(200).json({
      success: true,
      data: logs,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        hasMore: total > (parseInt(skip) + parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching all audit logs:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch audit logs'
    });
  }
};

/**
 * Get audit log statistics
 * GET /api/audit-logs/stats
 */
exports.getAuditLogStats = async (req, res) => {
  try {
    // Check admin access
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only administrators can view audit statistics'
      });
    }

    const stats = await AuditLog.aggregate([
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    const actionsByUser = await AuditLog.aggregate([
      {
        $group: {
          _id: '$performedBy.userId',
          count: { $sum: 1 },
          name: { $first: '$performedBy.name' },
          email: { $first: '$performedBy.email' },
          role: { $first: '$performedBy.role' }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      }
    ]);

    const totalLogs = await AuditLog.countDocuments();
    const failedActions = await AuditLog.countDocuments({ success: false });

    res.status(200).json({
      success: true,
      data: {
        actionStats: stats,
        topActors: actionsByUser,
        totalLogs,
        failedActions,
        successRate: ((totalLogs - failedActions) / totalLogs * 100).toFixed(2) + '%'
      }
    });
  } catch (error) {
    console.error('Error fetching audit statistics:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch audit statistics'
    });
  }
};

/**
 * Export audit logs to CSV (admin only)
 * GET /api/audit-logs/export
 */
exports.exportAuditLogs = async (req, res) => {
  try {
    // Check admin access
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only administrators can export audit logs'
      });
    }

    const { startDate, endDate } = req.query;
    const query = {};

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    const logs = await AuditLog.find(query)
      .populate('userId', 'name email')
      .populate('performedBy.userId', 'name email')
      .lean();

    // Convert to CSV format
    const csv = convertToCSV(logs);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="audit-logs.csv"');
    res.status(200).send(csv);
  } catch (error) {
    console.error('Error exporting audit logs:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to export audit logs'
    });
  }
};

/**
 * Helper function to convert JSON to CSV
 */
function convertToCSV(data) {
  if (!data || data.length === 0) return '';

  const headers = [
    'Timestamp',
    'Action',
    'User ID',
    'User Email',
    'Performed By',
    'Target Type',
    'Target ID',
    'Details',
    'Success',
    'Error Message'
  ];

  const rows = data.map(log => [
    new Date(log.createdAt).toLocaleString(),
    log.action,
    log.userId?._id?.toString() || '',
    log.userId?.email || '',
    log.performedBy?.email || '',
    log.targetType,
    log.targetId?.toString() || '',
    log.details,
    log.success ? 'Yes' : 'No',
    log.errorMessage || ''
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  return csvContent;
}
