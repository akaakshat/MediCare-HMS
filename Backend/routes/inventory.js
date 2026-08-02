const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const perms = require('../config/permissions');
const { getInventorySummary, recordSale, getSales } = require('../controllers/inventoryController');

router.get('/summary', protect, authorize(perms.pharmacyView), getInventorySummary);
router.post('/sales', protect, authorize(perms.pharmacyCreate), recordSale);
router.get('/sales', protect, authorize(perms.pharmacyView), getSales);

module.exports = router;
