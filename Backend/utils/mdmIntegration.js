// utils/mdmIntegration.js
// Utilities to help integrate MDM with existing modules

const mdmRepository = require('../repositories/mdmRepository');
const mdmCache = require('./mdmCache');

/**
 * Get master data value by code (useful for lookups in controllers)
 * @param {String} type - Master data type
 * @param {String} code - Master data code
 * @returns {Object} Master data record
 */
async function getMasterByCode(type, code) {
  try {
    return await mdmRepository.getByCode(type, code);
  } catch (error) {
    console.error(`Error fetching master data type: ${type}, code: ${code}`, error);
    return null;
  }
}

/**
 * Get master data by ID (with caching)
 * @param {String} id - Master data ID
 * @returns {Object} Master data record
 */
async function getMasterById(id) {
  try {
    // Note: Simple caching per ID can be implemented here if needed
    return await mdmRepository.getById(id);
  } catch (error) {
    console.error(`Error fetching master data ID: ${id}`, error);
    return null;
  }
}

/**
 * Get all values of a type (for dropdowns)
 * Useful for frontend to fetch dropdown options
 * @param {String} type - Master data type
 * @returns {Array} Array of { _id, name, code }
 */
async function getDropdownOptions(type) {
  try {
    // Check cache first
    const cached = mdmCache.get(type, true);
    if (cached) {
      return cached.map(item => ({
        _id: item._id,
        name: item.name,
        code: item.code
      }));
    }

    // Fetch from DB
    const result = await mdmRepository.getByType(type, true, { limit: 1000 });
    const options = result.data.map(item => ({
      _id: item._id,
      name: item.name,
      code: item.code
    }));

    // Cache it
    mdmCache.set(type, result.data, true);

    return options;
  } catch (error) {
    console.error(`Error fetching options for type: ${type}`, error);
    return [];
  }
}

/**
 * Validate that a value is a valid master data ID
 * @param {String} type - Master data type
 * @param {String} id - Master data ID
 * @returns {Boolean}
 */
async function validateMasterId(type, id) {
  try {
    const data = await mdmRepository.getById(id);
    return data && data.type === type && data.isActive;
  } catch (error) {
    return false;
  }
}

/**
 * Get role permissions for a specific role
 * @param {String} roleId - Role ID
 * @returns {Array} Array of permission objects
 */
async function getRolePermissions(roleId) {
  try {
    return await mdmRepository.getRolePermissions(roleId);
  } catch (error) {
    console.error(`Error fetching permissions for role: ${roleId}`, error);
    return [];
  }
}

/**
 * Check if user has permission
 * @param {String} roleId - User's role ID
 * @param {String} permissionCode - Permission code to check
 * @returns {Boolean}
 */
async function hasPermission(roleId, permissionCode) {
  try {
    const permissions = await getRolePermissions(roleId);
    return permissions.some(p => p.permissionId.code === permissionCode);
  } catch (error) {
    console.error('Error checking permission', error);
    return false;
  }
}

/**
 * Get all active values of a type (simplified, no pagination)
 * @param {String} type - Master data type
 * @param {Boolean} useCache - Use cache (default true)
 * @returns {Array} Array of master data records
 */
async function getActiveValues(type, useCache = true) {
  try {
    if (useCache) {
      const cached = mdmCache.get(type, true);
      if (cached) return cached;
    }

    const result = await mdmRepository.getByType(type, true, { limit: 1000 });
    
    if (useCache) {
      mdmCache.set(type, result.data, true);
    }

    return result.data;
  } catch (error) {
    console.error(`Error fetching active values for type: ${type}`, error);
    return [];
  }
}

module.exports = {
  getMasterByCode,
  getMasterById,
  getDropdownOptions,
  validateMasterId,
  getRolePermissions,
  hasPermission,
  getActiveValues
};
