// MDM Integration Guide
// This document explains how to integrate Master Data Management with existing modules

/**
 * STEP 1: REGISTER MDM ROUTES IN server.js
 * ==========================================
 * 
 * Add to your server.js:
 * 
 * const mdmRoutes = require('./routes/mdm');
 * 
 * // Add after other route registrations:
 * app.use('/api/masters', mdmRoutes);
 * 
 */

/**
 * STEP 2: UPDATE EXISTING MODELS TO USE MASTER DATA REFERENCES
 * =============================================================
 * 
 * BEFORE (hardcoded enum):
 * ========================
 * const PatientSchema = new mongoose.Schema({
 *   gender: { type: String, enum: ['Male', 'Female', 'Other'] },
 *   bloodGroup: { type: String }
 * });
 * 
 * AFTER (using master data references):
 * =========================================
 * const PatientSchema = new mongoose.Schema({
 *   genderId: { 
 *     type: mongoose.Schema.Types.ObjectId, 
 *     ref: 'MasterData', // References gender master
 *     validate: {
 *       validator: async (id) => {
 *         const master = await mdmIntegration.validateMasterId('gender', id);
 *         return master;
 *       },
 *       message: 'Invalid gender'
 *     }
 *   },
 *   bloodGroupId: { 
 *     type: mongoose.Schema.Types.ObjectId, 
 *     ref: 'MasterData' // References blood_group master
 *   }
 * });
 * 
 */

/**
 * STEP 3: UPDATE CONTROLLERS TO FETCH DROPDOWN DATA
 * ===================================================
 * 
 * In existing controllers (e.g., patientController.js):
 * 
 * const mdmIntegration = require('../utils/mdmIntegration');
 * 
 * exports.getDropdownData = async (req, res) => {
 *   try {
 *     const [genders, bloodGroups, maritalStatus] = await Promise.all([
 *       mdmIntegration.getDropdownOptions('gender'),
 *       mdmIntegration.getDropdownOptions('blood_group'),
 *       mdmIntegration.getDropdownOptions('marital_status')
 *     ]);
 *
 *     res.json({
 *       genders,
 *       bloodGroups,
 *       maritalStatus
 *     });
 *   } catch (error) {
 *     res.status(500).json({ message: error.message });
 *   }
 * };
 * 
 */

/**
 * STEP 4: SAMPLE INTEGRATION FOR PATIENT MODULE
 * ===============================================
 * 
 * // models/Patient.js - UPDATED
 * const PatientSchema = new mongoose.Schema({
 *   name: { type: String, required: true },
 *   age: { type: Number },
 *   genderId: { 
 *     type: mongoose.Schema.Types.ObjectId, 
 *     ref: 'MasterData' 
 *   },
 *   bloodGroupId: { 
 *     type: mongoose.Schema.Types.ObjectId, 
 *     ref: 'MasterData' 
 *   },
 *   maritalStatusId: { 
 *     type: mongoose.Schema.Types.ObjectId, 
 *     ref: 'MasterData' 
 *   },
 *   phone: { type: String, required: true },
 *   email: { type: String },
 *   address: { type: String },
 *   statusId: { 
 *     type: mongoose.Schema.Types.ObjectId, 
 *     ref: 'MasterData' 
 *   },
 *   uhid: { type: String, unique: true },
 *   lastVisit: { type: Date },
 *   lastActivityDate: { type: Date, default: Date.now },
 *   notes: { type: String },
 * }, { timestamps: true });
 * 
 * // controllers/patientController.js - UPDATED
 * const mdmIntegration = require('../utils/mdmIntegration');
 * 
 * exports.createPatient = async (req, res) => {
 *   try {
 *     const { name, genderId, bloodGroupId, ...rest } = req.body;
 *     
 *     // Validate master data references
 *     if (genderId) {
 *       const isValid = await mdmIntegration.validateMasterId('gender', genderId);
 *       if (!isValid) {
 *         return res.status(400).json({ message: 'Invalid gender ID' });
 *       }
 *     }
 *     
 *     const newPatient = new Patient({ 
 *       name, 
 *       genderId, 
 *       bloodGroupId,
 *       ...rest 
 *     });
 *     
 *     await newPatient.save();
 *     
 *     // Populate master data references
 *     await newPatient.populate(['genderId', 'bloodGroupId', 'maritalStatusId']);
 *     
 *     res.status(201).json({
 *       message: 'Patient created successfully',
 *       patient: newPatient
 *     });
 *   } catch (error) {
 *     res.status(500).json({ message: error.message });
 *   }
 * };
 * 
 */

/**
 * STEP 5: INTEGRATION WITH APPOINTMENT MODULE
 * =============================================
 * 
 * // models/Appointment.js - UPDATED
 * const AppointmentSchema = new mongoose.Schema({
 *   patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
 *   doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
 *   appointmentDate: { type: Date, required: true },
 *   statusId: { 
 *     type: mongoose.Schema.Types.ObjectId, 
 *     ref: 'MasterData' // appointment_status
 *   },
 *   visitTypeId: { 
 *     type: mongoose.Schema.Types.ObjectId, 
 *     ref: 'MasterData' // visit_type
 *   },
 *   consultationTypeId: { 
 *     type: mongoose.Schema.Types.ObjectId, 
 *     ref: 'MasterData' // consultation_type
 *   },
 *   reasonForVisit: String,
 *   notes: String,
 * }, { timestamps: true });
 * 
 */

/**
 * STEP 6: INTEGRATION WITH BILLING MODULE
 * ========================================
 * 
 * // models/Bill.js - UPDATED
 * const BillSchema = new mongoose.Schema({
 *   invoiceNumber: String,
 *   patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
 *   appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
 *   items: [{
 *     description: String,
 *     quantity: Number,
 *     unitPrice: Number,
 *     amount: Number
 *   }],
 *   totalAmount: Number,
 *   taxConfigId: { 
 *     type: mongoose.Schema.Types.ObjectId, 
 *     ref: 'MasterData' // tax_configuration
 *   },
 *   paymentStatusId: { 
 *     type: mongoose.Schema.Types.ObjectId, 
 *     ref: 'MasterData' // payment_status
 *   },
 *   paymentMethodId: { 
 *     type: mongoose.Schema.Types.ObjectId, 
 *     ref: 'MasterData' // payment_method
 *   },
 *   invoiceTypeId: { 
 *     type: mongoose.Schema.Types.ObjectId, 
 *     ref: 'MasterData' // invoice_type
 *   }
 * }, { timestamps: true });
 * 
 */

/**
 * STEP 7: SAMPLE BACKEND INITIALIZATION SCRIPT
 * =============================================
 * 
 * Create scripts/init-master-data.js to seed initial master data:
 * 
 */

module.exports = {
  integrationGuide: 'See comments above for integration steps'
};
