const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const perms = require('../config/permissions');
const { getBills, createBill, updateBill, deleteBill } = require('../controllers/billingController');

// Staff should be able to view and create billing entries as well
router.get('/', protect, authorize(perms.billingView), getBills);
router.post('/', protect, authorize(perms.billingCreate), createBill);
router.put('/:id', protect, authorize(perms.billingModify), updateBill);
router.delete('/:id', protect, authorize('admin'), deleteBill);

module.exports = router;
