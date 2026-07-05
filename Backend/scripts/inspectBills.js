const connectDB = require('../config/db');
const Bill = require('../models/Bill');

async function run() {
  await connectDB();
  const bills = await Bill.find().limit(5).lean();
  console.log('Sample bills:');
  bills.forEach((b, i) => {
    console.log('--- bill', i, '---');
    console.log('id', b._id);
    console.log('patientName', b.patientName, typeof b.patientName);
    console.log('patient', b.patient, typeof b.patient);
    console.log('uhid', b.uhid, 'date', b.date);
  });
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
