const EMR = require('../models/EMR');
const Bill = require('../models/Bill');
const mdmIntegration = require('../utils/mdmIntegration');
const mongoose = require('mongoose');
const { updatePatientActivityByUHID } = require('../utils/patientActivity');

const escapeRegex = (text) => {
  if (typeof text !== 'string') return '';
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

function buildEMRQuery(queryParams) {
  const { search, uhid, doctor, date, includeDeleted } = queryParams;
  const q = {};

  if (!includeDeleted || includeDeleted === 'false') {
    q.deleted = false;
  }

  if (uhid && typeof uhid === 'string' && uhid.trim()) {
    q.uhid = uhid.trim();
  }

  if (doctor && typeof doctor === 'string' && doctor.trim()) {
    q.doctor = { $regex: new RegExp(`^${escapeRegex(doctor.trim())}$`, 'i') };
  }

  if (date && typeof date === 'string' && date.trim()) {
    q.date = date.trim();
  }

  if (search && typeof search === 'string' && search.trim()) {
    const trimmedSearch = search.trim();
    const regex = new RegExp(escapeRegex(trimmedSearch), 'i');
    q.$or = [
      { patient: regex },
      { uhid: regex },
      { doctor: regex },
      { complaint: regex },
      { diagnosis: regex },
      { prescription: regex },
      { tests: regex }
    ];
  }

  return q;
}

exports.getEMRRecords = async (req, res) => {
  try {
    console.log('GET /api/emr called with query:', req.query);
    console.log('User:', req.user ? { id: req.user.id, name: req.user.name, role: req.user.role } : 'No user');

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(5, parseInt(req.query.limit) || 20));

    // Validate parsed values
    if (isNaN(page) || isNaN(limit)) {
      console.error('Invalid pagination parameters:', { page: req.query.page, limit: req.query.limit });
      return res.status(400).json({ success: false, message: 'Invalid pagination parameters' });
    }

    const skip = (page - 1) * limit;

    console.log('Parsed params:', { page, limit, skip });

    const query = buildEMRQuery(req.query);
    console.log('Base query from buildEMRQuery:', JSON.stringify(query, null, 2));

    let finalQuery = { ...query };

    // Doctor users can only see their own patients (consultation billing scoped to them).
    if (req.user?.role === 'doctor') {
      const userName = (req.user?.name || '').trim();
      console.log('Doctor restriction applied for user:', userName);

      let billedUHIDs = [];
      try {
        // Query bills where the doctor field matches the user's ID
        const billQuery = {
          doctor: req.user?.id // Match by ObjectId
        };
        console.log('Bill query:', JSON.stringify(billQuery, null, 2));
        
        billedUHIDs = await Bill.find(billQuery).distinct('uhid');
        console.log('Bill.find query executed successfully, found UHIDs:', billedUHIDs);
      } catch (billError) {
        console.error('Error querying bills:', billError);
        // If bill query fails, allow doctor to see their own EMR records only
        billedUHIDs = [];
      }

      console.log('Billed UHIDs found:', billedUHIDs.length, billedUHIDs);

      // For doctors, restrict to their patients: either created by them OR patient was billed by them
      const doctorCondition = { doctor: { $regex: new RegExp(`^${escapeRegex(userName)}$`, 'i') } };
      const billedCondition = billedUHIDs.length > 0 ? { uhid: { $in: billedUHIDs } } : null;

      console.log('Doctor condition:', JSON.stringify(doctorCondition));
      console.log('Billed condition:', JSON.stringify(billedCondition || 'none'));

      if (query.$or) {
        // If there's already a search $or, we need to combine it with doctor restrictions
        if (billedCondition) {
          finalQuery = {
            $and: [
              { $or: [doctorCondition, billedCondition] },
              query // Include all other conditions including the search $or
            ]
          };
        } else {
          // No billed records, just check doctor created the EMR record
          finalQuery = {
            $and: [
              doctorCondition,
              query // Include all other conditions including the search $or
            ]
          };
        }
        console.log('Combined query with $and:', JSON.stringify(finalQuery, null, 2));
      } else {
        // No search, just restrict to doctor's patients
        if (billedCondition) {
          finalQuery = {
            ...query,
            $or: [doctorCondition, billedCondition]
          };
        } else {
          // No billed records, just check doctor created the EMR record
          finalQuery = {
            ...query,
            ...doctorCondition
          };
        }
        console.log('Query with doctor restrictions:', JSON.stringify(finalQuery, null, 2));
      }
    }

    console.log('Final query:', JSON.stringify(finalQuery, null, 2));

    const [total, records] = await Promise.all([
      EMR.countDocuments(finalQuery),
      EMR.find(finalQuery)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
    ]);

    console.log('Query results:', { total, recordsCount: records.length });

    const totalPages = Math.ceil(total / limit);

    res.json({ success: true, records, pagination: { page, limit, total, totalPages } });
  } catch (err) {
    console.error('Error fetching EMR records:', err);
    console.error('Stack trace:', err.stack);
    res.status(500).json({ success: false, message: 'Error fetching EMR records', error: err.message });
  }
};

