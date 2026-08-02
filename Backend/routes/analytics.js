const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { getDoctorPerformanceAnalytics } = require('../controllers/analyticsController');

router.get('/doctor-performance', protect, authorize('admin', 'doctor'), getDoctorPerformanceAnalytics);

module.exports = router;
