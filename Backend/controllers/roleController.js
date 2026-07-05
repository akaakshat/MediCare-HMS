// controllers/roleController.js
// Controller for Role management operations

const MasterData = require('../models/MasterData');
const RolePermission = require('../models/RolePermission');

/**
 * GET /roles
 * Get all roles
 */
exports.getAllRoles = async (req, res) => {
  try {
    const { activeOnly = true, page = 1, limit = 100, search = '' } = req.query;

    const filter = { type: 'role' };
    if (activeOnly === 'true' || activeOnly === true) {
      filter.isActive = true;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await MasterData.countDocuments(filter);
    const roles = await MasterData.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    // Fetch permissions for each role
    const rolesWithPermissions = await Promise.all(
      roles.map(async (role) => {
        const rolePermissions = await RolePermission.find({ roleId: role._id, isActive: true })
          .select('permissionId')
          .exec();

        return {
          ...role.toObject(),
          permissions: rolePermissions.map(rp => rp.permissionId)
        };
      })
    );

    res.status(200).json({
      success: true,
      data: rolesWithPermissions,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error in getAllRoles:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * POST /roles
 * Create a new role
 */
exports.createRole = async (req, res) => {
  try {
    const { name, code, description, isActive = true } = req.body;

    if (!name || !code) {
      return res.status(400).json({
        success: false,
        message: 'Role name and code are required'
      });
    }

    // Check if role with same code already exists
    const existingRole = await MasterData.findOne({
      type: 'role',
      code: code.toUpperCase()
    });

    if (existingRole) {
      return res.status(400).json({
        success: false,
        message: 'Role with this code already exists'
      });
    }

    const newRole = new MasterData({
      type: 'role',
      name,
      code: code.toUpperCase(),
      description: description || '',
      isActive,
      metadata: {
        createdBy: req.user?.id || 'system',
        createdAt: new Date()
      }
    });

    await newRole.save();

    res.status(201).json({
      success: true,
      message: 'Role created successfully',
      data: newRole
    });
  } catch (error) {
    console.error('Error in createRole:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * GET /roles/:id
 * Get a specific role with its permissions
 */
exports.getRoleById = async (req, res) => {
  try {
    const { id } = req.params;

    const role = await MasterData.findOne({
      _id: id,
      type: 'role'
    });

    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found'
      });
    }

    // Fetch permissions for this role
    const rolePermissions = await RolePermission.find({ roleId: id, isActive: true })
      .select('permissionId')
      .exec();

    res.status(200).json({
      success: true,
      data: {
        ...role.toObject(),
        permissions: rolePermissions.map(rp => rp.permissionId)
      }
    });
  } catch (error) {
    console.error('Error in getRoleById:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * PUT /roles/:id
 * Update a role
 */
exports.updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, description, isActive } = req.body;

    const role = await MasterData.findOne({
      _id: id,
      type: 'role'
    });

    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found'
      });
    }

    // Check if code already exists for another role
    if (code && code !== role.code) {
      const existingRole = await MasterData.findOne({
        type: 'role',
        code: code.toUpperCase(),
        _id: { $ne: id }
      });

      if (existingRole) {
        return res.status(400).json({
          success: false,
          message: 'Role with this code already exists'
        });
      }
    }

    if (name) role.name = name;
    if (code) role.code = code.toUpperCase();
    if (description !== undefined) role.description = description;
    if (isActive !== undefined) role.isActive = isActive;

    role.metadata = {
      ...role.metadata,
      updatedBy: req.user?.id || 'system',
      updatedAt: new Date()
    };

    await role.save();

    res.status(200).json({
      success: true,
      message: 'Role updated successfully',
      data: role
    });
  } catch (error) {
    console.error('Error in updateRole:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * DELETE /roles/:id
 * Delete a role
 */
exports.deleteRole = async (req, res) => {
  try {
    const { id } = req.params;

    const role = await MasterData.findOne({
      _id: id,
      type: 'role'
    });

    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found'
      });
    }

    // Soft delete by setting isActive to false
    role.isActive = false;
    role.metadata = {
      ...role.metadata,
      deletedBy: req.user?.id || 'system',
      deletedAt: new Date()
    };

    await role.save();

    // Also deactivate role permissions
    await RolePermission.updateMany(
      { roleId: id },
      { isActive: false }
    );

    res.status(200).json({
      success: true,
      message: 'Role deleted successfully'
    });
  } catch (error) {
    console.error('Error in deleteRole:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * PUT /roles/:id/permissions
 * Update permissions for a role
 */
exports.updateRolePermissions = async (req, res) => {
  try {
    const { id } = req.params;
    const { permissionIds = [] } = req.body;

    // Verify role exists
    const role = await MasterData.findOne({
      _id: id,
      type: 'role'
    });

    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found'
      });
    }

    // Remove all existing permissions
    await RolePermission.deleteMany({ roleId: id });

    // Add new permissions
    if (permissionIds.length > 0) {
      const permissions = permissionIds.map(permissionId => ({
        roleId: id,
        permissionId,
        isActive: true
      }));

      await RolePermission.insertMany(permissions);
    }

    res.status(200).json({
      success: true,
      message: 'Role permissions updated successfully',
      data: {
        roleId: id,
        permissionCount: permissionIds.length
      }
    });
  } catch (error) {
    console.error('Error in updateRolePermissions:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * GET /roles/:id/permissions
 * Get all permissions for a role
 */
exports.getRolePermissions = async (req, res) => {
  try {
    const { id } = req.params;

    const rolePermissions = await RolePermission.find({ roleId: id, isActive: true })
      .select('permissionId')
      .exec();

    res.status(200).json({
      success: true,
      data: rolePermissions.map(rp => rp.permissionId)
    });
  } catch (error) {
    console.error('Error in getRolePermissions:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
