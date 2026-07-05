const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const perms = require('../config/permissions');
const { getEMRRecords, createEMRRecord, updateEMRRecord, deleteEMRRecord } = require('../controllers/emrController');

// EMR access: view and creation controlled by centralized permissions
router.get('/', protect, authorize(perms.emrView), getEMRRecords);
router.post('/', protect, authorize(perms.emrCreate), createEMRRecord);
router.put('/:id', protect, authorize(perms.emrUpdate), updateEMRRecord);
router.delete('/:id', protect, authorize(perms.emrDelete), deleteEMRRecord);

module.exports = router;
