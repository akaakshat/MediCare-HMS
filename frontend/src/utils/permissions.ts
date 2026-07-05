export const normalizeStringArray = (items?: any): string[] => {
  if (typeof items === 'string') {
    return [items.trim().toLowerCase()].filter(Boolean);
  }

  return Array.isArray(items)
    ? items
        .filter((item) => item !== undefined && item !== null)
        .map((item) => String(item).trim().toLowerCase())
        .filter(Boolean)
    : [];
};

const featureAccessAliases: Record<string, string[]> = {
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

export const expandFeatureAccessToPermissions = (items?: any): string[] => {
  const values = normalizeStringArray(items);
  const expanded = new Set<string>();

  values.forEach((value) => {
    if (!value) return;
    expanded.add(value);

    const aliases = featureAccessAliases[value] || [];
    aliases.forEach((alias) => expanded.add(alias));
  });

  return Array.from(expanded);
};

export const hasFeatureAccess = (
  requiredPerms: string[],
  userPerms: string[] = [],
  userFeatures: string[] = []
): boolean => {
  if (!requiredPerms || requiredPerms.length === 0) return true;

  const effectivePermissions = expandFeatureAccessToPermissions([...userPerms, ...userFeatures]);
  const normalizedRequired = normalizeStringArray(requiredPerms);

  return normalizedRequired.some((permission) => effectivePermissions.includes(permission));
};

export const normalizeUserAccess = (user?: any) => {
  if (!user) return null;

  const permissions = normalizeStringArray(user.permissions);
  const features = normalizeStringArray(user.features);
  const effectivePermissions = expandFeatureAccessToPermissions([...permissions, ...features]);

  return {
    ...user,
    role: String(user.role || '').trim().toLowerCase(),
    permissions,
    features,
    effectivePermissions,
  };
};
