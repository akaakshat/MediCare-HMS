const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { getClinicalAlertSummary, evaluateClinicalAlerts } = require('../controllers/alertsController');

router.get('/summary', protect, authorize(), getClinicalAlertSummary);
router.post('/evaluate', protect, authorize(), evaluateClinicalAlerts);

module.exports = router;
