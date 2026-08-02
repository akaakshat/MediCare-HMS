const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const syncController = require('../controllers/syncController');

router.post('/', protect, syncController.postSync);
router.post('/bulk', protect, syncController.postBulkSync);
router.get('/status', protect, syncController.getSyncStatus);
router.post('/conflict', protect, syncController.postConflict);
router.post('/process', protect, syncController.processSync);

module.exports = router;
