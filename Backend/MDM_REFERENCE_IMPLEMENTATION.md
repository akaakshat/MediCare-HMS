// MDM Reference Implementation Examples
// This document shows how to update existing models to use Master Data

/**
 * ============================================================================
 * MODULE 1: PATIENT MODULE - Updated with MDM References
 * ============================================================================
 */

// FILE: models/Patient.js (UPDATED)
const mongoose = require('mongoose');

const PatientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  age: { type: Number },
  
  // Updated: Now references Master Data instead of hardcoded enum
  genderId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'MasterData', // References gender master
    validate: {
      async validator(value) {
        if (!value) return true; // Optional field
        const master = await mongoose.model('MasterData').findOne({
          _id: value,
          type: 'gender',
          isActive: true
        });
        return !!master;
      },
      message: 'Invalid gender ID'
    }
  },
  
  bloodGroupId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'MasterData', // References blood_group master
    validate: {
      async validator(value) {
        if (!value) return true;
        const master = await mongoose.model('MasterData').findOne({
          _id: value,
          type: 'blood_group',
          isActive: true
        });
        return !!master;
      },
      message: 'Invalid blood group ID'
    }
  },
  
  maritalStatusId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'MasterData' // References marital_status master
  },
  
  patientTypeId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'MasterData' // References patient_type master
  },
  
  phone: { type: String, required: true },
  email: { type: String },
  address: { type: String },
  
  statusId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'MasterData' // References user_status master
  },
  
  uhid: { type: String, unique: true },
  lastVisit: { type: Date },
  lastActivityDate: { type: Date, default: Date.now },
  notes: { type: String },
}, { timestamps: true });

PatientSchema.index({ isActive: 1 });
PatientSchema.index({ lastActivityDate: 1 });

// UHID generation remains the same
PatientSchema.pre('save', async function(next) {
  if (this.uhid) return next();
  try {
    const Patient = mongoose.model('Patient');
    const lastPatient = await Patient.findOne({ uhid: { $exists: true } })
      .sort({ createdAt: -1 })
      .select('uhid')
      .lean();

    let nextNumber = 1;
    if (lastPatient?.uhid) {
      const match = lastPatient.uhid.match(/^UHID(\d+)$/);
      if (match) nextNumber = parseInt(match[1], 10) + 1;
    }

    this.uhid = `UHID${String(nextNumber).padStart(6, '0')}`;
    next();
  } catch (err) {
    next(err);
  }
});

module.exports = mongoose.model('Patient', PatientSchema);


// FILE: controllers/patientController.js (UPDATED)
const Patient = require('../models/Patient');
const mdmIntegration = require('../utils/mdmIntegration');

/**
 * Get dropdown options for patient forms
 */
exports.getPatientDropdowns = async (req, res) => {
  try {
    const [genders, bloodGroups, maritalStatuses, patientTypes] = await Promise.all([
      mdmIntegration.getDropdownOptions('gender'),
      mdmIntegration.getDropdownOptions('blood_group'),
      mdmIntegration.getDropdownOptions('marital_status'),
      mdmIntegration.getDropdownOptions('patient_type')
    ]);

    res.status(200).json({
      success: true,
      dropdowns: {
        genders,
        bloodGroups,
        maritalStatuses,
        patientTypes
      }
    });
  } catch (error) {
    console.error('Error fetching dropdowns:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Create patient with MDM references
 */
exports.createPatient = async (req, res) => {
  try {
    const {
      name,
      age,
      genderId,
      bloodGroupId,
      maritalStatusId,
      patientTypeId,
      phone,
      email,
      address,
      notes
    } = req.body;

    // Validate required fields
    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Name and phone are required'
      });
    }

    // Validate master data references
    const validations = [
      { id: genderId, type: 'gender', required: false },
      { id: bloodGroupId, type: 'blood_group', required: false },
      { id: maritalStatusId, type: 'marital_status', required: false },
      { id: patientTypeId, type: 'patient_type', required: false }
    ];

    for (const validation of validations) {
      if (validation.id) {
        const isValid = await mdmIntegration.validateMasterId(
          validation.type,
          validation.id
        );
        if (!isValid) {
          return res.status(400).json({
            success: false,
            message: `Invalid ${validation.type} ID`
          });
        }
      }
    }

    // Create patient
    const newPatient = new Patient({
      name,
      age,
      genderId,
      bloodGroupId,
      maritalStatusId,
      patientTypeId,
      phone,
      email,
      address,
      notes
    });

    await newPatient.save();

    // Populate master data before responding
    await newPatient.populate([
      'genderId',
      'bloodGroupId',
      'maritalStatusId',
      'patientTypeId'
    ]);

    res.status(201).json({
      success: true,
      message: 'Patient created successfully',
      patient: newPatient
    });
  } catch (error) {
    console.error('Error creating patient:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get patient details with populated master data
 */
exports.getPatient = async (req, res) => {
  try {
    const { id } = req.params;

    const patient = await Patient.findById(id)
      .populate('genderId')
      .populate('bloodGroupId')
      .populate('maritalStatusId')
      .populate('patientTypeId')
      .populate('statusId');

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    res.status(200).json({
      success: true,
      patient
    });
  } catch (error) {
    console.error('Error fetching patient:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update patient with MDM validation
 */
exports.updatePatient = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Validate master data references if provided
    if (updateData.genderId) {
      const isValid = await mdmIntegration.validateMasterId('gender', updateData.genderId);
      if (!isValid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid gender ID'
        });
      }
    }

    if (updateData.bloodGroupId) {
      const isValid = await mdmIntegration.validateMasterId('blood_group', updateData.bloodGroupId);
      if (!isValid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid blood group ID'
        });
      }
    }

    const patient = await Patient.findByIdAndUpdate(id, updateData, { new: true })
      .populate('genderId')
      .populate('bloodGroupId')
      .populate('maritalStatusId')
      .populate('patientTypeId');

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Patient updated successfully',
      patient
    });
  } catch (error) {
    console.error('Error updating patient:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};


/**
 * ============================================================================
 * MODULE 2: APPOINTMENT MODULE - Updated with MDM References
 * ============================================================================
 */

// FILE: models/Appointment.js (UPDATED - showing key changes)
const AppointmentSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  appointmentDate: { type: Date, required: true },
  
  // Updated: Master data references instead of enums
  statusId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'MasterData' // appointment_status
  },
  
  visitTypeId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'MasterData' // visit_type
  },
  
  consultationTypeId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'MasterData' // consultation_type
  },
  
  reasonForVisit: String,
  notes: String,
  isActive: { type: Boolean, default: true }
}, { timestamps: true });


