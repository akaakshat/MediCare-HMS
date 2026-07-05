const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getAiSupportReply } = require('../services/supportAssistantService');

router.post('/ask', protect, async (req, res) => {
  try {
    const { question, context = {}, articles = [] } = req.body || {};
    const result = await getAiSupportReply(question, context, articles);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Support assistant request failed.' });
  }
});

module.exports = router;
