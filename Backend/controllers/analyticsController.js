const { generateDoctorAnalytics } = require('../services/doctorAnalyticsService');

exports.getDoctorPerformanceAnalytics = async (req, res) => {
  try {
    const { doctorId, range, fromDate, toDate, trendPeriod, revisitWindowDays } = req.query;
    const analytics = await generateDoctorAnalytics(req.user, {
      doctorId,
      range,
      fromDate,
      toDate,
      trendPeriod,
      revisitWindowDays,
    });

    return res.json({ success: true, analytics });
  } catch (error) {
    console.error('Error fetching doctor performance analytics:', error);
    return res.status(500).json({ success: false, message: 'Unable to fetch analytics', error: error.message });
  }
};
