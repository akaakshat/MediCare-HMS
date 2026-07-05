const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const perms = require('../config/permissions');
const {
  getIcdCodes,
  createIcdCode,
  updateIcdCode,
  deleteIcdCode,
  getPatientIcdHistory,
  createPatientIcdMapping,
  updatePatientIcdMapping,
  deletePatientIcdMapping,
  getIcdReport,
} = require('../controllers/icdController');

// ICD master data (read-only via import; no creation endpoint)
router.get('/', protect, authorize(perms.icdView), getIcdCodes);
// router.post('/', protect, authorize(perms.icdManage), createIcdCode); // disabled by policy
router.put('/:id', protect, authorize(perms.icdManage), updateIcdCode);
router.delete('/:id', protect, authorize(perms.icdManage), deleteIcdCode);

// Patient ICD mappings / history
router.get('/patient/:patientId', protect, authorize(perms.icdView), getPatientIcdHistory);
router.post('/patient/:patientId', protect, authorize(perms.icdManage), createPatientIcdMapping);
router.put('/patient/:patientId/:mappingId', protect, authorize(perms.icdManage), updatePatientIcdMapping);
router.delete('/patient/:patientId/:mappingId', protect, authorize(perms.icdManage), deletePatientIcdMapping);

// Reports and filters
router.get('/reports', protect, authorize(perms.icdView), getIcdReport);

module.exports = router;
