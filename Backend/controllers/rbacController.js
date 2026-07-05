const { permissionCatalog, defaultRolePermissions, normalizeStringArray } = require('../services/rbacService');

const buildCatalog = () => [
  { key: 'dashboard.view', label: 'Dashboard View', group: 'Dashboard' },
  { key: 'patients.view', label: 'Patients View', group: 'Patients' },
  { key: 'patients.create', label: 'Patients Create', group: 'Patients' },
  { key: 'patients.edit', label: 'Patients Edit', group: 'Patients' },
  { key: 'patients.delete', label: 'Patients Delete', group: 'Patients' },
  { key: 'appointments.view', label: 'Appointments View', group: 'Appointments' },
  { key: 'appointments.create', label: 'Appointments Create', group: 'Appointments' },
  { key: 'appointments.edit', label: 'Appointments Edit', group: 'Appointments' },
  { key: 'appointments.cancel', label: 'Appointments Cancel', group: 'Appointments' },
  { key: 'doctors.view', label: 'Doctors View', group: 'Doctors' },
  { key: 'doctors.create', label: 'Doctors Create', group: 'Doctors' },
  { key: 'doctors.edit', label: 'Doctors Edit', group: 'Doctors' },
  { key: 'doctors.delete', label: 'Doctors Delete', group: 'Doctors' },
  { key: 'emr.view', label: 'EMR View', group: 'EMR' },
  { key: 'emr.create', label: 'EMR Create', group: 'EMR' },
  { key: 'emr.edit', label: 'EMR Edit', group: 'EMR' },
  { key: 'emr.print', label: 'EMR Print', group: 'EMR' },
  { key: 'emr.download', label: 'EMR Download', group: 'EMR' },
  { key: 'pharmacy.view', label: 'Pharmacy View', group: 'Pharmacy' },
  { key: 'pharmacy.create', label: 'Pharmacy Create', group: 'Pharmacy' },
  { key: 'pharmacy.edit', label: 'Pharmacy Edit', group: 'Pharmacy' },
  { key: 'pharmacy.delete', label: 'Pharmacy Delete', group: 'Pharmacy' },
  { key: 'billing.view', label: 'Billing View', group: 'Billing' },
  { key: 'billing.create', label: 'Billing Create', group: 'Billing' },
  { key: 'billing.edit', label: 'Billing Edit', group: 'Billing' },
  { key: 'billing.refund', label: 'Billing Refund', group: 'Billing' },
  { key: 'reports.view', label: 'Reports View', group: 'Reports' },
  { key: 'reports.export', label: 'Reports Export', group: 'Reports' },
  { key: 'icd.view', label: 'ICD View', group: 'ICD' },
  { key: 'users.view', label: 'Users View', group: 'Users' },
  { key: 'users.create', label: 'Users Create', group: 'Users' },
  { key: 'users.edit', label: 'Users Edit', group: 'Users' },
  { key: 'users.delete', label: 'Users Delete', group: 'Users' },
  { key: 'roles.view', label: 'Roles View', group: 'Users' },
  { key: 'roles.create', label: 'Roles Create', group: 'Users' },
  { key: 'roles.edit', label: 'Roles Edit', group: 'Users' },
  { key: 'roles.delete', label: 'Roles Delete', group: 'Users' },
  { key: 'masters.view', label: 'Masters View', group: 'Masters' },
  { key: 'masters.create', label: 'Masters Create', group: 'Masters' },
  { key: 'masters.edit', label: 'Masters Edit', group: 'Masters' },
  { key: 'masters.delete', label: 'Masters Delete', group: 'Masters' },
  { key: 'settings.view', label: 'Settings View', group: 'Settings' },
  { key: 'settings.edit', label: 'Settings Edit', group: 'Settings' },
  { key: 'audit.view', label: 'Audit View', group: 'Audit' },
];

exports.getPermissionCatalog = (req, res) => {
  res.json({
    success: true,
    catalog: buildCatalog(),
    defaults: defaultRolePermissions,
    availablePermissions: permissionCatalog,
  });
};

exports.getUserEffectivePermissions = (req, res) => {
  const effectivePermissions = normalizeStringArray(req.user?.permissions || []);
  res.json({ success: true, permissions: effectivePermissions });
};
