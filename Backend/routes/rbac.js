const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { getPermissionCatalog, getUserEffectivePermissions } = require('../controllers/rbacController');

router.get('/permissions', protect, authorize('roles.view', 'users.view', 'settings.view'), getPermissionCatalog);
router.get('/permissions/me', protect, getUserEffectivePermissions);

module.exports = router;
