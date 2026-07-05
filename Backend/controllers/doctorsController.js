const User = require('../models/User');
const mdmIntegration = require('../utils/mdmIntegration');

exports.getDoctors = async (req, res) => {
  try {
    console.log('GET /api/doctors called');
    // Doctors should only see their own profile
    if (req.user.role === 'doctor') {
      const self = await User.findById(req.user.id)
        .populate('specializationId', 'name code')
        .populate('departmentId', 'name code')
        .populate('qualificationIds', 'name code')
        .populate('licenseStatusId', 'name code')
        .select('-password')
        .lean();
      if (!self) return res.status(404).json({ success: false, message: 'Doctor not found' });
      return res.json({ success: true, doctors: [self] });
    }

    const doctors = await User.find({ role: 'doctor' })
      .populate('specializationId', 'name code')
      .populate('departmentId', 'name code')
      .populate('qualificationIds', 'name code')
      .populate('licenseStatusId', 'name code')
      .select('-password')
      .lean();
    res.json({ success: true, doctors });
  } catch (err) {
    console.error('Error fetching doctors:', err);
    res.status(500).json({ success: false, message: 'Error fetching doctors', error: err.message });
  }
};

// Normalize doctor names for comparison (trim space + case-insensitive)
const normalizeName = (name) => (typeof name === 'string' ? name.trim().toLowerCase() : '');

