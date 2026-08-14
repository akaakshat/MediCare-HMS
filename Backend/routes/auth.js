const express = require('express');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const router = express.Router();
const { register, login, getSession, bootstrapAdmin } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => ipKeyGenerator(req.ip || req.socket?.remoteAddress || 'unknown-ip'),
  message: {
    success: false,
    message: 'Too many login attempts. Please try again in 15 minutes.'
  }
});

// Only admin can register new users
router.post('/register', protect, authorize('admin'), register);
router.post('/login', loginLimiter, login);
router.get('/session', protect, getSession);
router.post('/bootstrap-admin', bootstrapAdmin);

module.exports = router;
