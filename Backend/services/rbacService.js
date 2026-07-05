const permissionsConfig = require('../config/permissions');
const MasterData = require('../models/MasterData');

const normalizeStringArray = (items) => {
  if (!items) return [];
  if (typeof items === 'string') return [items.trim().toLowerCase()].filter(Boolean);
  if (!Array.isArray(items)) return [];
  return items
    .filter((item) => item !== undefined && item !== null)
    .map((item) => String(item).trim().toLowerCase())
    .filter(Boolean);
};

const featureAccessAliases = {
  patients: ['patients.view', 'patients.create', 'patients.edit', 'patients.delete'],
  patient_records: ['patients.view'],
  patient_list: ['patients.view'],
  patient_create: ['patients.create'],
  patient_modify: ['patients.edit'],
  patient_delete: ['patients.delete'],

  appointments: ['appointments.view', 'appointments.create', 'appointments.edit', 'appointments.cancel'],
  appointment_view: ['appointments.view'],
  appointment_create: ['appointments.create'],
  appointment_modify: ['appointments.edit'],
  appointment_cancel: ['appointments.cancel'],

  doctors: ['doctors.view', 'doctors.create', 'doctors.edit', 'doctors.delete'],
  doctor_schedule: ['doctors.view'],
  doctor_management: ['doctors.view'],

  emr: ['emr.view', 'emr.create', 'emr.edit'],
  emr_view: ['emr.view'],
  emr_create: ['emr.create'],
  emr_update: ['emr.edit'],

  pharmacy: ['pharmacy.view', 'pharmacy.create', 'pharmacy.edit', 'pharmacy.delete'],
  pharmacy_view: ['pharmacy.view'],
  pharmacy_create: ['pharmacy.create'],
  pharmacy_update: ['pharmacy.edit'],

  billing: ['billing.view', 'billing.create', 'billing.edit', 'billing.refund'],
  billing_view: ['billing.view'],
  billing_create: ['billing.create'],
  billing_modify: ['billing.edit'],
  payments: ['billing.view'],

  icd: ['icd.view'],
  icd_view: ['icd.view'],
  icd_manage: ['icd.view'],
  icd_codes: ['icd.view'],

  reports: ['reports.view', 'reports.export'],
  reports_view: ['reports.view'],
  analytics: ['reports.view'],

  clinic_users: ['users.view', 'users.create', 'users.edit', 'users.delete'],
  user_management: ['users.view', 'users.create', 'users.edit', 'users.delete'],
  users: ['users.view', 'users.create', 'users.edit', 'users.delete'],

  settings: ['settings.view', 'settings.edit'],
  dashboard: ['dashboard.view'],

  patient_vitals: ['emr.view'],
  case_sheets: ['emr.view'],
  lab_results: ['emr.view'],
  care_plans: ['emr.view'],
  prescriptions: ['emr.view'],
  medications: ['pharmacy.view'],
  inventory: ['pharmacy.view'],

  audit_logs: ['audit.view'],
};

const expandFeatureAccessToPermissions = (items = []) => {
  const values = normalizeStringArray(items);
  const expanded = new Set();

  values.forEach((value) => {
    if (!value) return;
    expanded.add(value);

    const aliases = featureAccessAliases[value] || [];
    aliases.forEach((alias) => expanded.add(alias));
  });

  return Array.from(expanded);
};

const defaultRolePermissions = {
  admin: Object.values(permissionsConfig),
  doctor: [
    permissionsConfig.dashboardView,
    permissionsConfig.patientView,
    permissionsConfig.appointmentView,
    permissionsConfig.doctorView,
    permissionsConfig.emrView,
    permissionsConfig.icdView,
    permissionsConfig.reportsView,
    permissionsConfig.settingView,
  ],
  nurse: [
    permissionsConfig.dashboardView,
    permissionsConfig.patientView,
    permissionsConfig.appointmentView,
    permissionsConfig.emrView,
    permissionsConfig.icdView,
    permissionsConfig.reportsView,
    permissionsConfig.settingView,
  ],
  receptionist: [
    permissionsConfig.dashboardView,
    permissionsConfig.patientView,
    permissionsConfig.patientCreate,
    permissionsConfig.appointmentView,
    permissionsConfig.appointmentCreate,
    permissionsConfig.appointmentEdit,
    permissionsConfig.doctorView,
    permissionsConfig.billingView,
    permissionsConfig.icdView,
    permissionsConfig.reportsView,
    permissionsConfig.settingView,
  ],
  staff: [
    permissionsConfig.dashboardView,
    permissionsConfig.patientView,
    permissionsConfig.appointmentView,
    permissionsConfig.emrView,
    permissionsConfig.icdView,
    permissionsConfig.reportsView,
    permissionsConfig.settingView,
  ],
};

