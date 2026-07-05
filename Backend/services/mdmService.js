// services/mdmService.js
// Service layer for MDM business logic

const mdmRepository = require('../repositories/mdmRepository');
const mdmCache = require('../utils/mdmCache');
const excelHandler = require('../utils/excelHandler');

class MDMService {
  /**
   * Get master data by type (with caching)
   * @param {String} type - Master data type
   * @param {Boolean} activeOnly - Only get active records
   * @param {Object} options - Query options
   * @returns {Object} Master data with pagination
   */
  async getMasterDataByType(type, activeOnly = true, options = {}) {
    // For simple queries without pagination/search, use cache
    if (!options.search && (!options.page || options.page === 1) && (!options.limit || options.limit === 100)) {
      const cached = mdmCache.get(type, activeOnly);
      if (cached) {
        return {
          data: cached,
          fromCache: true
        };
      }
    }

    const result = await mdmRepository.getByType(type, activeOnly, options);

    // Cache the result for simple requests
    if (!options.search && (!options.page || options.page === 1)) {
      mdmCache.set(type, result.data, activeOnly);
    }

    return result;
  }

  /**
   * Get master data by ID
   * @param {String} id - Master data ID
   * @returns {Object} Master data record
   */
  async getMasterDataById(id) {
    return await mdmRepository.getById(id);
  }

  /**
   * Get master data by code
   * @param {String} type - Master data type
   * @param {String} code - Master data code
   * @returns {Object} Master data record
   */
  async getMasterDataByCode(type, code) {
    return await mdmRepository.getByCode(type, code);
  }

  /**
   * Create master data
   * @param {Object} masterData - Master data object
   * @returns {Object} Created record
   */
  async createMasterData(masterData) {
    const created = await mdmRepository.create(masterData);
    
    // Invalidate cache
    mdmCache.invalidate(masterData.type);

    return created;
  }

  /**
   * Update master data
   * @param {String} id - Master data ID
   * @param {Object} updateData - Data to update
   * @returns {Object} Updated record
   */
  async updateMasterData(id, updateData) {
    const existing = await mdmRepository.getById(id);
    const updated = await mdmRepository.update(id, updateData);

    // Invalidate cache
    mdmCache.invalidate(existing.type);

    return updated;
  }

  /**
   * Delete master data (soft delete)
   * @param {String} id - Master data ID
   * @returns {Object} Deleted record
   */
  async deleteMasterData(id) {
    const existing = await mdmRepository.getById(id);
    const deleted = await mdmRepository.softDelete(id);

    // Invalidate cache
    mdmCache.invalidate(existing.type);

    return deleted;
  }

  /**
   * Handle Excel file import
   * @param {File} file - Uploaded Excel file
   * @param {String} type - Master data type
   * @param {Object} userId - User ID for audit
   * @returns {Object} { inserted, updated, errors, summary }
   */
  async handleExcelImport(file, type, userId) {
    const rows = excelHandler.parseExcelFile(file);

    if (rows.length === 0) {
      throw new Error('Excel file contains no data');
    }

    if (type === 'role_permission_mapping') {
      const { validRows, invalidRows } = excelHandler.validateRolePermissionRows(rows);

      if (invalidRows.length > 0 && validRows.length === 0) {
        throw new Error('No valid rows found in Excel file');
      }

      const upsertResult = await mdmRepository.bulkUpsertRolePermissions(validRows, userId);

      // Invalidate cache for role/permission mappings if needed
      mdmCache.invalidate('role');
      mdmCache.invalidate('permission');
      mdmCache.invalidate('role_permission_mapping');

      return {
        ...upsertResult,
        validationErrors: invalidRows,
        summary: {
          totalRows: rows.length,
          validRows: validRows.length,
          invalidRows: invalidRows.length,
          inserted: upsertResult.inserted.length,
          updated: upsertResult.updated.length,
          errors: upsertResult.errors.length
        }
      };
    }

    // Parse and validate standard master data rows
    const { validRows, invalidRows } = excelHandler.validateRows(rows);

    if (invalidRows.length > 0 && validRows.length === 0) {
      throw new Error('No valid rows found in Excel file');
    }

    const recordsToUpsert = validRows.map(row => ({
      ...row,
      type,
      createdBy: userId,
      updatedBy: userId
    }));

    const upsertResult = await mdmRepository.bulkUpsert(type, recordsToUpsert);
    mdmCache.invalidate(type);

    return {
      ...upsertResult,
      validationErrors: invalidRows,
      summary: {
        totalRows: rows.length,
        validRows: validRows.length,
        invalidRows: invalidRows.length,
        inserted: upsertResult.inserted.length,
        updated: upsertResult.updated.length,
        errors: upsertResult.errors.length
      }
    };
  }

