const Patient = require('../models/Patient');
const Appointment = require('../models/Appoinment');
const mdmIntegration = require('../utils/mdmIntegration');
const escapeRegex = (text) => (typeof text === 'string' ? text.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&') : text);

const buildDoctorPatientScope = async (reqUser) => {
  if (!reqUser || String(reqUser.role || '').toLowerCase() !== 'doctor') {
    return null;
  }

  const doctorName = String(reqUser.name || '').trim();
  if (!doctorName) {
    return [];
  }

  const assignedPatientIds = await Appointment.find({
    doctor: { $regex: new RegExp(`^${escapeRegex(doctorName)}$`, 'i') }
  }).distinct('patient');

  return assignedPatientIds.filter(Boolean);
};

exports.createPatient = async (req, res) => {
  try {
    const { phone, uhid, genderId, bloodGroupId, maritalStatusId, patientTypeId, statusId } = req.body;
    let warning = null;

    if (phone) {
      const existing = await Patient.findOne({ phone });
      if (existing) {
        warning = `This number is already saved to UHID ${existing.uhid || existing._id}`;
      }
    }

    if (uhid) {
      const existingUhid = await Patient.findOne({ uhid });
      if (existingUhid) {
        return res.status(409).json({
          success: false,
          message: `UHID ${uhid} is already registered to another patient`
        });
      }
    }

    const payload = { ...req.body, lastActivityDate: new Date(), isInactive: false };

    if (genderId) {
      const valid = await mdmIntegration.validateMasterId('gender', genderId);
      if (!valid) return res.status(400).json({ success: false, message: 'Invalid genderId provided' });
      const master = await mdmIntegration.getMasterById(genderId);
      payload.gender = master?.name || payload.gender;
      payload.genderId = genderId;
    }
    if (bloodGroupId) {
      const valid = await mdmIntegration.validateMasterId('blood_group', bloodGroupId);
      if (!valid) return res.status(400).json({ success: false, message: 'Invalid bloodGroupId provided' });
      const master = await mdmIntegration.getMasterById(bloodGroupId);
      payload.bloodGroup = master?.name || payload.bloodGroup;
      payload.bloodGroupId = bloodGroupId;
    }
    if (maritalStatusId) {
      const valid = await mdmIntegration.validateMasterId('marital_status', maritalStatusId);
      if (!valid) return res.status(400).json({ success: false, message: 'Invalid maritalStatusId provided' });
      const master = await mdmIntegration.getMasterById(maritalStatusId);
      payload.maritalStatus = master?.name || payload.maritalStatus;
      payload.maritalStatusId = maritalStatusId;
    }
    if (patientTypeId) {
      const valid = await mdmIntegration.validateMasterId('patient_type', patientTypeId);
      if (!valid) return res.status(400).json({ success: false, message: 'Invalid patientTypeId provided' });
      const master = await mdmIntegration.getMasterById(patientTypeId);
      payload.patientType = master?.name || payload.patientType;
      payload.patientTypeId = patientTypeId;
    }
    if (statusId) {
      const valid = await mdmIntegration.validateMasterId('user_status', statusId);
      if (!valid) return res.status(400).json({ success: false, message: 'Invalid statusId provided' });
      const master = await mdmIntegration.getMasterById(statusId);
      payload.status = master?.name || payload.status;
      payload.statusId = statusId;
    }

    const patient = new Patient(payload);
    const saved = await patient.save();
    const populated = await Patient.findById(saved._id)
      .populate('genderId bloodGroupId maritalStatusId patientTypeId statusId');

    res.status(201).json({ success: true, patient: populated, warning });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error creating patient', error: err.message });
  }
};

exports.getPatients = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(5, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const includeInactive = String(req.query.includeInactive) === 'true';
    const { search, phone, uhid, email } = req.query;

    const query = {};
    if (!includeInactive) {
      query.isInactive = false;
    }

    if (req.user?.role === 'doctor') {
      const scopedPatientIds = await buildDoctorPatientScope(req.user);
      if (!Array.isArray(scopedPatientIds) || scopedPatientIds.length === 0) {
        return res.json({ success: true, patients: [], pagination: { page, limit, total: 0, totalPages: 0 } });
      }
      query._id = { $in: scopedPatientIds };
    }

    if (search) {
      const regex = new RegExp(escapeRegex(String(search)), 'i');
      query.$or = [
        { name: regex },
        { uhid: regex },
        { phone: regex },
        { email: regex },
      ];
    }

    if (phone) query.phone = String(phone);
    if (uhid) query.uhid = String(uhid);
    if (email) query.email = String(email);

    const [total, patients] = await Promise.all([
      Patient.countDocuments(query),
      Patient.find(query)
        .populate('genderId bloodGroupId maritalStatusId patientTypeId statusId')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
    ]);

    const totalPages = Math.ceil(total / limit);
    res.json({ success: true, patients, pagination: { page, limit, total, totalPages } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error fetching patients', error: err.message });
  }
};

exports.getPatientById = async (req, res) => {
  try {
    const includeInactive = String(req.query.includeInactive) === 'true';
    const query = { _id: req.params.id };
    if (!includeInactive) query.isInactive = false;

    if (req.user?.role === 'doctor') {
      const scopedPatientIds = await buildDoctorPatientScope(req.user);
      if (!Array.isArray(scopedPatientIds) || !scopedPatientIds.some((id) => String(id) === String(req.params.id))) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }
    }

    const p = await Patient.findOne(query)
      .populate('genderId bloodGroupId maritalStatusId patientTypeId statusId');
    if (!p) return res.status(404).json({ success: false, message: 'Patient not found' });
    res.json({ success: true, patient: p });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error fetching patient', error: err.message });
  }
};

exports.checkPhone = async (req, res) => {
  try {
    const { phone } = req.params;
    if (!phone) return res.status(400).json({ success: false, message: 'Phone number required' });
    const includeInactive = String(req.query.includeInactive) === 'true';
    const filter = { phone: String(phone) };
    if (!includeInactive) filter.isInactive = false;

    const existing = await Patient.find(filter)
      .populate('genderId bloodGroupId maritalStatusId patientTypeId statusId');
    if (existing && existing.length > 0) {
      const patients = existing.map((p) => ({
        _id: p._id,
        uhid: p.uhid,
        name: p.name,
        age: p.age,
        gender: p.gender,
        genderId: p.genderId,
        bloodGroup: p.bloodGroup,
        bloodGroupId: p.bloodGroupId,
        maritalStatus: p.maritalStatus,
        maritalStatusId: p.maritalStatusId,
        patientType: p.patientType,
        patientTypeId: p.patientTypeId,
        status: p.status,
        statusId: p.statusId,
        phone: p.phone,
        email: p.email,
        address: p.address,
        isInactive: p.isInactive,
        lastActivityDate: p.lastActivityDate
      }));
      res.json({ success: true, exists: true, patients });
    } else {
      res.json({ success: true, exists: false, patients: [] });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error checking phone', error: err.message });
  }
};

exports.getPatientByUHID = async (req, res) => {
  try {
    const includeInactive = String(req.query.includeInactive) === 'true';
    const query = { uhid: req.params.uhid };
    if (!includeInactive) query.isInactive = false;

    const patient = await Patient.findOne(query);
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }
    res.json({ success: true, patient });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error fetching patient', error: err.message });
  }
};
exports.updatePatient = async (req, res) => {
  try {
    const { phone, uhid, genderId, bloodGroupId, maritalStatusId, patientTypeId, statusId } = req.body;

    if (phone) {
      const existing = await Patient.findOne({ phone });
      if (existing && existing._id.toString() !== req.params.id) {
        return res.status(409).json({
          success: false,
          message: `Phone number is already registered to UHID ${existing.uhid || existing._id}`
        });
      }
    }

    if (uhid) {
      const existingUhid = await Patient.findOne({ uhid });
      if (existingUhid && existingUhid._id.toString() !== req.params.id) {
        return res.status(409).json({
          success: false,
          message: `UHID ${uhid} is already registered to another patient`
        });
      }
    }

    const payload = { ...req.body };

    if (genderId) {
      const valid = await mdmIntegration.validateMasterId('gender', genderId);
      if (!valid) return res.status(400).json({ success: false, message: 'Invalid genderId provided' });
      const master = await mdmIntegration.getMasterById(genderId);
      payload.gender = master?.name || payload.gender;
      payload.genderId = genderId;
    }
    if (bloodGroupId) {
      const valid = await mdmIntegration.validateMasterId('blood_group', bloodGroupId);
      if (!valid) return res.status(400).json({ success: false, message: 'Invalid bloodGroupId provided' });
      const master = await mdmIntegration.getMasterById(bloodGroupId);
      payload.bloodGroup = master?.name || payload.bloodGroup;
      payload.bloodGroupId = bloodGroupId;
    }
    if (maritalStatusId) {
      const valid = await mdmIntegration.validateMasterId('marital_status', maritalStatusId);
      if (!valid) return res.status(400).json({ success: false, message: 'Invalid maritalStatusId provided' });
      const master = await mdmIntegration.getMasterById(maritalStatusId);
      payload.maritalStatus = master?.name || payload.maritalStatus;
      payload.maritalStatusId = maritalStatusId;
    }
    if (patientTypeId) {
      const valid = await mdmIntegration.validateMasterId('patient_type', patientTypeId);
      if (!valid) return res.status(400).json({ success: false, message: 'Invalid patientTypeId provided' });
      const master = await mdmIntegration.getMasterById(patientTypeId);
      payload.patientType = master?.name || payload.patientType;
      payload.patientTypeId = patientTypeId;
    }
    if (statusId) {
      const valid = await mdmIntegration.validateMasterId('user_status', statusId);
      if (!valid) return res.status(400).json({ success: false, message: 'Invalid statusId provided' });
      const master = await mdmIntegration.getMasterById(statusId);
      payload.status = master?.name || payload.status;
      payload.statusId = statusId;
    }

    const updated = await Patient.findByIdAndUpdate(req.params.id, payload, { new: true });
    if (!updated) return res.status(404).json({ success: false, message: 'Patient not found' });
    const populated = await Patient.findById(updated._id)
      .populate('genderId bloodGroupId maritalStatusId patientTypeId statusId');
    res.json({ success: true, patient: populated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error updating patient', error: err.message });
  }
};

exports.deletePatient = async (req, res) => {
  try {
    const deleted = await Patient.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Patient not found' });
    res.json({ success: true, message: 'Patient deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error deleting patient', error: err.message });
  }
};
