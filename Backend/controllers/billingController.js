const mongoose = require('mongoose');
const Bill = require('../models/Bill');
const mdmIntegration = require('../utils/mdmIntegration');
const { updatePatientActivity, updatePatientActivityByUHID } = require('../utils/patientActivity');

async function generateInvoiceId() {
  const last = await Bill.findOne({ invoiceId: /^INV\d+$/ }).sort({ createdAt: -1 }).select('invoiceId').lean();
  let nextNumber = 2001;
  if (last && last.invoiceId) {
    const match = last.invoiceId.match(/^INV(\d+)$/);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }
  return `INV${nextNumber}`;
}

exports.getBills = async (req, res) => {
  try {
    console.log('GET /api/billing called');

    const { uhid, patientId } = req.query;
    const query = {};
    if (uhid) query.uhid = uhid;
    if (patientId) query.patient = patientId;

    // Use lean() to avoid Mongoose document wrappers so we can freely mutate the returned objects.
    const bills = await Bill.find(query).populate('patient createdBy doctor').sort({ createdAt: -1 }).lean();

    // Ensure patient name is always available for UI. Some older bills may store a raw ObjectId string.
    const Patient = require('../models/Patient');

    // Preload patient records for any referenced patient IDs to avoid repeat lookups
    const patientIds = new Set();
    bills.forEach((bill) => {
      const p = bill.patient;
      if (!p) return;

      if (typeof p === 'string' && mongoose.isValidObjectId(p)) {
        patientIds.add(p);
      } else if (p?._id && mongoose.isValidObjectId(String(p._id))) {
        patientIds.add(String(p._id));
      } else if (p?.id && mongoose.isValidObjectId(String(p.id))) {
        patientIds.add(String(p.id));
      } else if (typeof p === 'object' && p.toString) {
        const str = String(p);
        if (mongoose.isValidObjectId(str)) {
          patientIds.add(str);
        }
      }

      // Also include cases when patientName was incorrectly stored as an ObjectId string.
      if (bill.patientName && typeof bill.patientName === 'string' && /^[0-9a-fA-F]{24}$/.test(bill.patientName)) {
        patientIds.add(bill.patientName);
      }
    });

    const patientMap = new Map();
    if (patientIds.size) {
      const patients = await Patient.find({ _id: { $in: Array.from(patientIds) } }).select('name uhid');
      patients.forEach((p) => patientMap.set(String(p._id), p));
    }

    const fixedBills = await Promise.all(
      bills.map(async (bill) => {
        const b = { ...bill };
        let patientRecord = null;

        // Determine patient ID (if any)
        const rawPatient = b.patient;
        let patientId = null;
        if (typeof rawPatient === 'string' && mongoose.isValidObjectId(rawPatient)) {
          patientId = rawPatient;
        } else if (rawPatient && typeof rawPatient === 'object') {
          if (rawPatient._id && mongoose.isValidObjectId(String(rawPatient._id))) {
            patientId = String(rawPatient._id);
          } else if (rawPatient.id && mongoose.isValidObjectId(String(rawPatient.id))) {
            patientId = String(rawPatient.id);
          } else {
            const asString = String(rawPatient);
            if (mongoose.isValidObjectId(asString)) {
              patientId = asString;
            }
          }
        }

        if (!patientId && b.patientName && typeof b.patientName === 'string' && /^[0-9a-fA-F]{24}$/.test(b.patientName)) {
          patientId = b.patientName;
        }

        if (patientId && patientMap.has(patientId)) {
          patientRecord = patientMap.get(patientId);
        }

        if (patientRecord) {
          b.patient = patientRecord;
        }

        // Doctor info may also be stored as populated object or as ID string
        if (b.doctor && typeof b.doctor === 'object' && b.doctor.name) {
          b.doctorName = b.doctor.name;
        } else if (b.doctor && typeof b.doctor === 'string' && mongoose.isValidObjectId(b.doctor)) {
          const User = require('../models/User');
          const doctorRecord = await User.findById(b.doctor).select('name');
          if (doctorRecord) {
            b.doctor = doctorRecord;
            b.doctorName = doctorRecord.name;
          }
        }

// If patientName is accidentally stored as an ObjectId (string or ObjectId), resolve it to the real name/uhid
      if (b.patientName && mongoose.isValidObjectId(b.patientName)) {
        const patientByNameId = patientMap.get(String(b.patientName)) ?? (await Patient.findById(b.patientName).select('name uhid'));
          if (patientByNameId) {
            b.patientName = patientByNameId.name;
            if (!b.uhid) b.uhid = patientByNameId.uhid;
            b.patient = patientByNameId;
          }
        }

        // Ensure we have fields for display
        if (!b.patientName && b.patient && typeof b.patient === 'object') {
          b.patientName = b.patient.name;
        }
        if (!b.uhid && b.patient && typeof b.patient === 'object') {
          b.uhid = b.patient.uhid;
        }

        // Ensure a date string is available for the frontend (use stored date or fallback to createdAt)
        if (!b.date && b.createdAt) {
          b.date = b.createdAt;
        }
        if (b.date instanceof Date) {
          b.date = b.date.toISOString().split('T')[0];
        }

        return b;
      })
    );

    res.json({ success: true, bills: fixedBills });
  } catch (err) {
    console.error('Error fetching bills:', err);
    res.status(500).json({ success: false, message: 'Error fetching bills', error: err.message });
  }
};


