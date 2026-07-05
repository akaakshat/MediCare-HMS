// Centralized permission config for backend routes.
// Each entry is a permission name that can be assigned to users.

const permissions = {
  dashboardView: 'dashboard.view',

  appointmentCreate: 'appointments.create',
  appointmentModify: 'appointments.edit',
  appointmentView: 'appointments.view',
  appointmentCancel: 'appointments.cancel',

  patientCreate: 'patients.create',
  patientModify: 'patients.edit',
  patientView: 'patients.view',
  patientDelete: 'patients.delete',

  billingCreate: 'billing.create',
  billingModify: 'billing.edit',
  billingView: 'billing.view',
  billingRefund: 'billing.refund',

  emrView: 'emr.view',
  emrCreate: 'emr.create',
  emrUpdate: 'emr.edit',
  emrDelete: 'emr.edit',
  emrPrint: 'emr.print',
  emrDownload: 'emr.download',

  doctorView: 'doctors.view',
  doctorCreate: 'doctors.create',
  doctorEdit: 'doctors.edit',
  doctorDelete: 'doctors.delete',
  doctorsManage: 'doctors.view',

  icdView: 'icd.view',
  icdManage: 'icd.view',

  pharmacyView: 'pharmacy.view',
  pharmacyCreate: 'pharmacy.create',
  pharmacyUpdate: 'pharmacy.edit',
  pharmacyDelete: 'pharmacy.delete',

  reportsView: 'reports.view',
  reportsExport: 'reports.export',

  userView: 'users.view',
  userCreate: 'users.create',
  userEdit: 'users.edit',
  userDelete: 'users.delete',

  roleView: 'roles.view',
  roleCreate: 'roles.create',
  roleEdit: 'roles.edit',
  roleDelete: 'roles.delete',

  masterView: 'masters.view',
  masterCreate: 'masters.create',
  masterEdit: 'masters.edit',
  masterDelete: 'masters.delete',

  settingView: 'settings.view',
  settingEdit: 'settings.edit',

  auditView: 'audit.view',
};

module.exports = permissions;
module.exports.permissionCatalog = Object.values(permissions);
