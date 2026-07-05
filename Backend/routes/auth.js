const express = require('express');
const router = express.Router();
const { register, login, getSession, bootstrapAdmin } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

// Only admin can register new users
router.post('/register', protect, authorize('admin'), register);
router.post('/login', login);
router.get('/session', protect, getSession);
router.post('/bootstrap-admin', bootstrapAdmin);

module.exports = router;
