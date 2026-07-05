// controllers/mdmController.js
// Enhanced Master Data Management Controller with CRUD + Feature Access

const MasterData = require('../models/MasterData');
const User = require('../models/User');
const mdmService = require('../services/mdmService');

/**
 * ============================================
 * READ OPERATIONS - Public (all authenticated users)
 * ============================================
 */

/**
 * GET /api/mdm/:type
 * Get all master data of a specific type with pagination
 */
exports.getMasterDataByType = async (req, res) => {
  try {
    const { type } = req.params;
    const { activeOnly = true, page = 1, limit = 100, search = '' } = req.query;

    const result = await mdmService.getMasterDataByType(
      type,
      activeOnly === 'true' || activeOnly === true,
      {
        page: parseInt(page),
        limit: parseInt(limit),
        search
      }
    );

    res.status(200).json({
      success: true,
      data: result.data,
      total: result.total,
      page: result.page,
      limit: result.limit,
      pages: result.pages,
      fromCache: result.fromCache || false
    });
  } catch (error) {
    console.error('Error in getMasterDataByType:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * GET /api/mdm/:type/:id
 * Get specific master data record
 */
exports.getMasterDataById = async (req, res) => {
  try {
    const { id } = req.params;

    const data = await mdmService.getMasterDataById(id);

    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error in getMasterDataById:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * ============================================
 * CREATE OPERATIONS - Admin Only
 * ============================================
 */

/**
 * POST /api/mdm/create/:type
 * Create new master data record
 * 
 * Admin-only operation
 * 
 * Body: {
 *   name: string (required),
 *   code: string (required),
 *   description: string (optional),
 *   metadata: object (optional),
 *   displayOrder: number (optional)
 * }
 */
exports.createMasterData = async (req, res) => {
  try {
    // Check admin access
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only administrators can create master data'
      });
    }

    const { type } = req.params;
    const { name, code, description = '', metadata = {}, displayOrder = 0, parentId = null } = req.body;

    // Validate required fields
    if (!name || !code) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, code'
      });
    }

    // Create new master data document
    const newMasterData = new MasterData({
      type,
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description: description.trim(),
      metadata,
      displayOrder,
      parentId,
      isActive: true,
      createdBy: req.user.id
    });

    await newMasterData.save();

    res.status(201).json({
      success: true,
      message: 'Master data created successfully',
      data: newMasterData
    });
  } catch (error) {
    console.error('Error in createMasterData:', error);
    
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: `Master data with code '${error.keyValue.code}' already exists`
      });
    }

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * ============================================
 * UPDATE OPERATIONS - Admin Only
 * ============================================
 */

/**
 * PUT /api/mdm/update/:type/:id
 * Update master data record
 * 
 * Admin-only operation
 */
