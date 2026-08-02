const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const MasterData = require('../models/MasterData');
const perms = require('../config/permissions');
const { getEffectivePermissions, getEffectivePermissionsForUser, getEffectiveFeatures, getEffectiveFeaturesForUser, normalizeStringArray } = require('../services/rbacService');

const validRoles = ['admin', 'doctor', 'nurse', 'receptionist', 'staff'];
const JWT_SECRET = process.env.JWT_SECRET || 'hospital-dev-secret-change-me';

const fetchUserFeatureAccess = async (userId) => {
  const [user, records] = await Promise.all([
    User.findById(userId).select('permissions').lean(),
    MasterData.find({
      type: 'feature_access',
      $or: [
        { 'metadata.targetId': userId },
        { userId },
      ],
      isActive: true
    })
  ]);

  const features = new Set();
  normalizeStringArray(user?.permissions || []).forEach((perm) => features.add(perm));

  records.forEach((record) => {
    if (record.metadata?.features && Array.isArray(record.metadata.features)) {
      normalizeStringArray(record.metadata.features).forEach((perm) => features.add(perm));
    }
    if (record.features && Array.isArray(record.features)) {
      normalizeStringArray(record.features).forEach((perm) => features.add(perm));
    }
  });

  return Array.from(features);
};

// Get all available features (for admin)
const getAllFeatures = () => {
  return [
    'patient_records',
    'prescriptions',
    'appointments',
    'billing',
    'patient_vitals',
    'lab_results',
    'care_plans',
    'medications',
    'patient_list',
    'reports',
    'appointment_view',
    'emr_view',
    'pharmacy_view',
    'billing_view',
    'icd_view',
    'patient_view'
  ];
};

const normalizeRole = (role) => {
  const value = (role || '').toString().toLowerCase();
  return validRoles.includes(value) ? value : 'receptionist';
};

// Get all available permissions from config
const getAllPermissions = () => {
  return Object.values(perms);
};

const generateToken = (user, permissions = getEffectivePermissions(user)) => {
  const role = normalizeRole(user.role);
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      name: user.name,
      role,
      permissions
    },
    JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    }
  );
};

exports.register = async (req, res) => {
  try {
    // Only admin users can register new users
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only administrators can register new users' });
    }

    const name = req.body.name?.toString().trim();
    const email = req.body.email?.toString().trim().toLowerCase();
    const password = req.body.password;
    const role = req.body.role;
    const phone = req.body.phone?.toString().trim() || '';

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
    }

    let user = await User.findOne({ email });

    if (user) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    const normalizedRole = normalizeRole(role);
    user = new User({ name, email, password, role: normalizedRole, phone });
    await user.save();
    const permissions = getEffectivePermissions(user);
    const token = generateToken(user, permissions);

    console.log(`Admin ${req.user.name} (${req.user.id}) registered new user: ${email} with role ${normalizedRole}`);

    res.status(201).json({
      success: true,
      message: 'User registered successfully by admin',
      token,
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        role: normalizedRole, 
        phone: user.phone,
        permissions: user.permissions || []
      }
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const email = req.body.email?.toString().trim().toLowerCase();
    const password = req.body.password;
    if (!email || !password) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const permissions = await getEffectivePermissionsForUser(user);
    const features = await getEffectiveFeaturesForUser(user);
    const token = generateToken(user, permissions);
    const normalizedRole = (user.role || '').toString().toLowerCase();
    const roleFeatures = (getEffectiveFeatures(user) || []).map((item) => String(item).trim().toLowerCase());

    await AuditLog.log(
      'LOGIN',
      user._id,
      { id: user._id, email: user.email, name: user.name, role: normalizedRole },
      'USER',
      user._id,
      null,
      `User login successful: ${user.email}`,
      req.ip,
      req.headers['user-agent'],
      null,
      true
    );

    res.json({
      success: true,
      token,
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        role: normalizedRole,
        permissions,
        features: [...new Set([...features, ...roleFeatures])]
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

exports.getSession = async (req, res) => {
  try {
    // Fetch fresh user data from database
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Get effective permissions and features based on user's role and any granted feature access records
    const permissions = await getEffectivePermissionsForUser(user);
    const features = await getEffectiveFeaturesForUser(user);
    const normalizedRole = (user.role || '').toString().toLowerCase();
    const roleFeatures = (getEffectiveFeatures(user) || []).map((item) => String(item).trim().toLowerCase());

    res.json({ 
      success: true, 
      user: {
        ...user.toObject(),
        role: normalizedRole,
        permissions,
        features: [...new Set([...features, ...roleFeatures])]
      }
    });
  } catch (error) {
    console.error('Error in getSession:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.bootstrapAdmin = async (req, res) => {
  try {
    const existing = await User.findOne({ email: 'admin@hospital.local' });
    if (existing) return res.status(400).json({ success: false, message: 'Admin user already exists' });

    const adminUser = new User({
      name: 'System Admin',
      email: 'admin@hospital.local',
      password: 'Admin@123456',
      role: 'admin'
    });
    await adminUser.save();

    const token = generateToken(adminUser);
    res.status(201).json({
      success: true,
      message: 'Admin user created successfully',
      token,
      user: { id: adminUser._id, name: adminUser.name, email: adminUser.email, role: adminUser.role }
    });
  } catch (err) {
    console.error('Bootstrap admin error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};
