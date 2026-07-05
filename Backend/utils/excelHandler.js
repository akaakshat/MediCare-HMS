// utils/excelHandler.js
// Utilities for handling Excel import/export

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

/**
 * Parse Excel/CSV file and extract data
 * @param {File} file - Uploaded file object (from multer)
 * @returns {Array} Array of parsed rows with headers as keys
 */
const parseExcelFile = (file) => {
  try {
    if (!file) {
      throw new Error('No file provided');
    }

    // Handle both buffer (if using memory storage) and path
    const buffer = file.buffer || fs.readFileSync(file.path);
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    
    // Get first sheet
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new Error('Excel file has no sheets');
    }

    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet);

    return rows;
  } catch (error) {
    throw new Error(`Excel parsing error: ${error.message}`);
  }
};

/**
 * Validate required fields in data rows
 * @param {Array} rows - Array of data rows
 * @param {Array} requiredFields - Required field names
 * @returns {Object} { validRows, invalidRows }
 */
const parseBooleanValue = (value) => {
  if (typeof value === 'boolean') return value;
  if (value === undefined || value === null) return true;
  const normalized = String(value).trim().toLowerCase();
  return ['false', '0', 'no', 'n'].includes(normalized) ? false : true;
};

const parseMetadataValue = (value) => {
  if (value === undefined || value === null || value === '') return {};
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(String(value));
  } catch {
    return { raw: String(value) };
  }
};

