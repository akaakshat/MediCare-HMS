const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const {
  getAllRoles,
  createRole,
  getRoleById,
  updateRole,
  deleteRole,
  updateRolePermissions,
  getRolePermissions
} = require('../controllers/roleController');

// All routes require authentication and admin authorization
router.use(protect);
router.use(authorize('admin'));

// Get all roles
router.get('/', getAllRoles);

// Create a new role
router.post('/', createRole);

// Get a specific role
router.get('/:id', getRoleById);

// Update a role
router.put('/:id', updateRole);

// Delete a role
router.delete('/:id', deleteRole);

// Update permissions for a role
router.put('/:id/permissions', updateRolePermissions);

// Get permissions for a role
router.get('/:id/permissions', getRolePermissions);

module.exports = router;
