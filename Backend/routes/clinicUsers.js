// routes/clinicUsers.js
// Clinic User Management routes with RBAC

const express = require('express');
const router = express.Router();
const clinicUserController = require('../controllers/clinicUserController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

// All routes require authentication
router.use(protect);

/**
 * Create new clinic user
 * POST /api/clinic-users
 * Admin only
 */
router.post('/', authorize('admin'), clinicUserController.createClinicUser);

/**
 * Get all clinic users with optional filters
 * GET /api/clinic-users
 * Query params: role, status
 */
router.get('/', authorize('admin'), clinicUserController.getAllClinicUsers);

/**
 * Get clinic user by ID
 * GET /api/clinic-users/:userId
 */
router.get('/:userId', authorize('admin'), clinicUserController.getClinicUser);

/**
 * Get users by role
 * GET /api/clinic-users/role/:role
 */
router.get('/role/:role', clinicUserController.getUsersByRole);

/**
 * Update clinic user
 * PUT /api/clinic-users/:userId
 * Admin only
 */
router.put('/:userId', authorize('admin'), clinicUserController.updateClinicUser);

/**
 * Delete clinic user (soft delete)
 * DELETE /api/clinic-users/:userId
 * Admin only
 */
router.delete('/:userId', authorize('admin'), clinicUserController.deleteClinicUser);

module.exports = router;
