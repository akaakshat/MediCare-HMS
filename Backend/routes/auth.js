const express = require('express');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const router = express.Router();
const { register, login, getSession, bootstrapAdmin } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

const getClientIp = (req) => {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || 'unknown-ip';
};

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (email) {
      return `login:user:${email}`;
    }
    return `login:ip:${ipKeyGenerator(getClientIp(req))}`;
  },
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
