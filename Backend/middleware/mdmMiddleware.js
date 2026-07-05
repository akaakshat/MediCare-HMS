// middleware/mdmMiddleware.js
// Middleware for MDM operations

const multer = require('multer');
const path = require('path');

/**
 * Authorization middleware - only admin users can modify master data
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden: Only administrators can modify master data' });
  }

  next();
};

/**
 * Authorization middleware - admin can view/modify, others can only view
 */
const mdmAuthRestrictions = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }

  // All authenticated users can GET (view) master data
  if (req.method === 'GET') {
    return next();
  }

  // Only admins can POST, PUT, DELETE (modify) master data
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden: Only administrators can modify master data' });
  }

  next();
};

/**
 * Multer configuration for file uploads
 */
const uploadDir = path.join(__dirname, '../uploads/temp');

// Create uploads directory if it doesn't exist
const fs = require('fs');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.memoryStorage(); // Store in memory for processing

const fileFilter = (req, file, cb) => {
  // Accept only Excel and CSV files
  const allowedMimes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'text/csv', // .csv
    'application/csv'
  ];

  const allowedExtensions = ['.xlsx', '.xls', '.csv'];
  const fileExt = path.extname(file.originalname).toLowerCase();

  if (allowedMimes.includes(file.mimetype) || allowedExtensions.includes(fileExt)) {
    cb(null, true);
  } else {
    cb(new Error('Only Excel and CSV files are allowed'));
  }
};

const mdmUpload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10 MB limit
  }
});

/**
 * Error handling middleware for multer
 */
const handleMulterErrors = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'FILE_TOO_LARGE') {
      return res.status(400).json({ message: 'File size exceeds 10 MB limit' });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ message: 'Only one file allowed' });
    }
    return res.status(400).json({ message: `Upload error: ${error.message}` });
  }

  if (error && error.message) {
    return res.status(400).json({ message: error.message });
  }

  next();
};

/**
 * Validate master type parameter
 */
const validateMasterType = (req, res, next) => {
  const { type } = req.params;
  
  const validTypes = [
    // User & Access Control
    'role', 'permission', 'role_permission_mapping', 'user_status', 'feature_access',
    // Patient
    'gender', 'blood_group', 'marital_status', 'patient_type',
    // Doctor
    'department', 'specialization', 'qualification',
    // Appointment
    'appointment_status', 'visit_type', 'consultation_type',
    // Billing
    'payment_status', 'payment_method', 'invoice_type', 'tax_configuration',
    // Medical
    'icd_code', 'symptom', 'allergy', 'diagnosis_type', 'vital_type',
    // Pharmacy
    'medicine_master', 'medicine_category', 'dosage_form', 'unit', 'vendor'
  ];

  if (!validTypes.includes(type)) {
    const aliasMap = {
      feature: 'feature_access'
    };
    if (aliasMap[type]) {
      req.params.type = aliasMap[type];
      return next();
    }

    return res.status(400).json({ 
      message: `Invalid master type: ${type}`,
      validTypes: validTypes
    });
  }

  next();
};

module.exports = {
  requireAdmin,
  mdmAuthRestrictions,
  mdmUpload,
  handleMulterErrors,
  validateMasterType
};
