const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const perms = require('../config/permissions');
const { getDoctors, createDoctor, updateDoctor, updateDoctorAvailability, deleteDoctor, getDoctorSlots, updateSlotCapacity } = require('../controllers/doctorsController');

// Allow users with doctor view permission to view doctors
router.get('/', protect, authorize(perms.doctorView), getDoctors);

// Get available slots for a doctor on a specific date
router.get('/slots/available', protect, authorize(perms.doctorView), getDoctorSlots);

// Create doctor - restricted to users who can create doctor records
router.post('/', protect, authorize(perms.doctorCreate), createDoctor);

// Update doctor - restricted to users with doctor edit permission
router.put('/:id', protect, authorize(perms.doctorEdit), updateDoctor);

// Update availability schedule - allowed for users with doctor edit permission
router.put('/:id/availability', protect, authorize(perms.doctorEdit), updateDoctorAvailability);

// Update slot capacities - allowed for users with doctor edit permission
router.put('/:doctorId/slots/capacity', protect, authorize(perms.doctorEdit), updateSlotCapacity);

// Delete doctor
router.delete('/:id', protect, authorize(perms.doctorDelete), deleteDoctor);

module.exports = router;