const parseNumberValue = (value) => {
  if (value === undefined || value === null || value === '') return 0;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const validateRows = (rows, requiredFields = ['name', 'code']) => {
  const validRows = [];
  const invalidRows = [];
  const seenCodes = new Set();

  rows.forEach((row, index) => {
    const errors = [];
    const codeValue = row.code;
    const normalizedCode = codeValue !== undefined && codeValue !== null
      ? String(codeValue).trim().toUpperCase()
      : '';

    // Check required fields
    requiredFields.forEach(field => {
      if (row[field] === undefined || row[field] === null || String(row[field]).trim() === '') {
        errors.push(`Missing required field: ${field}`);
      }
    });

    // Check for duplicate codes in current batch
    if (normalizedCode && seenCodes.has(normalizedCode)) {
      errors.push(`Duplicate code in file: ${normalizedCode}`);
    }

    if (!normalizedCode) {
      errors.push('Code field is empty or invalid');
    }

    if (errors.length > 0) {
      invalidRows.push({
        rowNumber: index + 2,
        data: row,
        errors
      });
      return;
    }

    seenCodes.add(normalizedCode);

    validRows.push({
      ...row,
      code: normalizedCode,
      name: String(row.name).trim(),
      description: row.description ? String(row.description).trim() : '',
      isActive: parseBooleanValue(row.isActive),
      displayOrder: parseNumberValue(row.displayOrder),
      metadata: parseMetadataValue(row.metadata)
    });
  });

  return { validRows, invalidRows };
};

const validateRolePermissionRows = (rows) => {
  const validRows = [];
  const invalidRows = [];
  const seenPairs = new Set();

  rows.forEach((row, index) => {
    const errors = [];
    const roleCode = row.roleCode !== undefined && row.roleCode !== null
      ? String(row.roleCode).trim().toUpperCase()
      : '';
    const permissionCode = row.permissionCode !== undefined && row.permissionCode !== null
      ? String(row.permissionCode).trim().toUpperCase()
      : '';
    const pairKey = `${roleCode}|${permissionCode}`;

    if (!roleCode) {
      errors.push('Missing required field: roleCode');
    }
    if (!permissionCode) {
      errors.push('Missing required field: permissionCode');
    }
    if (pairKey && seenPairs.has(pairKey)) {
      errors.push(`Duplicate role-permission pair in file: ${roleCode} / ${permissionCode}`);
    }

    if (errors.length > 0) {
      invalidRows.push({
        rowNumber: index + 2,
        data: row,
        errors
      });
      return;
    }

    seenPairs.add(pairKey);

    validRows.push({
      roleCode,
      permissionCode,
      description: row.description ? String(row.description).trim() : '',
      isActive: parseBooleanValue(row.isActive)
    });
  });

  return { validRows, invalidRows };
};

/**
 * Convert data to Excel workbook
 * @param {Array} data - Array of objects to convert
 * @param {String} sheetName - Name of the sheet
 * @returns {Workbook} XLSX workbook
 */
const convertToExcel = (data, sheetName = 'Master Data') => {
  if (!data || data.length === 0) {
    data = [{ name: '', code: '', description: '', isActive: true, displayOrder: 0, metadata: '{}' }];
  }

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Auto-adjust column widths
  const colWidths = [];
  if (data.length > 0) {
    Object.keys(data[0]).forEach(key => {
      colWidths.push({ wch: Math.max(key.length, 12) });
    });
  }
  worksheet['!cols'] = colWidths;

  return workbook;
};

/**
 * Save workbook to file and return file path
 * @param {Workbook} workbook - XLSX workbook
 * @param {String} filename - Filename to save
 * @returns {String} File path
 */
const saveExcelFile = (workbook, filename) => {
  const uploadsDir = path.join(__dirname, '../uploads/exports');
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const filepath = path.join(uploadsDir, filename);
  XLSX.writeFile(workbook, filepath);
  return filepath;
};

/**
 * Generate Excel template for bulk import
 * @param {String} masterType - Type of master data
 * @returns {Workbook} Template workbook
 */
const generateTemplate = (masterType) => {
  const templates = {
    'gender': {
      headers: ['name', 'code', 'description'],
      samples: [
        { name: 'Male', code: 'M', description: 'Male gender' },
        { name: 'Female', code: 'F', description: 'Female gender' },
        { name: 'Other', code: 'O', description: 'Other gender' }
      ]
    },
    'blood_group': {
      headers: ['name', 'code', 'description'],
      samples: [
        { name: 'A Positive', code: 'A+', description: 'Blood group A positive' },
        { name: 'B Negative', code: 'B-', description: 'Blood group B negative' },
        { name: 'O Positive', code: 'O+', description: 'Blood group O positive' }
      ]
    },
    'department': {
      headers: ['name', 'code', 'description'],
      samples: [
        { name: 'Cardiology', code: 'CARD', description: 'Heart and cardiovascular system' },
        { name: 'Orthopedology', code: 'ORTHO', description: 'Bones and joints' }
      ]
    },
    'appointment_status': {
      headers: ['name', 'code', 'description'],
      samples: [
        { name: 'Scheduled', code: 'SCHEDULED', description: 'Appointment scheduled' },
        { name: 'Completed', code: 'COMPLETED', description: 'Appointment completed' },
        { name: 'Cancelled', code: 'CANCELLED', description: 'Appointment cancelled' }
      ]
    },
    'payment_method': {
      headers: ['name', 'code', 'description'],
      samples: [
        { name: 'Cash', code: 'CASH', description: 'Cash payment' },
        { name: 'Card', code: 'CARD', description: 'Credit/Debit card' },
        { name: 'Online', code: 'ONLINE', description: 'Online transfer' }
      ]
    },
    'role_permission_mapping': {
      headers: ['roleCode', 'permissionCode', 'description', 'isActive'],
      samples: [
        { roleCode: 'ADMIN', permissionCode: 'MANAGE_USERS', description: 'Admin can manage users', isActive: true },
        { roleCode: 'DOCTOR', permissionCode: 'VIEW_EMR', description: 'Doctor can view EMR', isActive: true }
      ]
    }
  };

  const template = templates[masterType] || {
    headers: ['name', 'code', 'description', 'metadata'],
    samples: [
      { name: 'Sample 1', code: 'SAMPLE1', description: 'Sample description', metadata: '{}' }
    ]
  };

  const worksheetData = template.samples;
  const worksheet = XLSX.utils.json_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, masterType);

  worksheet['!cols'] = [
    { wch: 30 },
    { wch: 20 },
    { wch: 40 },
    { wch: 30 }
  ];

  return workbook;
};

module.exports = {
  parseExcelFile,
  validateRows,
  convertToExcel,
  saveExcelFile,
  generateTemplate
};