exports.createDoctor = async (req, res) => {
  try {
    const { name, email, specialization, experience, phone, availability, availabilitySchedule, specializationId, departmentId, qualificationIds, licenseStatusId } = req.body;
    if (!name || !email) return res.status(400).json({ success: false, message: 'Name and email are required' });

    // Do not allow duplicate emails
    const existingEmail = await User.findOne({ email });
    if (existingEmail) return res.status(400).json({ success: false, message: 'Email already exists' });

    // Do not allow duplicate doctor names
    const normalizedName = normalizeName(name);
    if (normalizedName) {
      const existingName = await User.findOne({
        role: 'doctor',
        name: { $regex: new RegExp(`^${normalizedName.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') }
      });
      if (existingName) return res.status(400).json({ success: false, message: 'Doctor with this name already exists' });
    }

    // Validate MDM references
    if (specializationId) {
      const valid = await mdmIntegration.validateMasterId('specialization', specializationId);
      if (!valid) return res.status(400).json({ success: false, message: 'Invalid specializationId provided' });
    }
    if (departmentId) {
      const valid = await mdmIntegration.validateMasterId('department', departmentId);
      if (!valid) return res.status(400).json({ success: false, message: 'Invalid departmentId provided' });
    }
    if (licenseStatusId) {
      const valid = await mdmIntegration.validateMasterId('license_status', licenseStatusId);
      if (!valid) return res.status(400).json({ success: false, message: 'Invalid licenseStatusId provided' });
    }
    if (Array.isArray(qualificationIds)) {
      for (const qId of qualificationIds) {
        const valid = await mdmIntegration.validateMasterId('qualification', qId);
        if (!valid) return res.status(400).json({ success: false, message: `Invalid qualification ID: ${qId}` });
      }
    }

    const password = (Math.random().toString(36).slice(2, 10)) || 'changeme';
    const user = new User({
      name,
      email,
      password,
      role: 'doctor',
      specialization,
      experience,
      phone,
      availability,
      availabilitySchedule: Array.isArray(availabilitySchedule) ? availabilitySchedule : [],
      specializationId,
      departmentId,
      qualificationIds: Array.isArray(qualificationIds) ? qualificationIds : [],
      licenseStatusId
    });
    await user.save();

    // Populate MDM references for response
    const populatedUser = await User.findById(user._id)
      .populate('specializationId', 'name code')
      .populate('departmentId', 'name code')
      .populate('qualificationIds', 'name code')
      .populate('licenseStatusId', 'name code')
      .select('-password')
      .lean();

    res.status(201).json({ success: true, doctor: populatedUser });
  } catch (err) {
    console.error('Error creating doctor:', err);
    res.status(500).json({ success: false, message: 'Error creating doctor', error: err.message });
  }
};

exports.updateDoctor = async (req, res) => {
  try {
    const id = req.params.id;
    const payload = { ...req.body };

    // Prevent role or password tampering via this endpoint
    delete payload.role;
    delete payload.password;

    // Only admin can update a doctor's availability schedule via this endpoint.
    // Doctors should use /doctors/:id/availability for their own schedule updates.
    if (req.user.role !== 'admin') {
      delete payload.availabilitySchedule;
    }

    // Validate MDM references if provided
    const { specializationId, departmentId, qualificationIds, licenseStatusId } = payload;
    if (specializationId) {
      const valid = await mdmIntegration.validateMasterId('specialization', specializationId);
      if (!valid) return res.status(400).json({ success: false, message: 'Invalid specializationId provided' });
    }
    if (departmentId) {
      const valid = await mdmIntegration.validateMasterId('department', departmentId);
      if (!valid) return res.status(400).json({ success: false, message: 'Invalid departmentId provided' });
    }
    if (licenseStatusId) {
      const valid = await mdmIntegration.validateMasterId('license_status', licenseStatusId);
      if (!valid) return res.status(400).json({ success: false, message: 'Invalid licenseStatusId provided' });
    }
    if (Array.isArray(qualificationIds)) {
      for (const qId of qualificationIds) {
        const valid = await mdmIntegration.validateMasterId('qualification', qId);
        if (!valid) return res.status(400).json({ success: false, message: `Invalid qualification ID: ${qId}` });
      }
    }

    // Ensure availability schedule is always an array of strings if provided
    if (payload.availabilitySchedule && !Array.isArray(payload.availabilitySchedule)) {
      payload.availabilitySchedule = [];
    }

    const updated = await User.findByIdAndUpdate(id, payload, { new: true })
      .populate('specializationId', 'name code')
      .populate('departmentId', 'name code')
      .populate('qualificationIds', 'name code')
      .populate('licenseStatusId', 'name code')
      .select('-password')
      .lean();

    if (!updated) return res.status(404).json({ success: false, message: 'Not Found' });
    res.json({ success: true, doctor: updated });
  } catch (err) {
    console.error('Error updating doctor:', err);
    res.status(500).json({ success: false, message: 'Error updating doctor', error: err.message });
  }
};

exports.deleteDoctor = async (req, res) => {
  try {
    const id = req.params.id;
    const deleted = await User.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Not Found' });
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    console.error('Error deleting doctor:', err);
    res.status(500).json({ success: false, message: 'Error deleting doctor', error: err.message });
  }
};

// Update availability schedule for a doctor (admin/receptionist can update any)
exports.updateDoctorAvailability = async (req, res) => {
  try {
    const id = req.params.id;

    // Allow only admin and receptionist to manage doctor schedules
    if (!['admin', 'receptionist'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const { availabilitySchedule } = req.body;
    if (!Array.isArray(availabilitySchedule)) {
      return res.status(400).json({ success: false, message: 'availabilitySchedule must be an array' });
    }

    const parse12h = (timeStr) => {
      const m = timeStr.trim().toUpperCase().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
      if (!m) return null;
      let hour = parseInt(m[1], 10);
      const min = m[2];
      const ampm = m[3];
      if (hour < 1 || hour > 12 || parseInt(min, 10) >= 60) return null;
      if (ampm === 'PM' && hour !== 12) hour += 12;
      if (ampm === 'AM' && hour === 12) hour = 0;
      return `${hour.toString().padStart(2, '0')}:${min}`;
    };

    const parseDate = (d) => {
      const [day, month, year] = d.trim().split('/').map((x) => parseInt(x, 10));
      if ([day, month, year].some((n) => Number.isNaN(n))) return null;
      const date = new Date(year, month - 1, day);
      if (date.getDate() !== day || date.getMonth() !== month - 1 || date.getFullYear() !== year) return null;
      return date;
    };

    const buildRangeSlots = (fromDate, toDate, startTime24, endTime24) => {
      const slots = [];
      let cursor = new Date(fromDate);
      while (cursor <= toDate) {
        const isoDate = cursor.toISOString().split('T')[0];
        slots.push(`${isoDate}|${startTime24}-${endTime24}`);
        cursor.setDate(cursor.getDate() + 1);
      }
      return slots;
    };

    const rawSlots = availabilitySchedule.map((val) => (typeof val === 'string' ? val.trim() : '')).filter(Boolean);
    const normalized = [];
    const invalidSlots = [];

    for (const value of rawSlots) {
      // format: "DD/MM/YYYY to DD/MM/YYYY 09:00 AM - 05:00 PM"
      const rangeMatch = value.match(/^\s*(\d{2}\/\d{2}\/\d{4})\s+to\s+(\d{2}\/\d{2}\/\d{4})\s+(\d{1,2}:\d{2}\s*(AM|PM))\s*-\s*(\d{1,2}:\d{2}\s*(AM|PM))\s*$/i);
      if (rangeMatch) {
        const fromDate = parseDate(rangeMatch[1]);
        const toDate = parseDate(rangeMatch[2]);
        const startTime = parse12h(rangeMatch[3]);
        const endTime = parse12h(rangeMatch[5]);

        if (!fromDate || !toDate || !startTime || !endTime || startTime >= endTime || fromDate > toDate) {
          invalidSlots.push(value);
          continue;
        }

        normalized.push(...buildRangeSlots(fromDate, toDate, startTime, endTime));
        continue;
      }

      // existing format: YYYY-MM-DD|HH:MM-HH:MM
      if (/^\d{4}-\d{2}-\d{2}\|\d{2}:\d{2}-\d{2}:\d{2}$/.test(value)) {
        normalized.push(value);
        continue;
      }

      // 12hr single day range: DD/MM/YYYY 09:00 AM - 05:00 PM
      const singleMatch = value.match(/^\s*(\d{2}\/\d{2}\/\d{4})\s+(\d{1,2}:\d{2}\s*(AM|PM))\s*-\s*(\d{1,2}:\d{2}\s*(AM|PM))\s*$/i);
      if (singleMatch) {
        const date = parseDate(singleMatch[1]);
        const startTime = parse12h(singleMatch[2]);
        const endTime = parse12h(singleMatch[4]);
        if (!date || !startTime || !endTime || startTime >= endTime) {
          invalidSlots.push(value);
          continue;
        }
        normalized.push(`${date.toISOString().split('T')[0]}|${startTime}-${endTime}`);
        continue;
      }

      // ISO date/time fallback
      const d = new Date(value);
      if (!Number.isNaN(d.getTime())) {
        normalized.push(d.toISOString());
        continue;
      }

      invalidSlots.push(value);
    }

    if (invalidSlots.length > 0) {
      console.warn('Invalid schedule entries provided for doctor availability:', invalidSlots);
      return res.status(400).json({
        success: false,
        message: 'Some schedule entries were invalid',
        invalidSlots,
        exampleValid:
          '01/03/2026 to 30/03/2026 09:00 AM - 05:00 PM or 01/03/2026 09:00 AM - 05:00 PM',
      });
    }

    const updated = await User.findByIdAndUpdate(
      id,
      { availabilitySchedule: normalized },
      { new: true }
    ).select('-password');

    if (!updated) return res.status(404).json({ success: false, message: 'Not Found' });
    res.json({ success: true, doctor: updated });
  } catch (err) {
    console.error('Error updating doctor availability:', err);
    res.status(500).json({ success: false, message: 'Error updating availability', error: err.message });
  }
};

// Get available appointment slots for a doctor on a specific date
exports.getDoctorSlots = async (req, res) => {
  try {
    const { doctorId, date } = req.query; // date format: YYYY-MM-DD

    if (!doctorId || !date) {
      return res.status(400).json({ success: false, message: 'doctorId and date are required' });
    }

    const doctor = await User.findById(doctorId).select('availabilitySchedule slotCapacities');
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }

    // Filter slots for the requested date
    const Appointment = require('../models/Appoinment');
    const slots = [];

    if (Array.isArray(doctor.availabilitySchedule)) {
      for (const slot of doctor.availabilitySchedule) {
        // Match date format: "YYYY-MM-DD|HH:MM-HH:MM"
        if (slot.includes('|')) {
          const [slotDate, timeRange] = slot.split('|');
          if (slotDate === date) {
            const [startTime, endTime] = timeRange.split('-');
            const maxCapacity = doctor.slotCapacities?.[slot] || 1;

            // Count current appointments for this slot
            const appointmentCount = await Appointment.countDocuments({
              doctor: doctorId,
              scheduledAt: {
                $gte: new Date(`${date}T${startTime}:00`),
                $lt: new Date(`${date}T${endTime}:00`)
              }
            });

            const availableSpots = Math.max(0, maxCapacity - appointmentCount);

            slots.push({
              slot,
              startTime,
              endTime,
              maxCapacity,
              bookedCount: appointmentCount,
              availableSpots,
              isAvailable: availableSpots > 0
            });
          }
        }
      }
    }

    res.json({ success: true, slots, date });
  } catch (err) {
    console.error('Error fetching doctor slots:', err);
    res.status(500).json({ success: false, message: 'Error fetching slots', error: err.message });
  }
};

// Update slot capacity for a doctor
exports.updateSlotCapacity = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { slotCapacities } = req.body; // Expected: { "slot-key": capacity_number, ... }

    if (!doctorId || !slotCapacities || typeof slotCapacities !== 'object') {
      return res.status(400).json({ success: false, message: 'doctorId and slotCapacities object are required' });
    }

    // Save slotCapacities as plain object
    const updated = await User.findByIdAndUpdate(
      doctorId,
      { slotCapacities },
      { new: true }
    ).select('-password');

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }

    res.json({ success: true, doctor: updated });
  } catch (err) {
    console.error('Error updating slot capacity:', err);
    res.status(500).json({ success: false, message: 'Error updating slot capacity', error: err.message });
  }
};
