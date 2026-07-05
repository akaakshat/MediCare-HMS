const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { getUsers, deleteUser, updateUser, getUserPermissions, updateUserPermissions } = require('../controllers/userController');

// GET all users (Admin only)
router.get('/', protect, authorize('admin'), getUsers);

// GET user with permissions (Admin only)
router.get('/:id/permissions', protect, authorize('admin'), getUserPermissions);

// PUT update user (Admin only)
router.put('/:id', protect, authorize('admin'), updateUser);

// PUT update user permissions (Admin only)
router.put('/:id/permissions', protect, authorize('admin'), updateUserPermissions);

// DELETE user (Admin only)
router.delete('/:id', protect, authorize('admin'), deleteUser);

module.exports = router;