exports.createEMRRecord = async (req, res) => {
  try {
    console.log('POST /api/emr called');
    const data = req.body;
    const userId = req.user?.id;
    const userName = req.user?.name;

    // Doctors can only create case sheets for themselves; doctor value comes from user.name.
    if (req.user?.role === 'doctor') {
      data.doctor = (userName || '').trim();
      console.log('Doctor creating EMR record, doctor name set to:', data.doctor);
    }

    // Validate MDM references
    const { diagnosisIds, treatmentTypeIds, symptomIds, prescribedMedicineIds } = data;
    
    if (Array.isArray(diagnosisIds)) {
      for (const dId of diagnosisIds) {
        const valid = await mdmIntegration.validateMasterId('diagnosis', dId);
        if (!valid) return res.status(400).json({ success: false, message: `Invalid diagnosis ID: ${dId}` });
      }
    }
    
    if (Array.isArray(treatmentTypeIds)) {
      for (const tId of treatmentTypeIds) {
        const valid = await mdmIntegration.validateMasterId('treatment_type', tId);
        if (!valid) return res.status(400).json({ success: false, message: `Invalid treatment type ID: ${tId}` });
      }
    }
    
    if (Array.isArray(symptomIds)) {
      for (const sId of symptomIds) {
        const valid = await mdmIntegration.validateMasterId('symptom', sId);
        if (!valid) return res.status(400).json({ success: false, message: `Invalid symptom ID: ${sId}` });
      }
    }
    
    if (Array.isArray(prescribedMedicineIds)) {
      for (const mId of prescribedMedicineIds) {
        const valid = await mdmIntegration.validateMasterId('medicine_master', mId);
        if (!valid) return res.status(400).json({ success: false, message: `Invalid medicine ID: ${mId}` });
      }
    }

    const record = new EMR({
      ...data,
      createdBy: userId,
      history: [
        {
          action: 'create',
          by: userId,
          byName: userName,
          at: new Date(),
          changes: data
        }
      ]
    });

    await record.save();

    // Populate MDM references for response
    const populatedRecord = await EMR.findById(record._id)
      .populate('diagnosisIds', 'name code')
      .populate('treatmentTypeIds', 'name code')
      .populate('symptomIds', 'name code')
      .populate('prescribedMedicineIds', 'name code')
      .lean();

    console.log('EMR record saved with id:', record._id, 'doctor:', record.doctor);
    if (data.uhid) {
      await updatePatientActivityByUHID(data.uhid);
    }
    res.status(201).json({ success: true, record: populatedRecord || record });
  } catch (err) {
    console.error('Error creating EMR record:', err);
    console.error('Error details:', err.message);
    res.status(500).json({ success: false, message: 'Error creating EMR record', error: err.message });
  }
};

