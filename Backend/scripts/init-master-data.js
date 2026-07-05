// scripts/init-master-data.js
// Initialize Master Data from JSON seed data

const mongoose = require('mongoose');
require('dotenv').config();

const MasterData = require('../models/MasterData');

const seedData = {
  role: [
    { name: 'Admin', code: 'ADMIN', description: 'Administrator with full access' },
    { name: 'Doctor', code: 'DOCTOR', description: 'Medical doctor' },
    { name: 'Nurse', code: 'NURSE', description: 'Nursing staff' },
    { name: 'Receptionist', code: 'RECEPTIONIST', description: 'Reception staff' },
    { name: 'Pharmacist', code: 'PHARMACIST', description: 'Pharmacy staff' }
  ],
  permission: [
    { name: 'View Dashboard', code: 'VIEW_DASHBOARD', description: 'Can view dashboard' },
    { name: 'Manage Users', code: 'MANAGE_USERS', description: 'Can manage user accounts' },
    { name: 'Manage Patients', code: 'MANAGE_PATIENTS', description: 'Can manage patient records' },
    { name: 'Manage Appointments', code: 'MANAGE_APPOINTMENTS', description: 'Can manage appointments' },
    { name: 'View Billing', code: 'VIEW_BILLING', description: 'Can view billing information' },
    { name: 'Manage Billing', code: 'MANAGE_BILLING', description: 'Can manage billing' },
    { name: 'View EMR', code: 'VIEW_EMR', description: 'Can view electronic medical records' },
    { name: 'Manage EMR', code: 'MANAGE_EMR', description: 'Can manage electronic medical records' },
    { name: 'Manage Masters', code: 'MANAGE_MASTERS', description: 'Can manage master data' }
  ],
  gender: [
    { name: 'Male', code: 'M', description: 'Male gender' },
    { name: 'Female', code: 'F', description: 'Female gender' },
    { name: 'Other', code: 'O', description: 'Other gender' }
  ],
  blood_group: [
    { name: 'A Positive', code: 'A+', description: 'Blood group A positive' },
    { name: 'A Negative', code: 'A-', description: 'Blood group A negative' },
    { name: 'B Positive', code: 'B+', description: 'Blood group B positive' },
    { name: 'B Negative', code: 'B-', description: 'Blood group B negative' },
    { name: 'AB Positive', code: 'AB+', description: 'Blood group AB positive' },
    { name: 'AB Negative', code: 'AB-', description: 'Blood group AB negative' },
    { name: 'O Positive', code: 'O+', description: 'Blood group O positive' },
    { name: 'O Negative', code: 'O-', description: 'Blood group O negative' }
  ],
  marital_status: [
    { name: 'Single', code: 'SINGLE', description: 'Not married' },
    { name: 'Married', code: 'MARRIED', description: 'Married' },
    { name: 'Divorced', code: 'DIVORCED', description: 'Divorced' },
    { name: 'Widowed', code: 'WIDOWED', description: 'Widowed' }
  ],
  patient_type: [
    { name: 'Inpatient', code: 'INPATIENT', description: 'Admitted patient' },
    { name: 'Outpatient', code: 'OUTPATIENT', description: 'Non-admitted patient' },
    { name: 'Emergency', code: 'EMERGENCY', description: 'Emergency patient' }
  ],
  department: [
    { name: 'General Medicine', code: 'GM', description: 'General Medical Department' },
    { name: 'Surgery', code: 'SURG', description: 'Surgical Department' },
    { name: 'Cardiology', code: 'CARD', description: 'Heart and cardiovascular system' },
    { name: 'Neurology', code: 'NEURO', description: 'Nervous system disorders' },
    { name: 'Orthopedics', code: 'ORTHO', description: 'Bones and joints' },
    { name: 'Pediatrics', code: 'PED', description: 'Children\'s medical care' },
    { name: 'Obstetrics', code: 'OBS', description: 'Pregnancy and childbirth' },
    { name: 'Emergency', code: 'EMERG', description: 'Emergency department' }
  ],
  specialization: [
    { name: 'General Practitioner', code: 'GP', description: 'General Practice' },
    { name: 'Cardiologist', code: 'CARDIOLOGIST', description: 'Heart specialist' },
    { name: 'Neurologist', code: 'NEUROLOGIST', description: 'Nervous system specialist' },
    { name: 'Orthopedic Surgeon', code: 'ORTHOPEDIC', description: 'Bone and joint specialist' },
    { name: 'Pediatrician', code: 'PEDIATRICIAN', description: 'Children\'s doctor' }
  ],
  appointment_status: [
    { name: 'Scheduled', code: 'SCHEDULED', description: 'Appointment scheduled' },
    { name: 'Completed', code: 'COMPLETED', description: 'Appointment completed' },
    { name: 'Cancelled', code: 'CANCELLED', description: 'Appointment cancelled' },
    { name: 'No Show', code: 'NO_SHOW', description: 'Patient did not show up' },
    { name: 'Rescheduled', code: 'RESCHEDULED', description: 'Appointment rescheduled' }
  ],
  visit_type: [
    { name: 'Consultation', code: 'CONSULTATION', description: 'Doctor consultation' },
    { name: 'Follow-up', code: 'FOLLOWUP', description: 'Follow-up visit' },
    { name: 'Check-up', code: 'CHECKUP', description: 'Regular check-up' },
    { name: 'Emergency', code: 'EMERGENCY', description: 'Emergency visit' }
  ],
  consultation_type: [
    { name: 'Online', code: 'ONLINE', description: 'Online consultation' },
    { name: 'In-person', code: 'INPERSON', description: 'In-person consultation' },
    { name: 'Video Call', code: 'VIDEOCALL', description: 'Video call consultation' }
  ],
  payment_status: [
    { name: 'Paid', code: 'PAID', description: 'Payment completed' },
    { name: 'Pending', code: 'PENDING', description: 'Payment pending' },
    { name: 'Partial', code: 'PARTIAL', description: 'Partially paid' },
    { name: 'Overdue', code: 'OVERDUE', description: 'Payment overdue' },
    { name: 'Cancelled', code: 'CANCELLED', description: 'Payment cancelled' }
  ],
  payment_method: [
    { name: 'Cash', code: 'CASH', description: 'Cash payment' },
    { name: 'Debit Card', code: 'DEBIT_CARD', description: 'Debit card payment' },
    { name: 'Credit Card', code: 'CREDIT_CARD', description: 'Credit card payment' },
    { name: 'Bank Transfer', code: 'BANK_TRANSFER', description: 'Bank transfer' },
    { name: 'Cheque', code: 'CHEQUE', description: 'Cheque payment' },
    { name: 'Online Payment', code: 'ONLINE', description: 'Online payment gateway' }
  ],
  invoice_type: [
    { name: 'Standard Invoice', code: 'STANDARD', description: 'Standard invoice' },
    { name: 'Credit Note', code: 'CREDIT_NOTE', description: 'Credit note for refund' },
    { name: 'Debit Note', code: 'DEBIT_NOTE', description: 'Debit note for charges' },
    { name: 'Proforma Invoice', code: 'PROFORMA', description: 'Proforma invoice' }
  ],
  medicine_category: [
    { name: 'Analgesics', code: 'ANALGESIC', description: 'Pain relief medicines' },
    { name: 'Antibiotics', code: 'ANTIBIOTIC', description: 'Antibacterial medicines' },
    { name: 'Antihistamines', code: 'ANTIHISTAMINE', description: 'Allergy medicines' },
    { name: 'Antacids', code: 'ANTACID', description: 'Stomach acid reducers' },
    { name: 'Vitamins', code: 'VITAMIN', description: 'Vitamin supplements' }
  ],
  dosage_form: [
    { name: 'Tablet', code: 'TABLET', description: 'Tablet form' },
    { name: 'Capsule', code: 'CAPSULE', description: 'Capsule form' },
    { name: 'Syrup', code: 'SYRUP', description: 'Liquid syrup form' },
    { name: 'Injection', code: 'INJECTION', description: 'Injectable form' },
    { name: 'Ointment', code: 'OINTMENT', description: 'Topical ointment' },
    { name: 'Cream', code: 'CREAM', description: 'Cream form' }
  ],
  unit: [
    { name: 'Piece', code: 'PC', description: 'Individual piece' },
    { name: 'Bottle', code: 'BTL', description: 'Bottle' },
    { name: 'Box', code: 'BOX', description: 'Box/Pack' },
    { name: 'Strip', code: 'STRIP', description: 'Strip (usually 10 tablets)' },
    { name: 'Milligram', code: 'MG', description: 'Milligram' },
    { name: 'Millilitre', code: 'ML', description: 'Millilitre' }
  ]
};

