const IcdCode = require('../models/IcdCode');
const PatientIcdMapping = require('../models/PatientIcdMapping');
const Patient = require('../models/Patient');
const User = require('../models/User');

exports.getIcdCodes = async (req, res) => {
  try {
    const { page = 1, limit = 1000, search = '', chapter, category, active } = req.query;
    const q = {};
    if (search) {
      const regex = new RegExp(search.trim(), 'i');
      q.$or = [{ code: regex }, { description: regex }];
    }
    if (chapter) q.chapter = chapter;
    if (category) q.category = category;
    if (active !== undefined) q.active = active === 'true' || active === true;

    const total = await IcdCode.countDocuments(q);
    const icdCodes = await IcdCode.find(q)
      .sort({ code: 1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    return res.json({ success: true, icdCodes, pagination: { page: Number(page), limit: Number(limit), total } });
  } catch (err) {
    console.error('Error fetching ICD codes:', err);
    return res.status(500).json({ success: false, message: 'Error fetching ICD codes', error: err.message });
  }
};

exports.createIcdCode = async (req, res) => {
  return res.status(405).json({ success: false, message: 'Creation of ICD codes is disabled; use the ICD import process instead.' });
};

exports.updateIcdCode = async (req, res) => {
  try {
    const id = req.params.id;
    const payload = { ...req.body };
    if (payload.code) payload.code = payload.code.trim();
    if (payload.description) payload.description = payload.description.trim();
    if (payload.chapter) payload.chapter = payload.chapter.trim();
    if (payload.category) payload.category = payload.category.trim();

    const icdCode = await IcdCode.findById(id);
    if (!icdCode) return res.status(404).json({ success: false, message: 'ICD code not found' });

    if (payload.code && payload.code !== icdCode.code) {
      const conflict = await IcdCode.findOne({ code: payload.code });
      if (conflict) return res.status(400).json({ success: false, message: 'Another ICD code with this code exists' });
    }

    const updated = await IcdCode.findByIdAndUpdate(id, payload, { new: true });
    res.json({ success: true, icdCode: updated });
  } catch (err) {
    console.error('Error updating ICD code:', err);
    return res.status(500).json({ success: false, message: 'Error updating ICD code', error: err.message });
  }
};

exports.deleteIcdCode = async (req, res) => {
  try {
    const id = req.params.id;
    const icdCode = await IcdCode.findById(id);
    if (!icdCode) return res.status(404).json({ success: false, message: 'ICD code not found' });

    // Soft delete: inactivate to preserve historical references
    icdCode.active = false;
    await icdCode.save();

    res.json({ success: true, message: 'ICD code inactivated', icdCode });
  } catch (err) {
    console.error('Error deleting ICD code:', err);
    return res.status(500).json({ success: false, message: 'Error deleting ICD code', error: err.message });
  }
};

exports.getPatientIcdHistory = async (req, res) => {
  try {
    const patientId = req.params.patientId;
    const patient = await Patient.findById(patientId);
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });

    const mappings = await PatientIcdMapping.find({ patient: patientId })
      .populate('doctor', 'name specialization')
      .populate('icdCode');

    res.json({ success: true, patient: patient, mappings });
  } catch (err) {
    console.error('Error fetching patient ICD history:', err);
    return res.status(500).json({ success: false, message: 'Error fetching history', error: err.message });
  }
};

exports.createPatientIcdMapping = async (req, res) => {
  try {
    const patientId = req.params.patientId;
    const { doctorId, icdCodeId, encounterDate, notes, status = 'active', isPrimary = false } = req.body;

    if (!doctorId || !icdCodeId || !encounterDate) {
      return res.status(400).json({ success: false, message: 'doctorId, icdCodeId, and encounterDate are required' });
    }

    const patient = await Patient.findById(patientId);
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });

    const doctor = await User.findById(doctorId);
    if (!doctor) return res.status(404).json({ success: false, message: 'Doctor not found' });

    const icdCode = await IcdCode.findById(icdCodeId);
    if (!icdCode) return res.status(404).json({ success: false, message: 'ICD code not found' });

    const mapping = await PatientIcdMapping.create({
      patient: patientId,
      doctor: doctorId,
      icdCode: icdCodeId,
      encounterDate: new Date(encounterDate),
      notes: notes?.trim(),
      status,
      isPrimary,
      createdBy: req.user?.id,
    });

    const populated = await mapping.populate('doctor', 'name specialization').populate('icdCode');

    res.status(201).json({ success: true, mapping: populated });
  } catch (err) {
    console.error('Error creating patient ICD mapping:', err);
    return res.status(500).json({ success: false, message: 'Error creating mapping', error: err.message });
  }
};

exports.updatePatientIcdMapping = async (req, res) => {
  try {
    const { patientId, mappingId } = req.params;
    const payload = { ...req.body };

    if (payload.encounterDate) payload.encounterDate = new Date(payload.encounterDate);

    const mapping = await PatientIcdMapping.findOne({ _id: mappingId, patient: patientId });
    if (!mapping) return res.status(404).json({ success: false, message: 'Patient ICD mapping not found' });

    Object.assign(mapping, payload);
    await mapping.save();

    const populated = await mapping.populate('doctor', 'name specialization').populate('icdCode');

    res.json({ success: true, mapping: populated });
  } catch (err) {
    console.error('Error updating patient ICD mapping:', err);
    return res.status(500).json({ success: false, message: 'Error updating mapping', error: err.message });
  }
};

exports.deletePatientIcdMapping = async (req, res) => {
  try {
    const { patientId, mappingId } = req.params;
    const mapping = await PatientIcdMapping.findOne({ _id: mappingId, patient: patientId });
    if (!mapping) return res.status(404).json({ success: false, message: 'Patient ICD mapping not found' });

    await mapping.remove();
    res.json({ success: true, message: 'Mapping deleted' });
  } catch (err) {
    console.error('Error deleting patient ICD mapping:', err);
    return res.status(500).json({ success: false, message: 'Error deleting mapping', error: err.message });
  }
};

exports.getIcdReport = async (req, res) => {
  try {
    const { doctorId, patientId, startDate, endDate, chapter, status } = req.query;
    const q = {};

    if (doctorId) q.doctor = doctorId;
    if (patientId) q.patient = patientId;
    if (status) q.status = status;

    if (startDate || endDate) {
      q.encounterDate = {};
      if (startDate) q.encounterDate.$gte = new Date(startDate);
      if (endDate) q.encounterDate.$lte = new Date(endDate);
    }

    // Chapter filter runs via related ICD codes
    if (chapter) {
      const codes = await IcdCode.find({ chapter }).select('_id');
      q.icdCode = { $in: codes.map((c) => c._id) };
    }

    const report = await PatientIcdMapping.find(q)
      .populate('patient', 'name uhid')
      .populate('doctor', 'name specialization')
      .populate('icdCode');

    res.json({ success: true, report });
  } catch (err) {
    console.error('Error generating ICD report:', err);
    return res.status(500).json({ success: false, message: 'Error generating report', error: err.message });
  }
};