exports.updateEMRRecord = async (req, res) => {
  try {
    const id = req.params.id;
    const userId = req.user?.id;
    const userName = req.user?.name;
    const payload = req.body;

    // Find by objectId or UHID
    let record = null;
    if (mongoose.isValidObjectId(id)) {
      record = await EMR.findById(id);
    }
    if (!record) {
      record = await EMR.findOne({ uhid: id });
    }

    if (!record) {
      return res.status(404).json({ success: false, message: 'Case sheet not found' });
    }

    // Doctors can only update their own records
    if (req.user?.role === 'doctor' && record.doctor.toLowerCase() !== (userName || '').toLowerCase()) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    // Validate MDM references if provided
    const { diagnosisIds, treatmentTypeIds, symptomIds, prescribedMedicineIds } = payload;
    
    if (Array.isArray(diagnosisIds)) {
      for (const dId of diagnosisIds) {
        const valid = await mdmIntegration.validateMasterId('diagnosis', dId);
        if (!valid) return res.status(400).json({ success: false, message: `Invalid diagnosis ID: ${dId}` });
      }
    }
    
    if (Array.isArray(treatmentTypeIds)) {
      for (const tId of treatmentTypeIds) {
        const valid = await mdmIntegration.validateMasterId('treatment_type', tId);
        if (!valid) return res.status(400).json({ success: false, message: `Invalid treatment type ID: ${tId}` });
      }
    }
    
    if (Array.isArray(symptomIds)) {
      for (const sId of symptomIds) {
        const valid = await mdmIntegration.validateMasterId('symptom', sId);
        if (!valid) return res.status(400).json({ success: false, message: `Invalid symptom ID: ${sId}` });
      }
    }
    
    if (Array.isArray(prescribedMedicineIds)) {
      for (const mId of prescribedMedicineIds) {
        const valid = await mdmIntegration.validateMasterId('medicine_master', mId);
        if (!valid) return res.status(400).json({ success: false, message: `Invalid medicine ID: ${mId}` });
      }
    }

    const changes = { ...payload };
    const updated = await EMR.findByIdAndUpdate(record._id, {
      ...payload,
      updatedBy: userId,
      $push: {
        history: {
          action: 'update',
          by: userId,
          byName: userName,
          at: new Date(),
          changes
        }
      }
    }, { new: true })
      .populate('diagnosisIds', 'name code')
      .populate('treatmentTypeIds', 'name code')
      .populate('symptomIds', 'name code')
      .populate('prescribedMedicineIds', 'name code')
      .lean();

    if (record.uhid) {
      await updatePatientActivityByUHID(record.uhid);
    }

    res.json({ success: true, record: updated });
  } catch (err) {
    console.error('Error updating EMR record:', err);
    res.status(500).json({ success: false, message: 'Error updating EMR record', error: err.message });
  }
};

exports.deleteEMRRecord = async (req, res) => {
  try {
    const id = req.params.id;
    const userId = req.user?.id;
    const userName = req.user?.name;

    // Try finding by Mongo ObjectId first, then fall back to UHID if not found.
    let record = null;
    if (mongoose.isValidObjectId(id)) {
      record = await EMR.findById(id);
    }

    if (!record) {
      record = await EMR.findOne({ uhid: id });
    }

    if (!record) {
      return res.status(404).json({ success: false, message: 'Case sheet not found' });
    }

    await EMR.findByIdAndUpdate(record._id, {
      deleted: true,
      deletedAt: new Date(),
      deletedBy: userId,
      $push: {
        history: {
          action: 'delete',
          by: userId,
          byName: userName,
          at: new Date()
        }
      }
    });

    res.json({ success: true, message: 'Case sheet deleted' });
  } catch (err) {
    console.error('Error deleting EMR record:', err);
    res.status(500).json({ success: false, message: 'Error deleting EMR record', error: err.message });
  }
};