exports.updateMasterData = async (req, res) => {
  try {
    // Check admin access
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only administrators can update master data'
      });
    }

    const { id } = req.params;
    const updateData = req.body;

    // Set audit fields
    updateData.updatedBy = req.user.id;
    updateData.updatedAt = new Date();

    // Prevent updating sensitive fields
    delete updateData.type; // Type should not change
    delete updateData.code; // Code should not change
    delete updateData.createdBy; // CreatedBy should not change

    const result = await MasterData.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Master data record not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Master data updated successfully',
      data: result
    });
  } catch (error) {
    console.error('Error in updateMasterData:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * ============================================
 * DELETE OPERATIONS - Admin Only
 * ============================================
 */

/**
 * DELETE /api/mdm/delete/:type/:id
 * Soft delete - marks as inactive instead of removing
 * 
 * Admin-only operation
 */
exports.deleteMasterData = async (req, res) => {
  try {
    // Check admin access
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only administrators can delete master data'
      });
    }

    const { id } = req.params;

    const result = await MasterData.findByIdAndUpdate(
      id,
      {
        isActive: false,
        deletedBy: req.user.id,
        deletedAt: new Date()
      },
      { new: true }
    );

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Master data record not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Master data deleted successfully',
      data: result
    });
  } catch (error) {
    console.error('Error in deleteMasterData:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * POST /masters/upload/:type
 * Upload and import Excel file
 */
exports.uploadExcelFile = async (req, res) => {
  try {
    const { type } = req.params;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const result = await mdmService.handleExcelImport(
      req.file,
      type,
      req.user?.id
    );

    res.status(200).json({
      success: true,
      message: 'Excel import completed',
      data: result,
      summary: result.summary
    });
  } catch (error) {
    console.error('Error in uploadExcelFile:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * GET /masters/export/:type
 * Export master data to Excel
 */
exports.exportToExcel = async (req, res) => {
  try {
    const { type } = req.params;
    const { activeOnly = true } = req.query;

    const result = await mdmService.exportToExcel(
      type,
      activeOnly === 'true' || activeOnly === true
    );

    // Return file download info
    res.status(200).json({
      success: true,
      message: 'Master data exported successfully',
      data: {
        filename: result.filename,
        recordCount: result.recordCount,
        downloadUrl: `/exports/${result.filename}`
      }
    });
  } catch (error) {
    console.error('Error in exportToExcel:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * GET /masters/template/:type
 * Generate and download import template
 */
exports.getTemplate = async (req, res) => {
  try {
    const { type } = req.params;

    const result = await mdmService.generateTemplate(type);

    res.status(200).json({
      success: true,
      message: 'Template generated successfully',
      data: {
        filename: result.filename,
        downloadUrl: `/exports/${result.filename}`
      }
    });
  } catch (error) {
    console.error('Error in getTemplate:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * GET /masters/role-permissions
 * Get all role-permission mappings
 */
exports.getRolePermissions = async (req, res) => {
  try {
    const { roleId } = req.query;

    const result = await mdmService.getRolePermissions(roleId || null);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error in getRolePermissions:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * POST /masters/role-permissions
 * Create role-permission mapping
 */
exports.createRolePermission = async (req, res) => {
  try {
    const { roleId, permissionId } = req.body;

    if (!roleId || !permissionId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: roleId, permissionId'
      });
    }

    const result = await mdmService.createRolePermission(roleId, permissionId);

    res.status(201).json({
      success: true,
      message: 'Role-permission mapping created successfully',
      data: result
    });
  } catch (error) {
    console.error('Error in createRolePermission:', error);
    res.status(error.message.includes('already exists') ? 409 : 500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * DELETE /masters/role-permissions/:mappingId
 * Delete role-permission mapping
 */
exports.deleteRolePermission = async (req, res) => {
  try {
    const { mappingId } = req.params;

    const result = await mdmService.deleteRolePermission(mappingId);

    res.status(200).json({
      success: true,
      message: 'Role-permission mapping deleted successfully',
      data: result
    });
  } catch (error) {
    console.error('Error in deleteRolePermission:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * GET /masters/cache/stats
 * Get cache statistics (admin only)
 */
exports.getCacheStats = async (req, res) => {
  try {
    const stats = mdmService.getCacheStats();

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error in getCacheStats:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * POST /masters/cache/clear
 * Clear cache (admin only)
 */
exports.clearCache = async (req, res) => {
  try {
    const { type } = req.body;

    mdmService.clearCache(type);

    res.status(200).json({
      success: true,
      message: type ? `Cache cleared for type: ${type}` : 'All cache cleared'
    });
  } catch (error) {
    console.error('Error in clearCache:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * ============================================
 * FEATURE ACCESS MANAGEMENT - Admin Only
 * ============================================
 */

/**
 * POST /api/mdm/grant-feature-access
 * Grant features/permissions to a user
 * 
 * Admin-only operation
 * 
 * Body: {
 *   targetId: string (user or role ID),
 *   targetType: 'user' | 'role',
 *   features: string[] (feature names),
 *   expiresAt: date (optional)
 * }
 */
exports.grantFeatureAccess = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only administrators can grant feature access'
      });
    }

    const { targetId, targetType, features, expiresAt } = req.body;

    if (!targetId || !targetType || !features || !Array.isArray(features) || features.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request: targetId, targetType, and features array required'
      });
    }

    const normalizedFeatures = features
      .filter(Boolean)
      .map((feature) => String(feature).trim().toLowerCase());

    if (targetType === 'user') {
      const user = await User.findById(targetId);
      if (user) {
        user.permissions = normalizedFeatures;
        await user.save();
      }
    }

    // Create feature access record in MasterData
    const featureAccess = new MasterData({
      type: 'feature_access',
      name: `Feature Access - ${targetType}:${targetId}`,
      code: `FA_${targetType.toUpperCase()}_${targetId.substring(0, 8)}_${Date.now()}`,
      description: `Granted features: ${normalizedFeatures.join(', ')}`,
      features: normalizedFeatures,
      metadata: {
        targetId,
        targetType,
        features: normalizedFeatures,
        grantedBy: req.user.id,
        grantedAt: new Date(),
        expiresAt: expiresAt || null
      },
      isActive: true,
      createdBy: req.user.id,
      updatedBy: req.user.id
    });

    await featureAccess.save();

    res.status(201).json({
      success: true,
      message: 'Feature access granted successfully',
      data: featureAccess
    });
  } catch (error) {
    console.error('Error in grantFeatureAccess:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * GET /api/mdm/user-features/:userId
 * Get all features accessible by a user
 */
exports.getUserFeatures = async (req, res) => {
  try {
    const { userId } = req.params;

    const [user, features] = await Promise.all([
      User.findById(userId).select('permissions').lean(),
      MasterData.find({
        type: 'feature_access',
        isActive: true,
        $or: [
          { 'metadata.targetId': userId },
          { userId }
        ]
      }).sort({ 'metadata.grantedAt': -1, grantedAt: -1 })
    ]);

    const combinedFeatures = Array.from(new Set([
      ...(user?.permissions || []),
      ...features.flatMap((f) => f.metadata?.features || f.features || [])
    ])).map((feature) => String(feature).trim().toLowerCase()).filter(Boolean);

    res.status(200).json({
      success: true,
      data: features.map(f => ({
        _id: f._id,
        features: f.metadata?.features || f.features || [],
        grantedAt: f.metadata?.grantedAt || f.grantedAt,
        expiresAt: f.metadata?.expiresAt || f.expiresAt
      })),
      features: combinedFeatures
    });
  } catch (error) {
    console.error('Error in getUserFeatures:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * DELETE /api/mdm/revoke-feature-access/:accessId
 * Revoke feature access
 * 
 * Admin-only operation
 */
exports.revokeFeatureAccess = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only administrators can revoke feature access'
      });
    }

    const { accessId } = req.params;

    const result = await MasterData.findByIdAndUpdate(
      accessId,
      {
        isActive: false,
        'metadata.revokedBy': req.user.id,
        'metadata.revokedAt': new Date()
      },
      { new: true }
    );

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Feature access record not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Feature access revoked successfully',
      data: result
    });
  } catch (error) {
    console.error('Error in revokeFeatureAccess:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
