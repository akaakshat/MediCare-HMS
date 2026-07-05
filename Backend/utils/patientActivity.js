const Patient = require('../models/Patient');

const updatePatientActivity = async (patientId) => {
  if (!patientId) return null;
  try {
    if (typeof patientId !== 'string' && patientId._id) {
      patientId = String(patientId._id);
    }
    if (!patientId || !patientId.toString().match(/^[0-9a-fA-F]{24}$/)) return null;

    return Patient.findByIdAndUpdate(
      patientId,
      { $set: { lastActivityDate: new Date(), isInactive: false } },
      { new: true }
    );
  } catch (err) {
    console.error('Failed to update patient activity:', err);
    return null;
  }
};

const updatePatientActivityByUHID = async (uhid) => {
  if (!uhid) return null;
  try {
    return Patient.findOneAndUpdate(
      { uhid: String(uhid) },
      { $set: { lastActivityDate: new Date(), isInactive: false } },
      { new: true }
    );
  } catch (err) {
    console.error('Failed to update patient activity by UHID:', err);
    return null;
  }
};

module.exports = {
  updatePatientActivity,
  updatePatientActivityByUHID,
};
