const SupportArticle = require('../models/SupportArticle');

exports.listSupportArticles = async (req, res) => {
  try {
    const articles = await SupportArticle.find({ isActive: true }).sort({ createdAt: -1 });
    res.json({ success: true, articles });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Failed to load support articles' });
  }
};

exports.createSupportArticle = async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only administrators can manage support articles' });
    }

    const article = new SupportArticle({
      ...req.body,
      createdBy: req.user.id,
    });

    await article.save();
    res.status(201).json({ success: true, article });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Failed to create support article' });
  }
};

exports.updateSupportArticle = async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only administrators can manage support articles' });
    }

    const article = await SupportArticle.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!article) {
      return res.status(404).json({ success: false, message: 'Support article not found' });
    }

    res.json({ success: true, article });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Failed to update support article' });
  }
};

exports.deleteSupportArticle = async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only administrators can manage support articles' });
    }

    const article = await SupportArticle.findByIdAndDelete(req.params.id);
    if (!article) {
      return res.status(404).json({ success: false, message: 'Support article not found' });
    }

    res.json({ success: true, message: 'Support article deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Failed to delete support article' });
  }
};
