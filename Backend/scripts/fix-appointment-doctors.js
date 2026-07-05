const mongoose = require('mongoose');
const User = require('../models/User');
const Appointment = require('../models/Appoinment');

async function fixAppointmentDoctors() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect('mongodb://localhost:27017/his_db', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB\n');

    // Get all doctors
    const doctors = await User.find({ role: 'doctor' }).select('_id name');
    const doctorMap = {};
    doctors.forEach(d => {
      doctorMap[d._id.toString()] = d.name;
    });

    console.log('Doctor map:', doctorMap);

    // Find appointments where doctor is an ObjectId string
    const appointments = await Appointment.find({});
    let updated = 0;

    for (const appt of appointments) {
      if (appt.doctor && doctorMap[appt.doctor]) {
        console.log(`Updating appointment ${appt._id}: doctor ${appt.doctor} -> ${doctorMap[appt.doctor]}`);
        appt.doctor = doctorMap[appt.doctor];
        await appt.save();
        updated++;
      }
    }

    console.log(`✅ Updated ${updated} appointments`);
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err);
    await mongoose.disconnect();
  }
}

fixAppointmentDoctors();