// Role-based feature access mapping - defines which features/modules each role can access
const defaultRoleFeatures = {
  admin: [
    'dashboard',
    'patients',
    'appointments',
    'doctors',
    'emr',
    'pharmacy',
    'billing',
    'icd',
    'reports',
    'admin',
    'settings',
    'patient_records',
    'prescriptions',
    'patient_vitals',
    'lab_results',
    'care_plans',
    'medications',
    'patient_list',
    'appointment_view',
    'emr_view',
    'pharmacy_view',
    'billing_view',
    'icd_view',
    'patient_view',
    'audit_logs',
  ],
  doctor: [
    'dashboard',
    'patients',
    'appointments',
    'emr',
    'icd',
    'settings',
    'patient_records',
    'patient_list',
    'patient_view',
    'appointment_view',
    'emr_view',
    'icd_view',
    'prescriptions',
    'patient_vitals',
    'lab_results',
    'care_plans',
    'case_sheets',
  ],
  nurse: [
    'dashboard',
    'patients',
    'appointments',
    'emr',
    'icd',
    'reports',
    'settings',
    'patient_records',
    'patient_list',
    'patient_view',
    'appointment_view',
    'emr_view',
    'icd_view',
    'reports_view',
    'patient_vitals',
    'lab_results',
    'care_plans',
    'case_sheets',
  ],
  receptionist: [
    'dashboard',
    'patients',
    'appointments',
    'doctors',
    'pharmacy',
    'billing',
    'icd',
    'reports',
    'settings',
    'patient_records',
    'patient_list',
    'patient_create',
    'appointment_view',
    'appointment_create',
    'doctor_schedule',
    'pharmacy_view',
    'billing_view',
    'icd_view',
    'reports_view',
    'patient_view',
  ],
  staff: [
    'dashboard',
    'patients',
    'appointments',
    'emr',
    'icd',
    'reports',
    'settings',
    'patient_records',
    'patient_list',
    'appointment_view',
    'emr_view',
    'icd_view',
    'reports_view',
    'patient_view',
    'case_sheets',
    'patient_vitals',
    'lab_results',
    'care_plans',
  ],
};

const collectGrantedFeatures = (user = {}) => {
  const featureSet = new Set();

  const addValues = (values) => {
    normalizeStringArray(values).forEach((value) => featureSet.add(value));
  };

  addValues(user.permissions || []);
  addValues(user.features || []);

  const normalizedRole = String(user.role || '').toLowerCase();
  if (normalizedRole && defaultRoleFeatures[normalizedRole]) {
    addValues(defaultRoleFeatures[normalizedRole]);
  }

  return Array.from(featureSet);
};

const getRoleAccessPolicy = (normalizedRole = '') => {
  const role = String(normalizedRole || '').toLowerCase();
  const allowedPermissions = normalizeStringArray(
    role === 'admin' ? Object.values(permissionsConfig) : defaultRolePermissions[role] || []
  );
  const allowedFeatures = normalizeStringArray(
    role === 'admin' ? defaultRoleFeatures.admin || [] : defaultRoleFeatures[role] || []
  );

  return { allowedPermissions, allowedFeatures };
};

const filterGrantedValuesForRole = (normalizedRole = '', values = []) => {
  const { allowedPermissions, allowedFeatures } = getRoleAccessPolicy(normalizedRole);
  const filtered = [];
  const seen = new Set();

  normalizeStringArray(values).forEach((value) => {
    const normalizedValue = String(value || '').trim().toLowerCase();
    if (!normalizedValue || seen.has(normalizedValue)) return;

    if (allowedFeatures.includes(normalizedValue)) {
      filtered.push(normalizedValue);
      seen.add(normalizedValue);
      return;
    }

    const expanded = expandFeatureAccessToPermissions([normalizedValue]);
    const hasAllowedPermission = expanded.some((permission) => allowedPermissions.includes(permission));

    if (hasAllowedPermission) {
      filtered.push(normalizedValue);
      seen.add(normalizedValue);
    }
  });

  return filtered;
};