  /**
   * Export master data to Excel
   * @param {String} type - Master data type
   * @param {Boolean} activeOnly - Export only active records
   * @returns {String} File path
   */
  async exportToExcel(type, activeOnly = true) {
    let exportData = [];

    if (type === 'role_permission_mapping') {
      const records = await this.getRolePermissions(null, activeOnly);
      exportData = records.map((record) => ({
        roleName: record.roleId?.name || '',
        roleCode: record.roleId?.code || '',
        permissionName: record.permissionId?.name || '',
        permissionCode: record.permissionId?.code || '',
        description: record.description || '',
        isActive: record.isActive,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt
      }));
    } else {
      const result = await mdmRepository.getByType(type, activeOnly, { limit: 10000 });

      exportData = result.data.map(record => ({
        name: record.name,
        code: record.code,
        description: record.description,
        isActive: record.isActive,
        displayOrder: record.displayOrder,
        metadata: JSON.stringify(record.metadata || {}),
        createdAt: record.createdAt,
        updatedAt: record.updatedAt
      }));
    }

    const workbook = excelHandler.convertToExcel(exportData, type);
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `${type}_export_${timestamp}.xlsx`;
    const filepath = excelHandler.saveExcelFile(workbook, filename);

    return {
      filename,
      filepath,
      recordCount: exportData.length
    };
  }

  /**
   * Generate template for bulk import
   * @param {String} type - Master data type
   * @returns {String} File path
   */
  async generateTemplate(type) {
    const workbook = excelHandler.generateTemplate(type);
    
    const filename = `${type}_template.xlsx`;
    const filepath = excelHandler.saveExcelFile(workbook, filename);

    return {
      filename,
      filepath
    };
  }

  /**
   * Get role permissions
   * @param {String} roleId - Role ID (optional)
   * @returns {Array} Role-permission mappings
   */
  async getRolePermissions(roleId = null) {
    return await mdmRepository.getRolePermissions(roleId);
  }

  /**
   * Create role-permission mapping
   * @param {String} roleId - Role ID
   * @param {String} permissionId - Permission ID
   * @returns {Object} Created mapping
   */
  async createRolePermission(roleId, permissionId) {
    const mapping = await mdmRepository.createRolePermission(roleId, permissionId);

    // Invalidate cache for roles
    mdmCache.invalidate('role');
    mdmCache.invalidate('permission');

    return mapping;
  }

  /**
   * Delete role-permission mapping
   * @param {String} mappingId - Mapping ID
   * @returns {Object} Deleted mapping
   */
  async deleteRolePermission(mappingId) {
    const deleted = await mdmRepository.deleteRolePermission(mappingId);

    // Invalidate cache
    mdmCache.invalidate('role');
    mdmCache.invalidate('permission');

    return deleted;
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache stats
   */
  getCacheStats() {
    return mdmCache.getStats();
  }

  /**
   * Clear cache
   * @param {String} type - Specific type to clear (optional)
   */
  clearCache(type = null) {
    if (type) {
      mdmCache.invalidate(type);
    } else {
      mdmCache.invalidateAll();
    }
  }
}

module.exports = new MDMService();
