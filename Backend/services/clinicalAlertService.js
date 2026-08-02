const Patient = require('../models/Patient');

const normalizeText = (value) => {
  if (typeof value !== 'string') return '';
  return value.toLowerCase().trim();
};

const normalizeList = (value) => {
  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== undefined && item !== null)
      .map((item) => normalizeText(String(item)))
      .filter(Boolean);
  }

  if (typeof value === 'string' && value.trim()) {
    return value
      .split(/[,;\n]+/)
      .map((item) => normalizeText(item))
      .filter(Boolean);
  }

  return [];
};

const buildAlert = ({ type, title, description, severity = 'warning', source = 'clinical' }) => ({
  type,
  title,
  description,
  severity,
  source,
  createdAt: new Date()
});

const parseDoseMg = (dose) => {
  if (!dose || typeof dose !== 'string') return null;
  const mgMatch = dose.match(/(\d+(?:\.\d+)?)\s*(?:mg|milligram)/i);
  if (mgMatch) return Number(mgMatch[1]);
  const numberMatch = dose.match(/(\d+(?:\.\d+)?)/);
  if (numberMatch) return Number(numberMatch[1]);
  return null;
};

const extractMedicineNames = (medicines = []) => {
  return medicines
    .map((item) => {
      if (!item) return '';
      if (typeof item === 'string') return normalizeText(item);
      return normalizeText(item.name || item.medicineName || item.label || '');
    })
    .filter(Boolean);
};

const INTERACTION_RULES = [
  {
    meds: ['warfarin', 'aspirin', 'ibuprofen', 'naproxen', 'diclofenac'],
    title: 'Bleeding risk with anticoagulants and NSAIDs',
    description: 'Concurrent use of anticoagulants like warfarin with aspirin or NSAIDs increases bleeding risk. Review the regimen for safer alternatives or monitoring.',
    severity: 'critical'
  },
  {
    meds: ['ace inhibitor', 'spironolactone', 'eplerenone', 'potassium sparing diuretic'],
    title: 'Hyperkalemia risk with ACE inhibitors and potassium-sparing diuretics',
    description: 'This drug combination can increase potassium levels and should be monitored closely.',
    severity: 'warning'
  },
  {
    meds: ['metformin', 'contrast dye', 'iodinated contrast'],
    title: 'Renal risk with metformin and contrast study',
    description: 'Metformin should be reviewed before contrast imaging to reduce the risk of lactic acidosis in patients with renal impairment.',
    severity: 'warning'
  }
];

const PREGNANCY_CONTRAINDICATED = [
  { term: 'warfarin', label: 'Warfarin' },
  { term: 'tetracycline', label: 'Tetracycline' },
  { term: 'isotretinoin', label: 'Isotretinoin' },
  { term: 'diclofenac', label: 'Diclofenac' },
  { term: 'ibuprofen', label: 'Ibuprofen' }
];

const RENAL_RISK_DRUGS = [
  'metformin',
  'ibuprofen',
  'naproxen',
  'diclofenac',
  'nitrofurantoin',
  'ace inhibitor',
  'spironolactone'
];

const LIVER_RISK_DRUGS = [
  'paracetamol',
  'acetaminophen',
  'isoniazid',
  'statin',
  'amiodarone'
];

const ELDERLY_RISK_DRUGS = [
  'diazepam',
  'lorazepam',
  'alprazolam',
  'tramadol',
  'opioid',
  'ibuprofen',
  'naproxen',
  'pioglitazone',
  'glyburide',
  'ace inhibitor'
];

const getPatientRiskFlags = (patient) => {
  const history = normalizeText(patient.medicalHistory || '');
  return {
    pregnant: String(patient.pregnancyStatus || '').toLowerCase() === 'pregnant' || /pregnan|gestation|gravida|lmp/.test(history),
    renal: /renal|kidney|nephro|dialysis/.test(history),
    liver: /liver|hepato|cirrhosis|hepatitis/.test(history),
    diabetes: /diabetes|dm/.test(history),
    hypertension: /hypertension|htn/.test(history),
  };
};

const findAllergyAlert = (allergies, medNames) => {
  if (allergies.length === 0 || medNames.length === 0) return null;

  const allergySet = new Set(allergies.map((item) => normalizeText(item)));
  const medicineSet = new Set(medNames.map((item) => normalizeText(item)));

  for (const allergy of allergySet) {
    for (const med of medicineSet) {
      if (med.includes(allergy) || allergy.includes(med) || med.includes(allergy.split(' ')[0])) {
        return buildAlert({
          type: 'allergy',
          title: 'Possible allergy conflict',
          description: `Patient reports allergy to "${allergy}" while prescribing "${med}". Confirm the allergy and choose an alternative if needed.`,
          severity: 'critical'
        });
      }
    }
  }

  return null;
};

