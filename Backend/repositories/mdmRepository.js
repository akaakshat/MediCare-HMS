// repositories/mdmRepository.js
// Repository for MDM operations

const MasterData = require('../models/MasterData');
const RolePermission = require('../models/RolePermission');

class MDMRepository {
  /**
   * Get all master data of a specific type
   * @param {String} type - Master data type
   * @param {Boolean} activeOnly - Only get active records
   * @param {Object} options - Query options (pagination, sort, etc.)
   * @returns {Object} { data, total, page, limit }
   */
  async getByType(type, activeOnly = true, options = {}) {
    const { page = 1, limit = 100, search = '' } = options;
    const skip = (page - 1) * limit;

    let query = { type };
    if (activeOnly) {
      query.isActive = true;
    }

    // Add search filter if provided
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } }
      ];
    }

    try {
      const data = await MasterData.find(query)
        .sort({ displayOrder: 1, name: 1 })
        .skip(skip)
        .limit(limit)
        .lean();

      const total = await MasterData.countDocuments(query);

      return {
        data,
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      };
    } catch (error) {
      throw new Error(`Error fetching master data: ${error.message}`);
    }
  }

  /**
   * Get master data by ID
   * @param {String} id - Master data ID
   * @returns {Object} Master data record
   */
  async getById(id) {
    try {
      const data = await MasterData.findById(id).lean();
      if (!data) {
        throw new Error('Master data not found');
      }
      return data;
    } catch (error) {
      throw new Error(`Error fetching master data: ${error.message}`);
    }
  }

  /**
   * Get master data by code
   * @param {String} type - Master data type
   * @param {String} code - Master data code
   * @returns {Object} Master data record
   */
  async getByCode(type, code) {
    try {
      const data = await MasterData.findOne({ 
        type, 
        code: code.toUpperCase() 
      }).lean();
      return data || null;
    } catch (error) {
      throw new Error(`Error fetching master data: ${error.message}`);
    }
  }

  /**
   * Create new master data
   * @param {Object} masterData - Master data object
   * @returns {Object} Created master data record
   */
  async create(masterData) {
    try {
      // Validate required fields
      if (!masterData.type || !masterData.name || !masterData.code) {
        throw new Error('Missing required fields: type, name, code');
      }

      // Check for duplicate code
      const existing = await MasterData.findOne({
        type: masterData.type,
        code: masterData.code.toUpperCase()
      });

      if (existing) {
        throw new Error(`Code '${masterData.code}' already exists for this type`);
      }

      masterData.code = masterData.code.toUpperCase();
      masterData.name = masterData.name.trim();

      const newMasterData = new MasterData(masterData);
      await newMasterData.save();

      return newMasterData.toObject();
    } catch (error) {
      throw new Error(`Error creating master data: ${error.message}`);
    }
  }

  /**
   * Update master data by ID
   * @param {String} id - Master data ID
   * @param {Object} updateData - Data to update
   * @returns {Object} Updated master data record
   */
  async update(id, updateData) {
    try {
      // Prevent type changes
      delete updateData.type;

      const existingMaster = await MasterData.findById(id).lean();
      if (!existingMaster) {
        throw new Error('Master data not found');
      }

      if (updateData.code) {
        const normalizedCode = String(updateData.code).trim().toUpperCase();
        const duplicate = await MasterData.findOne({
          type: existingMaster.type,
          code: normalizedCode,
          _id: { $ne: id }
        });
        if (duplicate) {
          throw new Error(`Code '${normalizedCode}' already exists for this type`);
        }
        updateData.code = normalizedCode;
      }
      if (updateData.name) {
        updateData.name = updateData.name.trim();
      }

      const updated = await MasterData.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true, runValidators: true }
      );

      if (!updated) {
        throw new Error('Master data not found');
      }

      return updated.toObject();
    } catch (error) {
      throw new Error(`Error updating master data: ${error.message}`);
    }
  }

  /**
   * Soft delete master data (set isActive to false)
   * @param {String} id - Master data ID
   * @returns {Object} Deleted master data record
   */
  async softDelete(id) {
    try {
      const deleted = await MasterData.findByIdAndUpdate(
        id,
        { $set: { isActive: false } },
        { new: true }
      );

      if (!deleted) {
        throw new Error('Master data not found');
      }

      return deleted.toObject();
    } catch (error) {
      throw new Error(`Error deleting master data: ${error.message}`);
    }
  }

  /**
   * Bulk upsert master data
   * @param {String} type - Master data type
   * @param {Array} records - Array of records to upsert
   * @returns {Object} { inserted, updated, errors }
   */
  async bulkUpsert(type, records) {
    const results = {
      inserted: [],
      updated: [],
      errors: [],
      total: records.length
    };

    if (!Array.isArray(records) || records.length === 0) {
      return results;
    }

    const normalizedRecords = [];
    const seenCodes = new Set();

    records.forEach((record, index) => {
      const errors = [];
      const code = record.code ? String(record.code).trim().toUpperCase() : '';
      const name = record.name ? String(record.name).trim() : '';

      if (!name || !code) {
        errors.push('Missing required fields: name, code');
      }
      if (!code) {
        errors.push('Invalid code value');
      }
      if (code && seenCodes.has(code)) {
        errors.push(`Duplicate code in batch: ${code}`);
      }

      if (errors.length > 0) {
        results.errors.push({ rowNumber: index + 2, record, errors });
        return;
      }

      seenCodes.add(code);
      normalizedRecords.push({
        ...record,
        code,
        name,
        description: record.description ? String(record.description).trim() : '',
        metadata: record.metadata || {},
        displayOrder: Number.isInteger(record.displayOrder) ? record.displayOrder : Number(record.displayOrder) || 0,
        isActive: record.isActive !== false
      });
    });

    if (normalizedRecords.length === 0) {
      return results;
    }

    const codes = normalizedRecords.map((row) => row.code);
    const existingDocs = await MasterData.find({ type, code: { $in: codes } }).lean();
    const existingByCode = new Map(existingDocs.map((doc) => [doc.code, doc]));

    const operations = normalizedRecords.map((record) => {
      const doc = {
        type,
        code: record.code,
        name: record.name,
        description: record.description,
        metadata: record.metadata,
        displayOrder: record.displayOrder,
        isActive: record.isActive,
        updatedAt: new Date()
      };

      if (existingByCode.has(record.code)) {
        return {
          updateOne: {
            filter: { _id: existingByCode.get(record.code)._id },
            update: { $set: doc }
          }
        };
      }

      return {
        insertOne: {
          document: { ...doc, createdAt: new Date() }
        }
      };
    });

    if (operations.length > 0) {
      try {
        await MasterData.bulkWrite(operations, { ordered: false });
      } catch (bulkError) {
        if (bulkError && bulkError.writeErrors) {
          bulkError.writeErrors.forEach((writeErr) => {
            results.errors.push({ record: records[writeErr.index], error: writeErr.errmsg || writeErr.message });
          });
        } else {
          results.errors.push({ error: bulkError.message || 'Bulk write error' });
        }
      }
    }

    const finalDocs = await MasterData.find({ type, code: { $in: codes } }).lean();
    const finalByCode = new Map(finalDocs.map((doc) => [doc.code, doc]));

    finalDocs.forEach((doc) => {
      if (existingByCode.has(doc.code)) {
        results.updated.push(doc);
      } else {
        results.inserted.push(doc);
      }
    });

    return results;
  }

  /**
   * Get role-permission mappings
   * @param {String} roleId - Role ID (optional, if not provided returns all)
   * @returns {Array} Role-permission mappings
   */
  async getRolePermissions(roleId = null, activeOnly = true) {
    try {
      let query = {};
      if (activeOnly) {
        query.isActive = true;
      }
      if (roleId) {
        query.roleId = roleId;
      }

      const mappings = await RolePermission.find(query)
        .populate('roleId', 'name code')
        .populate('permissionId', 'name code')
        .lean();

      return mappings;
    } catch (error) {
      throw new Error(`Error fetching role permissions: ${error.message}`);
    }
  }

  /**
   * Bulk upsert role-permission mappings using roleCode and permissionCode
   * @param {Array} rows - Rows containing roleCode and permissionCode
   * @param {String} userId - User who performed the import
   * @returns {Object} { inserted, updated, errors }
   */
  async bulkUpsertRolePermissions(rows, userId) {
    const results = {
      inserted: [],
      updated: [],
      errors: [],
      total: rows.length
    };

    if (!Array.isArray(rows) || rows.length === 0) {
      return results;
    }

    const roleCodes = rows.map((row) => row.roleCode);
    const permissionCodes = rows.map((row) => row.permissionCode);

    const [roles, permissions] = await Promise.all([
      MasterData.find({ type: 'role', code: { $in: roleCodes } }).lean(),
      MasterData.find({ type: 'permission', code: { $in: permissionCodes } }).lean()
    ]);

    const rolesByCode = new Map(roles.map((role) => [role.code, role]));
    const permissionsByCode = new Map(permissions.map((perm) => [perm.code, perm]));

    const validRecords = [];

    rows.forEach((row, index) => {
      const role = rolesByCode.get(row.roleCode);
      const permission = permissionsByCode.get(row.permissionCode);

      if (!role || !permission) {
        const errors = [];
        if (!role) errors.push(`Unknown role code: ${row.roleCode}`);
        if (!permission) errors.push(`Unknown permission code: ${row.permissionCode}`);
        results.errors.push({ rowNumber: index + 2, record: row, errors });
        return;
      }

      validRecords.push({
        roleId: role._id,
        permissionId: permission._id,
        description: row.description || '',
        isActive: row.isActive !== false,
        createdBy: userId,
        updatedBy: userId
      });
    });

    if (validRecords.length === 0) {
      return results;
    }

    const roleIds = validRecords.map((row) => row.roleId);
    const permissionIds = validRecords.map((row) => row.permissionId);
    const existingMappings = await RolePermission.find({
      roleId: { $in: roleIds },
      permissionId: { $in: permissionIds }
    }).lean();

    const existingMap = new Map(
      existingMappings.map((mapping) => [`${mapping.roleId.toString()}|${mapping.permissionId.toString()}`, mapping])
    );

    const operations = validRecords.map((record) => {
      const key = `${record.roleId.toString()}|${record.permissionId.toString()}`;
      if (existingMap.has(key)) {
        return {
          updateOne: {
            filter: { _id: existingMap.get(key)._id },
            update: {
              $set: {
                description: record.description,
                isActive: record.isActive,
                updatedBy: userId,
                updatedAt: new Date()
              }
            }
          }
        };
      }

      return {
        insertOne: {
          document: {
            roleId: record.roleId,
            permissionId: record.permissionId,
            description: record.description,
            isActive: record.isActive,
            createdBy: userId,
            updatedBy: userId,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        }
      };
    });

    if (operations.length > 0) {
      try {
        await RolePermission.bulkWrite(operations, { ordered: false });
      } catch (bulkError) {
        if (bulkError && bulkError.writeErrors) {
          bulkError.writeErrors.forEach((writeErr) => {
            results.errors.push({ record: rows[writeErr.index], error: writeErr.errmsg || writeErr.message });
          });
        } else {
          results.errors.push({ error: bulkError.message || 'Bulk write error' });
        }
      }
    }

    const finalMappings = await RolePermission.find({
      roleId: { $in: roleIds },
      permissionId: { $in: permissionIds }
    }).lean();

    finalMappings.forEach((mapping) => {
      const key = `${mapping.roleId.toString()}|${mapping.permissionId.toString()}`;
      if (existingMap.has(key)) {
        results.updated.push(mapping);
      } else {
        results.inserted.push(mapping);
      }
    });

    return results;
  }

  /**
   * Create role-permission mapping
   * @param {String} roleId - Role ID
   * @param {String} permissionId - Permission ID
   * @returns {Object} Created mapping
   */
  async createRolePermission(roleId, permissionId) {
    try {
      // Check for duplicate
      const existing = await RolePermission.findOne({ roleId, permissionId });
      if (existing) {
        throw new Error('This role-permission mapping already exists');
      }

      const mapping = new RolePermission({
        roleId,
        permissionId
      });

      await mapping.save();
      return mapping.toObject();
    } catch (error) {
      throw new Error(`Error creating role permission: ${error.message}`);
    }
  }

  /**
   * Delete role-permission mapping
   * @param {String} mappingId - Mapping ID
   * @returns {Object} Deleted mapping
   */
  async deleteRolePermission(mappingId) {
    try {
      const deleted = await RolePermission.findByIdAndUpdate(
        mappingId,
        { $set: { isActive: false } },
        { new: true }
      );

      if (!deleted) {
        throw new Error('Role permission mapping not found');
      }

      return deleted.toObject();
    } catch (error) {
      throw new Error(`Error deleting role permission: ${error.message}`);
    }
  }

  /**
   * Check if code exists (for validation)
   * @param {String} type - Master data type
   * @param {String} code - Code to check
   * @param {String} excludeId - Exclude specific ID (for updates)
   * @returns {Boolean}
   */
  async codeExists(type, code, excludeId = null) {
    try {
      let query = { type, code: code.toUpperCase() };
      if (excludeId) {
        query._id = { $ne: excludeId };
      }

      const count = await MasterData.countDocuments(query);
      return count > 0;
    } catch (error) {
      throw new Error(`Error checking code: ${error.message}`);
    }
  }
}

module.exports = new MDMRepository();
