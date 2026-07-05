const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const perms = require('../config/permissions');
const { getItems, createItem, updateItem, deleteItem } = require('../controllers/pharmacyController');

// Pharmacy: inventory management by admin and staff
router.get('/', protect, authorize(perms.pharmacyView), getItems);
router.post('/', protect, authorize(perms.pharmacyCreate), createItem);
router.put('/:id', protect, authorize(perms.pharmacyUpdate), updateItem);
router.delete('/:id', protect, authorize(perms.pharmacyDelete), deleteItem);

module.exports = router;
