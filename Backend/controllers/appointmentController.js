const Appointment = require('../models/Appoinment');
const Patient = require('../models/Patient');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const mongoose = require('mongoose');
const mdmIntegration = require('../utils/mdmIntegration');
const { updatePatientActivity } = require('../utils/patientActivity');
const { attachOptimizerInsights } = require('../services/appointmentOptimizer');

const escapeRegex = (text) => (typeof text === 'string' ? text.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&') : text);
const normalizePriority = (value) => {
  const normalized = String(value || '').trim();
  if (['Emergency', 'Urgent', 'Normal', 'Routine'].includes(normalized)) return normalized;
  return 'Normal';
};

exports.createAppointment = async (req, res) => {
  try {
    console.log('createAppointment called, body:', req.body);
    const payload = { ...req.body };

    // Resolve patient: accept ObjectId, UHID (payload.uhid) or patient name + phone
    let patientId = payload.patient;
    if (patientId && typeof patientId === 'string') {
      // If it's a valid ObjectId, keep it
      if (mongoose.Types.ObjectId.isValid(patientId)) {
        // ok
      } else {
        // Try UHID lookup first
        if (payload.uhid) {
          const p = await Patient.findOne({ uhid: payload.uhid });
          if (p) patientId = p._id;
        }

        // Try find by name+phone
        if (!mongoose.Types.ObjectId.isValid(patientId) && payload.patient) {
          const query = { name: payload.patient };
          if (payload.phone) query.phone = payload.phone;
          let p = await Patient.findOne(query);
          if (p) {
            patientId = p._id;
          } else {
            // Create a minimal patient record if name provided
            const newP = new Patient({ name: payload.patient, phone: payload.phone || '' });
            await newP.save();
            patientId = newP._id;
          }
        }
      }
    }

    if (!patientId || !mongoose.Types.ObjectId.isValid(String(patientId))) {
      return res.status(400).json({ success: false, message: 'Patient information missing or invalid (provide patient id, uhid, or name)' });
    }

    payload.patient = patientId;

    if (payload.statusId) {
      const valid = await mdmIntegration.validateMasterId('appointment_status', payload.statusId);
      if (!valid) return res.status(400).json({ success: false, message: 'Invalid statusId provided' });
      const master = await mdmIntegration.getMasterById(payload.statusId);
      payload.status = master?.name || payload.status;
    }
    if (payload.visitTypeId) {
      const valid = await mdmIntegration.validateMasterId('visit_type', payload.visitTypeId);
      if (!valid) return res.status(400).json({ success: false, message: 'Invalid visitTypeId provided' });
    }
    if (payload.consultationTypeId) {
      const valid = await mdmIntegration.validateMasterId('consultation_type', payload.consultationTypeId);
      if (!valid) return res.status(400).json({ success: false, message: 'Invalid consultationTypeId provided' });
    }

    payload.priority = normalizePriority(payload.priority);

    // Build scheduledAt from date + time if provided
    if (!payload.scheduledAt && payload.date) {
      const timePart = payload.time || '09:00';
      const iso = `${payload.date}T${timePart}:00`;
      const dt = new Date(iso);
      if (!isNaN(dt.getTime())) payload.scheduledAt = dt;
    }

    if (!payload.scheduledAt) {
      return res.status(400).json({ success: false, message: 'scheduledAt is required (provide date and time)' });
    }

    // Validate slot capacity if doctor is specified
    if (payload.doctor) {
      const doctorName = String(payload.doctor).trim();
      const doctor = await User.findOne({ name: doctorName, role: 'doctor' }).select('availabilitySchedule slotCapacities');
      if (doctor) {
        const scheduledDate = new Date(payload.scheduledAt);
        const slotDate = scheduledDate.toISOString().split('T')[0];
        const scheduledTime = `${String(scheduledDate.getHours()).padStart(2, '0')}:${String(scheduledDate.getMinutes()).padStart(2, '0')}`;

        // Determine slot key from payload.slot if provided, else infer from availabilitySchedule
        let slotKey = payload.slot;

        if (!slotKey && Array.isArray(doctor.availabilitySchedule)) {
          for (const slot of doctor.availabilitySchedule) {
            if (!slot.includes('|')) continue;
            const [datePart, timeRange] = slot.split('|');
            if (datePart !== slotDate) continue;
            const [startTime, endTime] = timeRange.split('-');
            if (!startTime || !endTime) continue;

            const start = new Date(`${datePart}T${startTime}:00`);
            const end = new Date(`${datePart}T${endTime}:00`);
            if (scheduledDate >= start && scheduledDate < end) {
              slotKey = slot;
              break;
            }
          }
        }

        if (slotKey) {
          const [datePart, timeRange] = slotKey.split('|');
          const [startTime, endTime] = timeRange.split('-');

          const maxCapacity = doctor.slotCapacities?.[slotKey] || 1;
          const slotStart = new Date(`${datePart}T${startTime}:00`);
          const slotEnd = new Date(`${datePart}T${endTime}:00`);

          const bookedCount = await Appointment.countDocuments({
            doctor: doctorName,
            scheduledAt: { $gte: slotStart, $lt: slotEnd },
          });

          if (bookedCount >= maxCapacity) {
            return res.status(400).json({
              success: false,
              message: `This appointment slot is at full capacity (${bookedCount}/${maxCapacity})`,
            });
          }
        }
      }
    }

    let existingSameNumber = [];
    if (payload.appointmentId) {
      existingSameNumber = await Appointment.find({ appointmentId: payload.appointmentId }).populate('patient');
    }

    const ap = new Appointment(payload);
    const saved = await ap.save();

    await AuditLog.log(
      'CREATE',
      saved._id,
      req.user,
      'APPOINTMENT',
      saved._id,
      null,
      `Appointment created for patient ${payload.patient} on ${saved.scheduledAt}`,
      req.ip,
      req.headers['user-agent'],
      { doctor: saved.doctor, appointmentId: saved.appointmentId }
    );

    const allAppointments = await Appointment.find({})
      .populate('patient')
      .populate('statusId visitTypeId consultationTypeId')
      .sort({ scheduledAt: 1 });
    const decoratedAppointments = attachOptimizerInsights(allAppointments);
    const savedAppointment = decoratedAppointments.find((appointment) => String(appointment._id) === String(saved._id)) || {
      ...(saved.toObject ? saved.toObject() : saved),
      optimizer: null,
      optimizerDashboard: null,
    };

    await updatePatientActivity(payload.patient);

    if (existingSameNumber.length > 0) {
      const duplicateUHIDs = existingSameNumber.map((appt) => {
        if (appt.patient && typeof appt.patient === 'object') return appt.patient.uhid || null;
        return null;
      }).filter(Boolean);

      return res.status(201).json({
        success: true,
        appointment: saved,
        message: `Appointment number ${payload.appointmentId} is used by ${existingSameNumber.length} other appointments`,
        duplicateUHIDs,
        relatedAppointments: existingSameNumber,
      });
    }

    res.status(201).json({
      success: true,
      appointment: savedAppointment,
      optimizer: savedAppointment.optimizer,
      optimizerDashboard: savedAppointment.optimizerDashboard,
    });
  } catch (err) {
    console.error('createAppointment error:', err);
    console.error('Stack:', err.stack);
    // Return the underlying error message to help frontend debug validation issues
    res.status(500).json({ success: false, message: err.message || 'Error creating appointment' });
  }
};

exports.getAppointments = async (req, res) => {
  try {
    console.log('getAppointments called, query:', req.query);

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(5, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const { search, patient, doctor, date, status } = req.query;
    const query = {};

    // Doctors should only see appointments assigned to them
    if (req.user?.role === 'doctor') {
      let doctorName = req.user.name;
      if (!doctorName) {
        const user = await User.findById(req.user.id).select('name');
        doctorName = user?.name;
      }
      query.doctor = { $regex: new RegExp(`^${escapeRegex(doctorName || '')}$`, 'i') };
    }

    if (patient) {
      // allow searching by patient name or patient id
      query.$or = [
        { patient: mongoose.Types.ObjectId.isValid(String(patient)) ? patient : undefined },
        { patient: { $regex: new RegExp(escapeRegex(String(patient)), 'i') } }
      ].filter(Boolean);
    }

    if (doctor) {
      query.doctor = { $regex: new RegExp(escapeRegex(String(doctor)), 'i') };
    }

    if (date) {
      query.date = String(date);
    }

    if (status) {
      query.status = String(status);
    }

    if (req.query.appointmentId) {
      query.appointmentId = String(req.query.appointmentId);
    }

    if (search) {
      const regex = new RegExp(escapeRegex(String(search)), 'i');
      query.$or = [
        { reason: regex },
        { doctor: regex },
        { status: regex },
        { appointmentId: regex }
      ];
    }

    const [total, appointments] = await Promise.all([
      Appointment.countDocuments(query),
      Appointment.find(query)
        .populate('patient')
        .populate('statusId visitTypeId consultationTypeId')
        .sort({ scheduledAt: 1 })
        .skip(skip)
        .limit(limit)
    ]);

    const totalPages = Math.ceil(total / limit);
    const decoratedAppointments = attachOptimizerInsights(appointments);

    res.json({ success: true, appointments: decoratedAppointments, pagination: { page, limit, total, totalPages }, optimizerDashboard: attachOptimizerInsights(appointments)[0]?.optimizerDashboard || null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error fetching appointments', error: err.message });
  }
};

exports.getAppointmentById = async (req, res) => {
  try {
    const ap = await Appointment.findById(req.params.id)
      .populate('patient')
      .populate('statusId visitTypeId consultationTypeId');
    if (!ap) return res.status(404).json({ success: false, message: 'Not found' });

    if (req.user?.role === 'doctor') {
      let doctorName = req.user.name;
      if (!doctorName) {
        const user = await User.findById(req.user.id).select('name');
        doctorName = user?.name;
      }

      const appointmentDoctorName = typeof ap.doctor === 'string'
        ? ap.doctor
        : (ap.doctor && typeof ap.doctor === 'object' ? ap.doctor.name || ap.doctor.email || '' : '');
      const matches = appointmentDoctorName.toLowerCase() === (doctorName || '').toLowerCase();
      if (!matches) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }
    }

    const decoratedAppointments = attachOptimizerInsights([ap]);
    const decoratedAppointment = decoratedAppointments[0] || ap;
    res.json({ success: true, appointment: decoratedAppointment, optimizer: decoratedAppointment.optimizer, optimizerDashboard: decoratedAppointment.optimizerDashboard });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

exports.updateAppointment = async (req, res) => {
  try {
    console.log('updateAppointment called, id:', req.params.id, 'body:', req.body);

    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ success: false, message: 'Not found' });

    if (req.user?.role === 'doctor') {
      let doctorName = req.user.name;
      if (!doctorName) {
        const user = await User.findById(req.user.id).select('name');
        doctorName = user?.name;
      }

      const appointmentDoctorName = typeof appointment.doctor === 'string'
        ? appointment.doctor
        : (appointment.doctor && typeof appointment.doctor === 'object' ? appointment.doctor.name || appointment.doctor.email || '' : '');
      const matches = appointmentDoctorName.toLowerCase() === (doctorName || '').toLowerCase();
      if (!matches) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }
    }

    const payload = { ...req.body };

    if (payload.statusId) {
      const valid = await mdmIntegration.validateMasterId('appointment_status', payload.statusId);
      if (!valid) return res.status(400).json({ success: false, message: 'Invalid statusId provided' });
      const master = await mdmIntegration.getMasterById(payload.statusId);
      payload.status = master?.name || payload.status;
    }
    if (payload.visitTypeId) {
      const valid = await mdmIntegration.validateMasterId('visit_type', payload.visitTypeId);
      if (!valid) return res.status(400).json({ success: false, message: 'Invalid visitTypeId provided' });
    }
    if (payload.consultationTypeId) {
      const valid = await mdmIntegration.validateMasterId('consultation_type', payload.consultationTypeId);
      if (!valid) return res.status(400).json({ success: false, message: 'Invalid consultationTypeId provided' });
    }

    payload.priority = normalizePriority(payload.priority);

    // Normalize patient similar to createAppointment: accept ObjectId, UHID, or name+phone
    let patientId = payload.patient;
    if (patientId && typeof patientId === 'object' && patientId._id) {
      patientId = patientId._id;
    }

    if (patientId && typeof patientId === 'string') {
      if (mongoose.Types.ObjectId.isValid(patientId)) {
        // ok
      } else {
        // Try UHID lookup first
        if (payload.uhid) {
          const p = await Patient.findOne({ uhid: payload.uhid });
          if (p) patientId = p._id;
        }

        // Try find by name+phone
        if (!mongoose.Types.ObjectId.isValid(patientId) && payload.patient) {
          const query = { name: payload.patient };
          if (payload.phone) query.phone = payload.phone;
          let p = await Patient.findOne(query);
          if (p) {
            patientId = p._id;
          } else {
            const newP = new Patient({ name: payload.patient, phone: payload.phone || '' });
            await newP.save();
            patientId = newP._id;
          }
        }
      }
    }

    if (!patientId || !mongoose.Types.ObjectId.isValid(String(patientId))) {
      return res.status(400).json({ success: false, message: 'Patient information missing or invalid (provide patient id, uhid, or name)' });
    }

    payload.patient = patientId;

    // Build scheduledAt from date + time if provided
    if (!payload.scheduledAt && payload.date) {
      const timePart = payload.time || '09:00';
      const iso = `${payload.date}T${timePart}:00`;
      const dt = new Date(iso);
      if (!isNaN(dt.getTime())) payload.scheduledAt = dt;
    }

    const ap = await Appointment.findByIdAndUpdate(req.params.id, payload, { new: true });
    const decoratedAppointments = attachOptimizerInsights([ap]);
    const decoratedAppointment = decoratedAppointments[0] || ap;
    await updatePatientActivity(payload.patient);
    res.json({ success: true, appointment: decoratedAppointment, optimizer: decoratedAppointment.optimizer, optimizerDashboard: decoratedAppointment.optimizerDashboard });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

exports.deleteAppointment = async (req, res) => {
  try {
    // Accept either Mongo _id or appointmentId (e.g. APT0001) to support frontend inputs
    const requestedId = req.params.id;
    let appointment = null;

    if (mongoose.isValidObjectId(requestedId)) {
      appointment = await Appointment.findById(requestedId);
    }

    if (!appointment) {
      appointment = await Appointment.findOne({ appointmentId: requestedId });
    }

    if (!appointment) return res.status(404).json({ success: false, message: 'Not found' });

    if (req.user?.role === 'doctor') {
      let doctorName = req.user.name;
      if (!doctorName) {
        const user = await User.findById(req.user.id).select('name');
        doctorName = user?.name;
      }

      const appointmentDoctorName = typeof appointment.doctor === 'string'
        ? appointment.doctor
        : (appointment.doctor && typeof appointment.doctor === 'object' ? appointment.doctor.name || appointment.doctor.email || '' : '');
      const matches = appointmentDoctorName.toLowerCase() === (doctorName || '').toLowerCase();
      if (!matches) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }
    }

    await AuditLog.log(
      'DELETE',
      appointment._id,
      req.user,
      'APPOINTMENT',
      appointment._id,
      null,
      `Appointment deleted: ${appointment.appointmentId || appointment._id}`,
      req.ip,
      req.headers['user-agent'],
      { doctor: appointment.doctor }
    );

    await appointment.deleteOne();
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};
