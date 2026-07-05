const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const perms = require('../config/permissions');
const {
  createAppointment,
  getAppointments,
  getAppointmentById,
  updateAppointment,
  deleteAppointment
} = require('../controllers/appointmentController');

// Permission-protected appointment routes
router.get('/', protect, authorize(perms.appointmentView), getAppointments);
// Booking and modification should be limited to configured permissions
router.post('/', protect, authorize(perms.appointmentCreate), createAppointment);
router.get('/:id', protect, authorize(perms.appointmentView), getAppointmentById);
router.put('/:id', protect, authorize(perms.appointmentModify), updateAppointment);
// Deleting/cancelling appointments is restricted (use appointmentCancel permission)
router.delete('/:id', protect, authorize(perms.appointmentCancel), deleteAppointment);

module.exports = router;
