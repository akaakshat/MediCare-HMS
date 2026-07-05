const Patient = require('../models/Patient');

const DAYS_TO_INACTIVE = parseInt(process.env.PATIENT_INACTIVE_DAYS || '30', 10);
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

const markInactivePatients = async () => {
  try {
    const cutoff = new Date(Date.now() - DAYS_TO_INACTIVE * MILLISECONDS_PER_DAY);
    const result = await Patient.updateMany(
      {
        isInactive: false,
        lastActivityDate: { $lt: cutoff }
      },
      {
        $set: { isInactive: true }
      }
    );
    console.log(`[InactivePatientJob] Marked ${result.modifiedCount || 0} patient(s) inactive. cutoff=${cutoff.toISOString()}`);
    return result;
  } catch (err) {
    console.error('[InactivePatientJob] Error marking inactive patients:', err);
    throw err;
  }
};

const scheduleInactivePatientJob = () => {
  const now = new Date();
  const nextRun = new Date(now);
  nextRun.setHours(2, 0, 0, 0);
  if (nextRun <= now) nextRun.setDate(nextRun.getDate() + 1);

  const delay = nextRun.getTime() - now.getTime();
  console.log(`[InactivePatientJob] Scheduling first run at ${nextRun.toISOString()} (in ${Math.round(delay / 1000)}s)`);

  setTimeout(async () => {
    try {
      await markInactivePatients();
    } catch (err) {
      console.error('[InactivePatientJob] Initial run failed:', err);
    }
    setInterval(() => {
      markInactivePatients().catch((err) => {
        console.error('[InactivePatientJob] Daily run failed:', err);
      });
    }, MILLISECONDS_PER_DAY);
  }, delay);
};

module.exports = { markInactivePatients, scheduleInactivePatientJob };
