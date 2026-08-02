const mongoose = require('mongoose');
const User = require('../models/User');
const Patient = require('../models/Patient');
const Appointment = require('../models/Appoinment');
const EMR = require('../models/EMR');
const Bill = require('../models/Bill');
const PharmacyItem = require('../models/PharmacyItem');

async function setupDatabase() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect('mongodb://localhost:27017/his_db', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Create collections and indexes
    console.log('🔄 Setting up collections and indexes...');

    // Users collection
    await User.createCollection();
    await User.collection.createIndex({ email: 1 }, { unique: true });
    await User.collection.createIndex({ role: 1 });
    console.log('✅ Users collection created with indexes');

    // Patients collection
    await Patient.createCollection();
    await Patient.collection.createIndex({ uhid: 1 }, { unique: true });
    await Patient.collection.createIndex({ phone: 1 });
    await Patient.collection.createIndex({ status: 1 });
    console.log('✅ Patients collection created with indexes');

    // Appointments collection
    await Appointment.createCollection();
    await Appointment.collection.createIndex({ appointmentId: 1 }, { unique: true });
    await Appointment.collection.createIndex({ doctor: 1, scheduledAt: 1 });
    await Appointment.collection.createIndex({ status: 1 });
    await Appointment.collection.createIndex({ patient: 1 });
    console.log('✅ Appointments collection created with indexes');

    // EMR collection
    await EMR.createCollection();
    await EMR.collection.createIndex({ uhid: 1 });
    await EMR.collection.createIndex({ deleted: 1 });
    await EMR.collection.createIndex({ createdAt: -1 });
    console.log('✅ EMR collection created with indexes');

    // Bills collection
    await Bill.createCollection();
    await Bill.collection.createIndex({ invoiceId: 1 }, { unique: true });
    await Bill.collection.createIndex({ patient: 1 });
    await Bill.collection.createIndex({ status: 1 });
    await Bill.collection.createIndex({ createdAt: -1 });
    console.log('✅ Bills collection created with indexes');

    // Pharmacy collection
    await PharmacyItem.createCollection();
    await PharmacyItem.collection.createIndex({ name: 1 });
    await PharmacyItem.collection.createIndex({ category: 1 });
    await PharmacyItem.collection.createIndex({ expiryDate: 1 });
    await PharmacyItem.collection.createIndex({ medicineMasterId: 1 });
    await PharmacyItem.collection.createIndex({ medicineCategoryId: 1 });
    await PharmacyItem.collection.createIndex({ vendorId: 1 });
    console.log('✅ Pharmacy collection created with indexes');

    // Sales collection
    const Sale = require('../models/Sale');
    await Sale.createCollection();
    await Sale.collection.createIndex({ medicineId: 1 });
    await Sale.collection.createIndex({ billId: 1 });
    await Sale.collection.createIndex({ soldBy: 1 });
    await Sale.collection.createIndex({ department: 1 });
    await Sale.collection.createIndex({ date: -1 });
    console.log('✅ Sales collection created with indexes');

    // Create admin user
    console.log('🔄 Creating admin user...');
    const existingAdmin = await User.findOne({ email: 'admin@hospital.local' });
    if (!existingAdmin) {
      const adminUser = new User({
        name: 'System Admin',
        email: 'admin@hospital.local',
        password: 'Admin@123456',
        role: 'admin'
      });
      await adminUser.save();
      console.log('✅ Admin user created: admin@hospital.local / Admin@123456');
    } else {
      console.log('ℹ️ Admin user already exists');
    }

    // Create sample data
    console.log('🔄 Creating sample data...');

    // Sample patients
    const samplePatients = [
      {
        name: 'John Doe',
        age: 35,
        gender: 'Male',
        phone: '+1234567890',
        email: 'john.doe@email.com',
        address: '123 Main St, City, State',
        status: 'Active',
        notes: 'Regular patient, no known allergies'
      },
      {
        name: 'Jane Smith',
        age: 28,
        gender: 'Female',
        phone: '+1234567891',
        email: 'jane.smith@email.com',
        address: '456 Oak Ave, City, State',
        status: 'Active',
        notes: 'First visit patient'
      },
      {
        name: 'Robert Johnson',
        age: 45,
        gender: 'Male',
        phone: '+1234567892',
        email: 'robert.j@email.com',
        address: '789 Pine Rd, City, State',
        status: 'Active',
        notes: 'Hypertension patient'
      }
    ];

    for (const patientData of samplePatients) {
      const existingPatient = await Patient.findOne({ phone: patientData.phone });
      if (!existingPatient) {
        const patient = new Patient(patientData);
        await patient.save();
        console.log(`✅ Created patient: ${patient.name} (UHID: ${patient.uhid})`);
      }
    }

    // Sample doctors
    const sampleDoctors = [
      {
        name: 'Dr. Sarah Wilson',
        email: 'sarah.wilson@hospital.com',
        password: 'Doctor@123',
        role: 'doctor',
        specialization: 'Cardiology',
        experience: 12,
        phone: '+1234567893',
        availability: 'Available'
      },
      {
        name: 'Dr. Michael Brown',
        email: 'michael.brown@hospital.com',
        password: 'Doctor@123',
        role: 'doctor',
        specialization: 'General Medicine',
        experience: 8,
        phone: '+1234567894',
        availability: 'Available'
      }
    ];

    for (const doctorData of sampleDoctors) {
      const existingDoctor = await User.findOne({ email: doctorData.email });
      if (!existingDoctor) {
        const doctor = new User(doctorData);
        await doctor.save();
        console.log(`✅ Created doctor: ${doctor.name} (${doctor.specialization})`);
      }
    }

    // Sample pharmacy items
    const samplePharmacyItems = [
      {
        name: 'Paracetamol 500mg',
        sku: 'PARA500',
        category: 'Pain Relief',
        quantity: 100,
        minStock: 20,
        unitPrice: 2.50,
        expiryDate: new Date('2026-12-31')
      },
      {
        name: 'Amoxicillin 250mg',
        sku: 'AMOX250',
        category: 'Antibiotics',
        quantity: 50,
        minStock: 10,
        unitPrice: 5.00,
        expiryDate: new Date('2026-10-15')
      },
      {
        name: 'Vitamin D3 1000IU',
        sku: 'VITD1000',
        category: 'Supplements',
        quantity: 75,
        minStock: 15,
        unitPrice: 8.50,
        expiryDate: new Date('2027-06-30')
      }
    ];

    for (const itemData of samplePharmacyItems) {
      const existingItem = await PharmacyItem.findOne({ sku: itemData.sku });
      if (!existingItem) {
        const item = new PharmacyItem(itemData);
        await item.save();
        console.log(`✅ Created pharmacy item: ${item.name} (${item.quantity} units)`);
      }
    }

    console.log('\n🎉 Database setup completed successfully!');
    console.log('\n📊 Database Structure:');
    console.log('├── users (Admin, Doctors, Nurses, Receptionists)');
    console.log('├── patients (Patient records with auto-generated UHIDs)');
    console.log('├── appointments (Appointment scheduling)');
    console.log('├── emrs (Electronic Medical Records)');
    console.log('├── bills (Billing and invoices)');
    console.log('└── pharmacyitems (Pharmacy inventory)');

    console.log('\n🔐 Login Credentials:');
    console.log('Admin: admin@hospital.local / Admin@123456');
    console.log('Doctor: sarah.wilson@hospital.com / Doctor@123');
    console.log('Doctor: michael.brown@hospital.com / Doctor@123');

    console.log('\n📋 Sample Data Created:');
    console.log('• 3 Sample patients with auto-generated UHIDs');
    console.log('• 2 Sample doctors');
    console.log('• 3 Sample pharmacy items');

    console.log('\n🔍 To view data in MongoDB:');
    console.log('1. Open MongoDB Compass');
    console.log('2. Connect to: mongodb://localhost:27017');
    console.log('3. Select database: his_db');
    console.log('4. Browse collections: users, patients, appointments, emrs, bills, pharmacyitems');

  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run setup if called directly
if (require.main === module) {
  setupDatabase();
}

module.exports = { setupDatabase };