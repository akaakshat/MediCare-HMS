const { getClinicalAlertSummary, generateClinicalAlerts } = require('../services/clinicalAlertService');

exports.getClinicalAlertSummary = async (req, res) => {
  try {
    const summary = await getClinicalAlertSummary();
    res.json({ success: true, summary });
  } catch (err) {
    console.error('Error fetching clinical alert summary:', err);
    res.status(500).json({ success: false, message: 'Error fetching clinical alert summary', error: err.message });
  }
};

exports.evaluateClinicalAlerts = async (req, res) => {
  try {
    const payload = req.body || {};
    const alerts = await generateClinicalAlerts(payload);
    res.json({ success: true, alerts });
  } catch (err) {
    console.error('Error evaluating clinical alerts:', err);
    res.status(500).json({ success: false, message: 'Error evaluating clinical alerts', error: err.message });
  }
};