/**
 * ============================================================================
 * MODULE 3: BILLING MODULE - Updated with MDM References
 * ============================================================================
 */

// FILE: models/Bill.js (UPDATED - showing key changes)
const BillSchema = new mongoose.Schema({
  invoiceNumber: { type: String, unique: true, required: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
  appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  
  items: [{
    description: String,
    quantity: Number,
    unitPrice: Number,
    amount: Number
  }],
  
  totalAmount: Number,
  
  // Updated: Master data references
  taxConfigId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'MasterData' // tax_configuration
  },
  
  paymentStatusId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'MasterData' // payment_status
  },
  
  paymentMethodId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'MasterData' // payment_method
  },
  
  invoiceTypeId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'MasterData' // invoice_type
  },
  
  notes: String
}, { timestamps: true });


/**
 * ============================================================================
 * MIGRATION HELPER SCRIPT
 * ============================================================================
 */

/*
// File: scripts/migrate-to-mdm.js
// This script helps migrate existing data to use MDM references

const mongoose = require('mongoose');
const Patient = require('../models/Patient');
const MasterData = require('../models/MasterData');
require('dotenv').config();

async function migratePatientData() {
  try {
    console.log('Starting patient data migration...');
    
    await mongoose.connect(process.env.MONGO_URI);
    
    // Get all gender master data
    const genders = await MasterData.find({ type: 'gender' });
    const genderMap = {};
    genders.forEach(g => {
      genderMap[g.code] = g._id;
      genderMap[g.name.toUpperCase()] = g._id;
    });
    
    // Migrate patient records
    const patients = await Patient.find({});
    console.log(`Found ${patients.length} patients to migrate`);
    
    let migrated = 0;
    let skipped = 0;
    
    for (const patient of patients) {
      try {
        // Skip if already migrated
        if (patient.genderId) {
          skipped++;
          continue;
        }
        
        // Skip if no gender data
        if (!patient.gender) {
          skipped++;
          continue;
        }
        
        // Find matching gender master
        const genderId = genderMap[patient.gender.toUpperCase()];
        if (!genderId) {
          console.warn(`No gender match for: ${patient.gender}`);
          skipped++;
          continue;
        }
        
        // Update patient
        patient.genderId = genderId;
        // Optionally delete old field: delete patient.gender;
        await patient.save();
        migrated++;
        
        if (migrated % 100 === 0) {
          console.log(`Migrated: ${migrated}`);
        }
      } catch (error) {
        console.error(`Error migrating patient ${patient._id}:`, error.message);
        skipped++;
      }
    }
    
    console.log(`Migration complete! Migrated: ${migrated}, Skipped: ${skipped}`);
    await mongoose.connection.close();
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migratePatientData();
*/

/**
 * ============================================================================
 * UPDATED ROUTES
 * ============================================================================
 */

// FILE: routes/patients.js (UPDATED - showing key additions)
const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const { protect } = require('../middleware/authMiddleware');

// Get dropdown options for patient forms
router.get('/dropdowns', protect, patientController.getPatientDropdowns);

// Existing CRUD routes
router.post('/', protect, patientController.createPatient);
router.get('/:id', protect, patientController.getPatient);
router.put('/:id', protect, patientController.updatePatient);

module.exports = router;

/**
 * ============================================================================
 * FRONTEND INTEGRATION EXAMPLE
 * ============================================================================
 */

/*
// File: frontend/src/api/patientApi.ts
// Frontend integration example

export async function getPatientDropdowns() {
  const response = await fetch('/api/patients/dropdowns', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
}

export async function createPatient(patientData) {
  const response = await fetch('/api/patients', {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(patientData)
  });
  return response.json();
}

// Usage in React component
function PatientForm() {
  const [dropdowns, setDropdowns] = useState(null);
  
  useEffect(() => {
    getPatientDropdowns().then(data => {
      setDropdowns(data.dropdowns);
    });
  }, []);
  
  return (
    <form>
      <input name="name" placeholder="Patient Name" />
      <select name="genderId">
        <option value="">Select Gender</option>
        {dropdowns?.genders.map(g => (
          <option key={g._id} value={g._id}>{g.name}</option>
        ))}
      </select>
    </form>
  );
}
*/

module.exports = {
  message: 'See comments above for detailed implementation examples'
};