const findDrugInteractionAlerts = (medNames, currentMeds) => {
  const allNames = [...new Set([...medNames, ...currentMeds])];
  const alerts = [];

  for (const rule of INTERACTION_RULES) {
    const matches = rule.meds.filter((term) => allNames.some((name) => name.includes(term)));
    if (matches.length >= 2) {
      alerts.push(buildAlert({
        type: 'interaction',
        title: rule.title,
        description: rule.description,
        severity: rule.severity
      }));
    }
  }

  return alerts;
};

const findDuplicateMedicineAlert = (medNames) => {
  const counts = medNames.reduce((acc, med) => {
    acc[med] = (acc[med] || 0) + 1;
    return acc;
  }, {});

  const duplicates = Object.entries(counts).filter(([, count]) => count > 1).map(([name]) => name);
  if (duplicates.length === 0) return null;

  return buildAlert({
    type: 'duplicate',
    title: 'Duplicate medicine detected',
    description: `The prescription contains duplicate entries for ${duplicates.join(', ')}. Consolidate dosing instructions to avoid double-dosing.`,
    severity: 'warning'
  });
};

const findPatientRiskAlerts = (patient, medNames = []) => {
  const alerts = [];
  const { pregnant, renal, liver } = getPatientRiskFlags(patient);
  const age = Number(patient.age);

  if (pregnant && medNames.length > 0) {
    const flaggedMeds = PREGNANCY_CONTRAINDICATED.filter((item) => medNames.some((name) => name.includes(item.term)));
    if (flaggedMeds.length > 0) {
      alerts.push(buildAlert({
        type: 'pregnancy',
        title: 'Pregnancy contraindication',
        description: `This patient is pregnant and has medicines prescribed that may pose risks: ${flaggedMeds.map((m) => m.label).join(', ')}. Review alternatives.`,
        severity: 'critical'
      }));
    }
  }

  if (renal && medNames.some((name) => RENAL_RISK_DRUGS.some((term) => name.includes(term)))) {
    alerts.push(buildAlert({
      type: 'renal',
      title: 'Renal function caution',
      description: 'Patient history suggests renal compromise. Review prescribed medicines for renal dosing and monitoring requirements.',
      severity: 'warning'
    }));
  }

  if (liver && medNames.some((name) => LIVER_RISK_DRUGS.some((term) => name.includes(term)))) {
    alerts.push(buildAlert({
      type: 'liver',
      title: 'Liver function caution',
      description: 'Patient history suggests liver compromise. Review hepatic metabolism and avoid hepatotoxic medicines where possible.',
      severity: 'warning'
    }));
  }

  if (!Number.isNaN(age) && age >= 65 && medNames.some((name) => ELDERLY_RISK_DRUGS.some((term) => name.includes(term)))) {
    alerts.push(buildAlert({
      type: 'age',
      title: 'Elderly patient dosing caution',
      description: 'This patient is elderly and may be more sensitive to the prescribed medicines. Consider lower starting doses and close monitoring.',
      severity: 'warning'
    }));
  }

  return alerts;
};

const evaluateDosageWarnings = (medicines = []) => {
  const alerts = [];

  for (const med of medicines) {
    const name = normalizeText(med.name || med.medicineName || '');
    const doseMg = parseDoseMg(med.dose || '');
    if (!doseMg) continue;

    if (name.includes('paracetamol') && doseMg > 1000) {
      alerts.push(buildAlert({
        type: 'dosage',
        title: 'High paracetamol dose',
        description: 'Paracetamol doses above 1000 mg at one time may approach the upper daily limit. Confirm total daily intake and schedule.',
        severity: 'warning'
      }));
    }

    if ((name.includes('ibuprofen') || name.includes('naproxen') || name.includes('diclofenac')) && doseMg > 800) {
      alerts.push(buildAlert({
        type: 'dosage',
        title: 'High NSAID dose',
        description: 'NSAID doses above common single-dose limits increase gastrointestinal and renal risk. Confirm dosing frequency and duration.',
        severity: 'warning'
      }));
    }

    if (name.includes('amoxicillin') && doseMg > 1000) {
      alerts.push(buildAlert({
        type: 'dosage',
        title: 'High amoxicillin dose',
        description: 'High amoxicillin doses require monitoring for gastrointestinal tolerance and may need IV assessment if exceeding outpatient limits.',
        severity: 'warning'
      }));
    }
  }

  return alerts;
};

