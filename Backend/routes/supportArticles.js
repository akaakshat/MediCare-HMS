const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { listSupportArticles, createSupportArticle, updateSupportArticle, deleteSupportArticle } = require('../controllers/supportArticleController');

router.get('/', protect, listSupportArticles);
router.post('/', protect, createSupportArticle);
router.put('/:id', protect, updateSupportArticle);
router.delete('/:id', protect, deleteSupportArticle);

module.exports = router;
