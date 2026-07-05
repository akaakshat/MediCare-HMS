// Frontend permissions config. These values are read from Vite env variables when available.
// Use VITE_ prefix to expose to the client.

const csv = (v: string | undefined, fallback: string) => {
  const raw = v ?? fallback;
  return raw.split(',').map(s => s.trim()).filter(Boolean);
};

export const Permissions = {
  appointmentCreate: csv((import.meta as any).env.VITE_PERM_APPOINTMENT_CREATE, 'receptionist,admin'),
  appointmentModify: csv((import.meta as any).env.VITE_PERM_APPOINTMENT_MODIFY, 'receptionist,admin'),
  appointmentView: csv((import.meta as any).env.VITE_PERM_APPOINTMENT_VIEW, 'doctor,receptionist,nurse,staff,admin'),
  appointmentCancel: csv((import.meta as any).env.VITE_PERM_APPOINTMENT_CANCEL, 'admin,doctor'),

  patientCreate: csv((import.meta as any).env.VITE_PERM_PATIENT_CREATE, 'receptionist,admin'),
  patientModify: csv((import.meta as any).env.VITE_PERM_PATIENT_MODIFY, 'receptionist,doctor,admin'),
  patientView: csv((import.meta as any).env.VITE_PERM_PATIENT_VIEW, 'doctor,receptionist,nurse,staff,admin'),
  patientDelete: csv((import.meta as any).env.VITE_PERM_PATIENT_DELETE, 'admin'),

  billingCreate: csv((import.meta as any).env.VITE_PERM_BILLING_CREATE, 'receptionist,admin'),
  billingModify: csv((import.meta as any).env.VITE_PERM_BILLING_MODIFY, 'receptionist,admin'),
  billingView: csv((import.meta as any).env.VITE_PERM_BILLING_VIEW, 'admin,receptionist,doctor'),

  emrView: csv((import.meta as any).env.VITE_PERM_EMR_VIEW, 'admin,doctor,nurse,staff'),
  emrCreate: csv((import.meta as any).env.VITE_PERM_EMR_CREATE, 'admin,doctor,nurse'),

  doctorsManage: csv((import.meta as any).env.VITE_PERM_DOCTORS_MANAGE, 'admin,staff'),

  icdView: csv((import.meta as any).env.VITE_PERM_ICD_VIEW, 'admin,doctor,nurse,receptionist,staff'),
  icdManage: csv((import.meta as any).env.VITE_PERM_ICD_MANAGE, 'admin,doctor,nurse'),

  pharmacyView: csv((import.meta as any).env.VITE_PERM_PHARMACY_VIEW, 'admin,doctor,nurse,receptionist,staff'),
  pharmacyCreate: csv((import.meta as any).env.VITE_PERM_PHARMACY_CREATE, 'admin,staff'),
  pharmacyUpdate: csv((import.meta as any).env.VITE_PERM_PHARMACY_UPDATE, 'admin,staff'),
  pharmacyDelete: csv((import.meta as any).env.VITE_PERM_PHARMACY_DELETE, 'admin')
};