async function initializeMasterData({ exitOnError = true } = {}) {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGO_FALLBACK_URI;
    if (!mongoUri) {
      throw new Error('MONGO_URI not set');
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    let totalInserted = 0;
    let totalSkipped = 0;

    for (const [type, records] of Object.entries(seedData)) {
      console.log(`\nProcessing ${type}...`);

      for (const record of records) {
        try {
          // Check if already exists
          const existing = await MasterData.findOne({
            type,
            code: record.code.toUpperCase()
          });

          if (existing) {
            console.log(`  ✓ ${record.name} (already exists)`);
            totalSkipped++;
            continue;
          }

          // Create new record
          const masterData = new MasterData({
            type,
            ...record,
            code: record.code.toUpperCase(),
            isActive: true
          });

          await masterData.save();
          console.log(`  + ${record.name}`);
          totalInserted++;
        } catch (error) {
          console.error(`  ✗ ${record.name}: ${error.message}`);
        }
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('Master Data Initialization Complete!');
    console.log(`Total Inserted: ${totalInserted}`);
    console.log(`Total Skipped: ${totalSkipped}`);
    console.log('='.repeat(50));

    await mongoose.connection.close();
    console.log('Connection closed');
  } catch (error) {
    console.error('Error initializing master data:', error);
    if (exitOnError) {
      process.exit(1);
    }
    throw error;
  }
}

if (require.main === module) {
  initializeMasterData().catch((error) => {
    console.error('Master data seed failed:', error);
    process.exit(1);
  });
}

module.exports = {
  initializeMasterData,
  seedData
};