const getEffectivePermissions = (user = {}) => {
  const normalizedRole = String(user.role || '').toLowerCase();

  if (normalizedRole === 'admin') {
    return normalizeStringArray(Object.values(permissionsConfig));
  }

  const grantedFeatures = filterGrantedValuesForRole(normalizedRole, collectGrantedFeatures(user));
  const explicitPermissions = expandFeatureAccessToPermissions(grantedFeatures);
  if (explicitPermissions.length > 0) {
    return normalizeStringArray([...new Set(explicitPermissions)]);
  }

  return normalizeStringArray(defaultRolePermissions[normalizedRole] || []);
};

const getEffectivePermissionsForUser = async (user = {}) => {
  const normalizedRole = String(user.role || '').toLowerCase();

  if (normalizedRole === 'admin') {
    return normalizeStringArray(Object.values(permissionsConfig));
  }

  const userId = user._id || user.id;
  const featureRecords = userId
    ? await MasterData.find({
        type: 'feature_access',
        isActive: true,
        $or: [
          { userId },
          { 'metadata.targetId': userId },
        ],
      }).lean()
    : [];

  const grantedFeatures = collectGrantedFeatures(user);
  featureRecords.forEach((record) => {
    normalizeStringArray(record.features || []).forEach((feature) => grantedFeatures.push(feature));
    normalizeStringArray(record.metadata?.features || []).forEach((feature) => grantedFeatures.push(feature));
  });

  const filteredFeatures = filterGrantedValuesForRole(normalizedRole, grantedFeatures);
  const explicitPermissions = expandFeatureAccessToPermissions(filteredFeatures);
  if (explicitPermissions.length > 0) {
    return normalizeStringArray([...new Set(explicitPermissions)]);
  }

  return normalizeStringArray(defaultRolePermissions[normalizedRole] || []);
};

const hasPermission = (user = {}, permission) => {
  if (!permission) return true;
  const perms = getEffectivePermissions(user);
  return perms.includes(String(permission).toLowerCase());
};

const hasAnyPermission = (user = {}, permissions = []) => {
  if (!Array.isArray(permissions) || permissions.length === 0) return true;
  return permissions.some((permission) => hasPermission(user, permission));
};

// Get effective features for a user based on their role
const getEffectiveFeatures = (user = {}) => {
  const normalizedRole = String(user.role || '').toLowerCase();

  if (normalizedRole === 'admin') {
    return normalizeStringArray(defaultRoleFeatures.admin || []);
  }

  const grantedFeatures = collectGrantedFeatures(user);
  const filteredFeatures = filterGrantedValuesForRole(normalizedRole, grantedFeatures);
  if (filteredFeatures.length > 0) {
    return normalizeStringArray(filteredFeatures);
  }

  return normalizeStringArray(defaultRoleFeatures[normalizedRole] || []);
};

const getEffectiveFeaturesForUser = async (user = {}) => {
  const normalizedRole = String(user.role || '').toLowerCase();

  if (normalizedRole === 'admin') {
    return normalizeStringArray(defaultRoleFeatures.admin || []);
  }

  const userId = user._id || user.id;
  const featureRecords = userId
    ? await MasterData.find({
        type: 'feature_access',
        isActive: true,
        $or: [
          { userId },
          { 'metadata.targetId': userId },
        ],
      }).lean()
    : [];

  const grantedFeatures = collectGrantedFeatures(user);
  featureRecords.forEach((record) => {
    normalizeStringArray(record.features || []).forEach((feature) => grantedFeatures.push(feature));
    normalizeStringArray(record.metadata?.features || []).forEach((feature) => grantedFeatures.push(feature));
  });

  const filteredFeatures = filterGrantedValuesForRole(normalizedRole, grantedFeatures);
  if (filteredFeatures.length > 0) {
    return normalizeStringArray([...new Set(filteredFeatures)]);
  }

  return normalizeStringArray(defaultRoleFeatures[normalizedRole] || []);
};

module.exports = {
  normalizeStringArray,
  defaultRolePermissions,
  defaultRoleFeatures,
  expandFeatureAccessToPermissions,
  getEffectivePermissions,
  getEffectivePermissionsForUser,
  getEffectiveFeatures,
  getEffectiveFeaturesForUser,
  hasPermission,
  hasAnyPermission,
  permissionCatalog: Object.values(permissionsConfig),
};
