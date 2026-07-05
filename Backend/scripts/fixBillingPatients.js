const connectDB = require('../config/db');
const Bill = require('../models/Bill');
const Patient = require('../models/Patient');

async function run() {
  await connectDB();
  console.log('Connected to DB. Starting fix...');

  const bills = await Bill.find({
    $or: [
      { patientName: { $exists: false } },
      { uhid: { $exists: false } },
      { date: { $exists: false } },
      // If patientName is stored as an ObjectId string, fix it
      { patientName: { $regex: /^[0-9a-fA-F]{24}$/ } },
      // If patientName is stored as an actual ObjectId type, fix it too
      { patientName: { $type: 'objectId' } },
    ],
  }).lean();

  console.log(`Found ${bills.length} bills to scan`);

  let updated = 0;
  for (const bill of bills) {
    const updates = {};

    // Ensure date exists (use createdAt if missing)
    if (!bill.date && bill.createdAt) {
      updates.date = bill.createdAt;
    }

    // If patientName is a raw ObjectId string (from old bug), treat it as the patient reference
    let patientId = null;
    if (bill.patientName && typeof bill.patientName === 'string' && /^[0-9a-fA-F]{24}$/.test(bill.patientName)) {
      patientId = bill.patientName;
    }

    // Otherwise, use the patient reference field
    const patientRef = bill.patient;
    if (!patientId) {
      if (patientRef) {
        if (typeof patientRef === 'string' && /^[0-9a-fA-F]{24}$/.test(patientRef)) {
          patientId = patientRef;
        } else if (patientRef._id && /^[0-9a-fA-F]{24}$/.test(String(patientRef._id))) {
          patientId = String(patientRef._id);
        } else if (patientRef.id && /^[0-9a-fA-F]{24}$/.test(String(patientRef.id))) {
          patientId = String(patientRef.id);
        }
      }
    }

    if (patientId) {
      const patient = await Patient.findById(patientId).select('name uhid');
      if (patient) {
        if (!bill.patientName || (typeof bill.patientName === 'string' && /^[0-9a-fA-F]{24}$/.test(bill.patientName))) {
          updates.patientName = patient.name;
        }
        if (!bill.uhid) updates.uhid = patient.uhid;
        if (!bill.patient) updates.patient = patient._id;
      }
    }

    if (Object.keys(updates).length) {
      await Bill.updateOne({ _id: bill._id }, { $set: updates });
      updated += 1;
    }
  }

  console.log(`Completed. Updated ${updated} bill(s).`);
  process.exit(0);
}

run().catch((err) => {
  console.error('Error running fix script:', err);
  process.exit(1);
});