exports.createBill = async (req, res) => {
  try {
    console.log('POST /api/billing body:', JSON.stringify(req.body));
    const { amount, uhid, billStatusId, paymentMethodId, invoiceTypeId, departmentId } = req.body;
    if (amount === undefined || amount === null) {
      return res.status(400).json({ success: false, message: 'Amount is required' });
    }

    // Ensure amount is a valid number
    const numericAmount = Number(req.body.amount ?? amount);
    if (Number.isNaN(numericAmount)) {
      return res.status(400).json({ success: false, message: 'Invalid amount' });
    }
    req.body.amount = numericAmount;

    // Validate MDM references
    if (billStatusId) {
      const valid = await mdmIntegration.validateMasterId('bill_status', billStatusId);
      if (!valid) return res.status(400).json({ success: false, message: 'Invalid billStatusId provided' });
    }
    if (paymentMethodId) {
      const valid = await mdmIntegration.validateMasterId('payment_method', paymentMethodId);
      if (!valid) return res.status(400).json({ success: false, message: 'Invalid paymentMethodId provided' });
    }
    if (invoiceTypeId) {
      const valid = await mdmIntegration.validateMasterId('invoice_type', invoiceTypeId);
      if (!valid) return res.status(400).json({ success: false, message: 'Invalid invoiceTypeId provided' });
    }
    if (departmentId) {
      const valid = await mdmIntegration.validateMasterId('department', departmentId);
      if (!valid) return res.status(400).json({ success: false, message: 'Invalid departmentId provided' });
    }

    // If UHID provided, resolve it to a Patient ObjectId and store patientName/uhid for easier display
    if (uhid) {
      const Patient = require('../models/Patient');
      const patient = await Patient.findOne({ uhid });
      if (!patient) {
        return res.status(400).json({ success: false, message: 'Patient with provided UHID not found' });
      }
      req.body.patient = patient._id;
      req.body.patientName = patient.name;
      req.body.uhid = patient.uhid;
    } else if (req.body.patient) {
      // If frontend sent a patient string that's not an ObjectId, store it as patientName
      const pid = req.body.patient;
      // handle different shapes: object with _id, plain id string, or plain name
      if (typeof pid === 'object') {
        const id = pid._id || pid.id;
        if (id && /^[0-9a-fA-F]{24}$/.test(String(id))) {
          req.body.patient = id;
        } else {
          req.body.patientName = pid.name || JSON.stringify(pid);
          delete req.body.patient;
        }
      } else if (typeof pid === 'string') {
        const looksLikeObjectId = /^[0-9a-fA-F]{24}$/.test(pid);
        if (looksLikeObjectId) {
          // Only treat it as a reference if it matches an actual patient record.
          const Patient = require('../models/Patient');
          const patient = await Patient.findById(pid).select('name uhid');
          if (patient) {
            req.body.patient = patient._id;
            req.body.patientName = patient.name;
            req.body.uhid = patient.uhid;
          } else {
            // Not a known patient id -> treat as a name string
            req.body.patientName = pid;
            delete req.body.patient;
          }
        } else {
          req.body.patientName = pid;
          delete req.body.patient;
        }
      } else {
        // any other type -> store as patientName
        req.body.patientName = String(pid);
        delete req.body.patient;
      }
    }

    // Extra safety: if patient still exists but is not a 24-char hex string, move to patientName
    if (req.body.patient && !(typeof req.body.patient === 'string' && /^[0-9a-fA-F]{24}$/.test(String(req.body.patient)))) {
      req.body.patientName = req.body.patient?.name || String(req.body.patient);
      delete req.body.patient;
    }

    // If we captured a patientName but no UHID, try to resolve the patient by name
    if (!req.body.uhid && req.body.patientName && typeof req.body.patientName === 'string') {
      const Patient = require('../models/Patient');
      const patient = await Patient.findOne({ name: req.body.patientName }).select('name uhid');
      if (patient) {
        req.body.uhid = patient.uhid;
        req.body.patient = patient._id;
      }
    }

    // If we still have a patient ObjectId but no patientName, resolve it now
    if (req.body.patient && typeof req.body.patient === 'string' && /^[0-9a-fA-F]{24}$/.test(req.body.patient) && !req.body.patientName) {
      const Patient = require('../models/Patient');
      const patient = await Patient.findById(req.body.patient).select('name uhid');
      if (patient) {
        req.body.patientName = patient.name;
        if (!req.body.uhid) req.body.uhid = patient.uhid;
      }
    }

    // Normalize date field if provided in the request
    if (req.body.date) {
      const parsedDate = new Date(req.body.date);
      if (!Number.isNaN(parsedDate.getTime())) {
        req.body.date = parsedDate;
      }
    }

    // If patientName was accidentally provided as an ObjectId string, resolve it to a real name
    if (req.body.patientName && /^[0-9a-fA-F]{24}$/.test(req.body.patientName)) {
      const Patient = require('../models/Patient');
      const patient = await Patient.findById(req.body.patientName).select('name uhid');
      if (patient) {
        req.body.patientName = patient.name;
        if (!req.body.uhid) req.body.uhid = patient.uhid;
        req.body.patient = patient._id;
      }
    }

    // Generate a unique invoice identifier (e.g. INV2001) when not provided
    if (!req.body.invoiceId) {
      req.body.invoiceId = await generateInvoiceId();
    }

    const bill = new Bill({ ...req.body, createdBy: req.user?.id });
    await bill.save();

    // Populate MDM references for response
    const populatedBill = await Bill.findById(bill._id)
      .populate('billStatusId', 'name code')
      .populate('paymentMethodId', 'name code')
      .populate('invoiceTypeId', 'name code')
      .populate('departmentId', 'name code')
      .populate('patient', 'name uhid')
      .lean();

    if (req.body.patient) {
      await updatePatientActivity(req.body.patient);
    } else if (req.body.uhid) {
      await updatePatientActivityByUHID(req.body.uhid);
    }

    res.status(201).json({ success: true, bill: populatedBill || bill });
  } catch (err) {
    console.error('Error creating bill:', err);
    // Mongoose validation/cast errors are likely client mistakes — return 400 with details
    if (err.name === 'ValidationError' || err.name === 'CastError') {
      return res.status(400).json({ success: false, message: err.message, error: err });
    }
    res.status(500).json({ success: false, message: 'Error creating bill', error: err.message });
  }
};

