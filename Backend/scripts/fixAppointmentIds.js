require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Appointment = require('../models/Appoinment');

const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/his_db';

(async () => {
  try {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    const missing = await Appointment.find({ appointmentId: { $exists: false } }).sort({ createdAt: 1 }).lean();
    if (missing.length === 0) {
      console.log('No appointments missing appointmentId');
      process.exit(0);
    }

    // Determine starting number based on latest existing APT###
    const lastWithId = await Appointment.findOne({ appointmentId: { $exists: true } })
      .sort({ createdAt: -1 })
      .lean();

    let nextNumber = 1;
    if (lastWithId && lastWithId.appointmentId) {
      const match = String(lastWithId.appointmentId).match(/APT(\d+)/);
      if (match) nextNumber = Number(match[1]) + 1;
    }

    for (const ap of missing) {
      const appointmentId = `APT${String(nextNumber).padStart(4, '0')}`;
      await Appointment.findByIdAndUpdate(ap._id, { appointmentId });
      console.log(`Assigned ${appointmentId} to ${ap._id}`);
      nextNumber += 1;
    }

    console.log('Done updating appointment IDs');
    process.exit(0);
  } catch (err) {
    console.error('Error updating appointment IDs:', err);
    process.exit(1);
  }
})();
