// routes/mdm.js
// Master Data Management Routes

const express = require('express');
const router = express.Router();
const mdmController = require('../controllers/mdmController');
const { protect } = require('../middleware/authMiddleware');
const {
  requireAdmin,
  mdmAuthRestrictions,
  mdmUpload,
  handleMulterErrors,
  validateMasterType
} = require('../middleware/mdmMiddleware');

// All MDM routes require authentication
router.use(protect);

// ============================================
// Feature Access Management Endpoints (Must be before generic :type routes)
// ============================================

/**
 * POST /api/mdm/grant-feature-access
 * Grant features to a user or role
 */
router.post('/grant-feature-access', 
  mdmController.grantFeatureAccess
);

/**
 * GET /api/mdm/user-features/:userId
 * Get all features accessible by a user
 */
router.get('/user-features/:userId', 
  mdmController.getUserFeatures
);

/**
 * DELETE /api/mdm/revoke-feature-access/:accessId
 * Revoke feature access
 */
router.delete('/revoke-feature-access/:accessId', 
  mdmController.revokeFeatureAccess
);

// ============================================
// Static/Named Routes (Must be before generic :type routes)
// ============================================

/**
 * GET /api/mdm/template/:type
 * Get template for bulk import
 */
router.get('/template/:type', validateMasterType, mdmController.getTemplate);

/**
 * GET /api/mdm/role-permissions
 * Get all or specific role-permission mappings
 */
router.get('/role-permissions', mdmController.getRolePermissions);

/**
 * GET /api/mdm/cache/stats
 * Get cache statistics
 */
router.get('/cache/stats', 
  requireAdmin, 
  mdmController.getCacheStats
);

// ============================================
// Generic Routes (Catch-all patterns - MUST be last)
// ============================================

// Public endpoints (view only)
/**
 * GET /api/masters/:type
 * Get all master data of specific type with pagination
 */
router.get('/:type', validateMasterType, mdmController.getMasterDataByType);

/**
 * GET /api/masters/:type/:id
 * Get specific master data record
 */
router.get('/:type/:id', validateMasterType, mdmController.getMasterDataById);

// Admin-only endpoints (create, update, delete)
/**
 * POST /api/masters/:type
 * Create new master data record
 */
router.post('/:type', 
  requireAdmin, 
  validateMasterType, 
  mdmController.createMasterData
);

/**
 * PUT /api/masters/:type/:id
 * Update master data record
 */
router.put('/:type/:id', 
  requireAdmin, 
  validateMasterType, 
  mdmController.updateMasterData
);

/**
 * DELETE /api/masters/:type/:id
 * Delete master data record (soft delete)
 */
router.delete('/:type/:id', 
  requireAdmin, 
  validateMasterType, 
  mdmController.deleteMasterData
);

// Excel import/export endpoints
/**
 * POST /api/masters/upload/:type
 * Upload and import Excel file
 */
router.post(
  '/upload/:type',
  requireAdmin,
  validateMasterType,
  mdmUpload.single('file'),
  handleMulterErrors,
  mdmController.uploadExcelFile
);

/**
 * GET /api/masters/export/:type
 * Export master data to Excel
 */
router.get('/export/:type', 
  requireAdmin, 
  validateMasterType, 
  mdmController.exportToExcel
);

// Role-Permission endpoints
/**
 * POST /api/masters/role-permissions
 * Create role-permission mapping
 */
router.post(
  '/role-permissions',
  requireAdmin,
  mdmController.createRolePermission
);

/**
 * DELETE /api/masters/role-permissions/:mappingId
 * Delete role-permission mapping
 */
router.delete(
  '/role-permissions/:mappingId',
  requireAdmin,
  mdmController.deleteRolePermission
);

/**
 * POST /api/masters/cache/clear
 * Clear cache
 */
router.post(
  '/cache/clear',
  requireAdmin,
  mdmController.clearCache
);

module.exports = router;