exports.updateBill = async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id);
    if (!bill) return res.status(404).json({ success: false, message: 'Bill not found' });

    // Prevent non-admin modification of already paid invoices
    const userRole = req.user?.role || 'unknown';
    if ((bill.paid || bill.status === 'Paid') && userRole !== 'admin') {
      return res.status(403).json({ success: false, message: 'Cannot modify a paid invoice' });
    }

    // Validate MDM references if provided
    const { billStatusId, paymentMethodId, invoiceTypeId, departmentId } = req.body;
    if (billStatusId) {
      const valid = await mdmIntegration.validateMasterId('bill_status', billStatusId);
      if (!valid) return res.status(400).json({ success: false, message: 'Invalid billStatusId provided' });
    }
    if (paymentMethodId) {
      const valid = await mdmIntegration.validateMasterId('payment_method', paymentMethodId);
      if (!valid) return res.status(400).json({ success: false, message: 'Invalid paymentMethodId provided' });
    }
    if (invoiceTypeId) {
      const valid = await mdmIntegration.validateMasterId('invoice_type', invoiceTypeId);
      if (!valid) return res.status(400).json({ success: false, message: 'Invalid invoiceTypeId provided' });
    }
    if (departmentId) {
      const valid = await mdmIntegration.validateMasterId('department', departmentId);
      if (!valid) return res.status(400).json({ success: false, message: 'Invalid departmentId provided' });
    }

    // Normalize patient / patientName / uhid fields same way we do during creation
    const { uhid } = req.body;
    if (uhid) {
      const Patient = require('../models/Patient');
      const patient = await Patient.findOne({ uhid });
      if (!patient) {
        return res.status(400).json({ success: false, message: 'Patient with provided UHID not found' });
      }
      req.body.patient = patient._id;
      req.body.patientName = patient.name;
      req.body.uhid = patient.uhid;
    } else if (req.body.patient) {
      const pid = req.body.patient;
      if (typeof pid === 'object') {
        const id = pid._id || pid.id;
        if (id && /^[0-9a-fA-F]{24}$/.test(String(id))) {
          req.body.patient = id;
        } else {
          req.body.patientName = pid.name || JSON.stringify(pid);
          delete req.body.patient;
        }
      } else if (typeof pid === 'string') {
        const looksLikeObjectId = /^[0-9a-fA-F]{24}$/.test(pid);
        if (looksLikeObjectId) {
          const Patient = require('../models/Patient');
          const patient = await Patient.findById(pid).select('name uhid');
          if (patient) {
            req.body.patient = patient._id;
            req.body.patientName = patient.name;
            req.body.uhid = patient.uhid;
          } else {
            req.body.patientName = pid;
            delete req.body.patient;
          }
        } else {
          req.body.patientName = pid;
          delete req.body.patient;
        }
      } else {
        req.body.patientName = String(pid);
        delete req.body.patient;
      }
    }

    // Extra safety: if patient still exists but is not a 24-char hex string, move to patientName
    if (req.body.patient && !(typeof req.body.patient === 'string' && /^[0-9a-fA-F]{24}$/.test(String(req.body.patient)))) {
      req.body.patientName = req.body.patient?.name || String(req.body.patient);
      delete req.body.patient;
    }

    // If we captured a patientName but no UHID, try to resolve the patient by name
    if (!req.body.uhid && req.body.patientName && typeof req.body.patientName === 'string') {
      const Patient = require('../models/Patient');
      const patient = await Patient.findOne({ name: req.body.patientName }).select('name uhid');
      if (patient) {
        req.body.uhid = patient.uhid;
        req.body.patient = patient._id;
      }
    }

    // If we still have a patient ObjectId but no patientName, resolve it now
    if (req.body.patient && typeof req.body.patient === 'string' && /^[0-9a-fA-F]{24}$/.test(req.body.patient) && !req.body.patientName) {
      const Patient = require('../models/Patient');
      const patient = await Patient.findById(req.body.patient).select('name uhid');
      if (patient) {
        req.body.patientName = patient.name;
        if (!req.body.uhid) req.body.uhid = patient.uhid;
      }
    }

    // Normalize date field if provided in the request
    if (req.body.date) {
      const parsedDate = new Date(req.body.date);
      if (!Number.isNaN(parsedDate.getTime())) {
        req.body.date = parsedDate;
      }
    }

    // If patientName was accidentally provided as an ObjectId string, resolve it to a real name
    if (req.body.patientName && /^[0-9a-fA-F]{24}$/.test(req.body.patientName)) {
      const Patient = require('../models/Patient');
      const patient = await Patient.findById(req.body.patientName).select('name uhid');
      if (patient) {
        req.body.patientName = patient.name;
        if (!req.body.uhid) req.body.uhid = patient.uhid;
        req.body.patient = patient._id;
      }
    }

    Object.assign(bill, req.body);
    await bill.save();

    // Populate MDM references for response
    const populatedBill = await Bill.findById(bill._id)
      .populate('billStatusId', 'name code')
      .populate('paymentMethodId', 'name code')
      .populate('invoiceTypeId', 'name code')
      .populate('departmentId', 'name code')
      .populate('patient', 'name uhid')
      .lean();

    if (bill.patient) {
      await updatePatientActivity(bill.patient);
    } else if (bill.uhid) {
      await updatePatientActivityByUHID(bill.uhid);
    }

    res.json({ success: true, bill: populatedBill || bill });
  } catch (err) {
    console.error('Error updating bill:', err);
    if (err.name === 'ValidationError' || err.name === 'CastError') {
      return res.status(400).json({ success: false, message: err.message, error: err });
    }
    res.status(500).json({ success: false, message: 'Error updating bill', error: err.message });
  }
};

exports.deleteBill = async (req, res) => {
  try {
    await Bill.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    console.error('Error deleting bill:', err);
    res.status(500).json({ success: false, message: 'Error deleting bill', error: err.message });
  }
};