const generateClinicalAlerts = async (payload = {}) => {
  const { uhid, medicineDetails = [], prescription } = payload;
  const medications = Array.isArray(medicineDetails) ? medicineDetails : [];
  const medNames = extractMedicineNames(medications).filter(Boolean);
  const uniqueMedNames = [...new Set(medNames)];

  const alerts = [];
  const patient = uhid ? await Patient.findOne({ uhid: String(uhid) }) : null;

  if (!patient) {
    alerts.push(buildAlert({
      type: 'profile',
      title: 'Patient profile missing',
      description: 'No patient profile was found for this UHID. Clinical decision support is limited without allergy, chronic disease, or follow-up history.',
      severity: 'info'
    }));
  }

  if (patient) {
    const allergies = normalizeList(patient.knownAllergies);
    const currentMeds = normalizeList(patient.currentMedications);
    const diseases = normalizeList(patient.chronicDiseases);

    const allergyAlert = findAllergyAlert(allergies, uniqueMedNames);
    if (allergyAlert) alerts.push(allergyAlert);

    if (diseases.length > 0 && uniqueMedNames.length > 0) {
      alerts.push(buildAlert({
        type: 'chronic-disease',
        title: 'Chronic disease history',
        description: `Patient has chronic conditions: ${diseases.join(', ')}. Confirm medicines are appropriate for comorbid conditions.`,
        severity: 'info'
      }));
    }

    if (uniqueMedNames.length > 0 && currentMeds.length > 0) {
      const overlap = uniqueMedNames.filter((name) => currentMeds.some((current) => current.includes(name) || name.includes(current)));
      if (overlap.length > 0) {
        alerts.push(buildAlert({
          type: 'medication-history',
          title: 'Potential medication overlap',
          description: `Patient is already taking ${overlap.join(', ')}. Confirm whether this is a continuation or a duplicate prescription.`,
          severity: 'warning'
        }));
      }
    }

    if (patient.nextFollowUp) {
      const nextFollowUpDate = new Date(patient.nextFollowUp);
      const now = new Date();
      if (!isNaN(nextFollowUpDate.getTime())) {
        if (nextFollowUpDate <= now) {
          alerts.push(buildAlert({
            type: 'follow-up',
            title: 'Overdue follow-up',
            description: 'Patient has a scheduled follow-up date that has passed. Confirm care plan and next visit scheduling.',
            severity: 'warning'
          }));
        } else {
          const soon = new Date(now);
          soon.setDate(soon.getDate() + 7);
          if (nextFollowUpDate <= soon) {
            alerts.push(buildAlert({
              type: 'follow-up',
              title: 'Upcoming follow-up',
              description: 'Patient has a follow-up appointment due within the next 7 days. Coordinate treatment plans accordingly.',
              severity: 'info'
            }));
          }
        }
      }
    }

    alerts.push(...findPatientRiskAlerts(patient, uniqueMedNames));
  }

  if (uniqueMedNames.length > 1) {
    const interactionAlerts = findDrugInteractionAlerts(uniqueMedNames, normalizeList(patient?.currentMedications));
    alerts.push(...interactionAlerts);
  }

  const duplicateAlert = findDuplicateMedicineAlert(uniqueMedNames);
  if (duplicateAlert) alerts.push(duplicateAlert);

  alerts.push(...evaluateDosageWarnings(medications));

  if (!uniqueMedNames.length && prescription && typeof prescription === 'string') {
    const extracted = extractMedicineNames(prescription.split(/[\n,;]+/).map((text) => ({ name: text })));
    if (extracted.length > 0) {
      alerts.push(buildAlert({
        type: 'prescription-format',
        title: 'Structured medication details missing',
        description: 'The prescription text can be enhanced by using structured medicine details for better clinical alerts.',
        severity: 'info'
      }));
    }
  }

  return alerts;
};

const getClinicalAlertSummary = async () => {
  const now = new Date();
  const soon = new Date(now);
  soon.setDate(now.getDate() + 7);

  const overdueFollowUps = await Patient.countDocuments({ nextFollowUp: { $lte: now } });
  const followUpsDueSoon = await Patient.countDocuments({ nextFollowUp: { $gt: now, $lte: soon } });
  const highRiskPatients = await Patient.countDocuments({
    $or: [
      { age: { $gte: 65 } },
      { chronicDiseases: { $exists: true, $not: { $size: 0 } } },
      { medicalHistory: { $regex: /(renal|kidney|nephro|liver|hepato|cirrhosis|hepatitis|diabetes|hypertension)/i } }
    ]
  });

  return {
    overdueFollowUps,
    followUpsDueSoon,
    highRiskPatients
  };
};

module.exports = {
  generateClinicalAlerts,
  getClinicalAlertSummary
};
