const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const perms = require('../config/permissions');
const {
  createPatient,
  getPatients,
  getPatientById,
  updatePatient,
  deletePatient,
  checkPhone
} = require('../controllers/patientController');

const { getPatientByUHID } = require('../controllers/patientController');

// Permission-protected patient routes
// Allow receptionists and staff to add patients; doctors/nurses can view; updates allowed for receptionist, staff and doctor
router.post('/', protect, authorize(perms.patientCreate), createPatient);
router.get('/', protect, authorize(perms.patientView), getPatients);
// lookup by UHID (useful for appointment quick-fill)
router.get('/uhid/:uhid', protect, authorize(perms.patientView), getPatientByUHID);
router.get('/check-phone/:phone', protect, authorize(perms.patientView), checkPhone);
router.get('/:id', protect, authorize(perms.patientView), getPatientById);
router.put('/:id', protect, authorize(perms.patientModify), updatePatient);
router.delete('/:id', protect, authorize(perms.patientDelete), deletePatient);

module.exports = router;
