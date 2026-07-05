# Master Data Management (MDM) Module

## Overview

The Master Data Management (MDM) module provides a centralized, Excel-driven system for managing all static and reference data in the Clinic Management System. It eliminates hardcoded values, improves scalability, and enables non-technical users to manage master data through Excel files.

## Key Features

✅ **Centralized Master Data** - All dropdowns, statuses, and reference data in one place
✅ **Excel Import/Export** - Bulk upload and download data in Excel format
✅ **RBAC Integration** - Role-permission mapping stored as master data
✅ **In-Memory Caching** - Fast retrieval with automatic cache invalidation
✅ **Bulk Operations** - Import thousands of records with validation
✅ **Soft Delete** - Non-destructive deletion with data archival
✅ **Audit Trail** - Track who created/updated records
✅ **Hierarchical Data** - Support for parent-child relationships

## Architecture

```
┌─────────────────────────────────────────────┐
│         API Routes (routes/mdm.js)          │
├─────────────────────────────────────────────┤
│      Controller (controllers/mdmController)  │
├─────────────────────────────────────────────┤
│       Service (services/mdmService)         │
│    - Business Logic & Caching              │
├─────────────────────────────────────────────┤
│     Repository (repositories/mdmRepository) │
│    - Database Operations                   │
├─────────────────────────────────────────────┤
│              MongoDB Models                 │
│      - MasterData & RolePermission          │
├─────────────────────────────────────────────┤
│              Utilities                      │
│  - Excel Handling (excelHandler.js)        │
│  - Caching (mdmCache.js)                   │
│  - Integration (mdmIntegration.js)         │
└─────────────────────────────────────────────┘
```

## Data Model

### MasterData Schema

```javascript
{
  type: String,              // Master data type (enum)
  name: String,              // Display name
  code: String,              // Unique code (uppercase)
  description: String,       // Description
  isActive: Boolean,         // Active flag (default: true)
  metadata: Object,          // Flexible JSON data
  parentId: ObjectId,        // For hierarchical data
  displayOrder: Number,      // Sort order
  createdBy: ObjectId,       // Reference to User
  updatedBy: ObjectId,       // Reference to User
  createdAt: Date,           // Created timestamp
  updatedAt: Date            // Updated timestamp
}
```

## Master Types

The system supports the following master data types:

### User & Access Control
- `role` - User roles (Admin, Doctor, Nurse, etc.)
- `permission` - System permissions
- `role_permission_mapping` - Role-Permission associations
- `user_status` - User account status

### Patient
- `gender` - Patient gender
- `blood_group` - Blood group types
- `marital_status` - Marital status options
- `patient_type` - Patient types (Inpatient, Outpatient, etc.)

### Doctor
- `department` - Medical departments
- `specialization` - Doctor specializations
- `qualification` - Medical qualifications

### Appointment
- `appointment_status` - Appointment statuses
- `visit_type` - Visit types
- `consultation_type` - Consultation types

### Billing
- `payment_status` - Payment statuses
- `payment_method` - Payment methods
- `invoice_type` - Invoice types
- `tax_configuration` - Tax settings

### Medical
- `icd_code` - ICD diagnostic codes
- `symptom` - Medical symptoms
- `allergy` - Allergy types
- `diagnosis_type` - Diagnosis types
- `vital_type` - Vital sign types

### Pharmacy
- `medicine_master` - Medicine information
- `medicine_category` - Medicine categories
- `dosage_form` - Dosage forms
- `unit` - Units of measurement
- `vendor` - Pharmacy vendors

## API Endpoints

### View Master Data (Authenticated Users)

#### GET `/api/masters/:type`
Retrieve all master data of a specific type with pagination.

**Query Parameters:**
```
- activeOnly: boolean (default: true)
- page: number (default: 1)
- limit: number (default: 100)
- search: string (searches name and code)
```

**Example:**
```bash
GET /api/masters/gender?activeOnly=true&page=1&limit=50&search=male
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "type": "gender",
      "name": "Male",
      "code": "M",
      "description": "Male gender",
      "isActive": true,
      "displayOrder": 0
    }
  ],
  "total": 3,
  "page": 1,
  "limit": 100,
  "pages": 1,
  "fromCache": true
}
```

#### GET `/api/masters/:type/:id`
Get a specific master data record by ID.

**Example:**
```bash
GET /api/masters/gender/507f1f77bcf86cd799439011
```

### CRUD Operations (Admin Only)

#### POST `/api/masters/:type`
Create a new master data record.

**Request Body:**
```json
{
  "name": "Male",
  "code": "M",
  "description": "Male gender",
  "displayOrder": 0,
  "metadata": {}
}
```

**Example:**
```bash
POST /api/masters/gender
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Male",
  "code": "M",
  "description": "Male gender"
}
```

#### PUT `/api/masters/:type/:id`
Update an existing master data record.

**Example:**
```bash
PUT /api/masters/gender/507f1f77bcf86cd799439011
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Male Updated",
  "description": "Updated description"
}
```

#### DELETE `/api/masters/:type/:id`
Soft delete a master data record (sets isActive to false).

**Example:**
```bash
DELETE /api/masters/gender/507f1f77bcf86cd799439011
Authorization: Bearer <token>
```

### Excel Operations (Admin Only)

#### POST `/api/masters/upload/:type`
Upload and bulk import master data from Excel file.

**Form Data:**
- `file`: Excel/CSV file (multipart/form-data)

**Features:**
- Validates required fields (name, code)
- Checks for duplicate codes
- Performs bulk upsert (insert if new, update if exists)
- Returns detailed error report

**Example:**
```bash
curl -X POST http://localhost:5000/api/masters/upload/gender \
  -H "Authorization: Bearer <token>" \
  -F "file=@gender_data.xlsx"
```

**Response:**
```json
{
  "success": true,
  "message": "Excel import completed",
  "summary": {
    "totalRows": 100,
    "validRows": 98,
    "invalidRows": 2,
    "inserted": 50,
    "updated": 48,
    "errors": 2
  },
  "data": {
    "inserted": [...],
    "updated": [...],
    "errors": [
      {
        "rowNumber": 5,
        "data": { "name": "", "code": "INVALID" },
        "errors": ["Missing required field: name"]
      }
    ]
  }
}
```

#### Role-Permission Excel Template
Use the role-permission template to define access mappings by `roleCode` and `permissionCode`.
- GET `/api/masters/template/role_permission_mapping`
- POST `/api/masters/upload/role_permission_mapping`
- GET `/api/masters/export/role_permission_mapping`

Template columns:
- `roleCode`
- `permissionCode`
- `description`
- `isActive`

Example rows:
```csv
roleCode,permissionCode,description,isActive
ADMIN,MANAGE_USERS,Admin can manage user accounts,true
DOCTOR,VIEW_EMR,Doctor can view EMR records,true
```

#### GET `/api/masters/export/:type`
Export master data to Excel file.

**Query Parameters:**
```
- activeOnly: boolean (default: true)
```

**Example:**
```bash
GET /api/masters/export/gender?activeOnly=true \
  -H "Authorization: Bearer <token>"
```

**Response:**
```json
{
  "success": true,
  "message": "Master data exported successfully",
  "data": {
    "filename": "gender_export_2025-04-05.xlsx",
    "recordCount": 3,
    "downloadUrl": "/exports/gender_export_2025-04-05.xlsx"
  }
}
```

#### GET `/api/masters/template/:type`
Download import template for bulk data entry.

**Example:**
```bash
GET /api/masters/template/gender \
  -H "Authorization: Bearer <token>"
```

### Role-Permission Management

#### GET `/api/masters/role-permissions`
Get role-permission mappings, optionally filtered by role.

**Query Parameters:**
```
- roleId: string (optional, filter by role)
```

**Example:**
```bash
GET /api/masters/role-permissions?roleId=507f1f77bcf86cd799439011
```

#### POST `/api/masters/role-permissions`
Create a new role-permission mapping.

**Request Body:**
```json
{
  "roleId": "507f1f77bcf86cd799439011",
  "permissionId": "507f1f77bcf86cd799439012"
}
```

#### DELETE `/api/masters/role-permissions/:mappingId`
Delete a role-permission mapping.

### Cache Management (Admin Only)

#### GET `/api/masters/cache/stats`
Get cache statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "size": 5,
    "keys": ["mdm:gender:active", "mdm:role:active"],
    "memoryUsage": 250
  }
}
```

#### POST `/api/masters/cache/clear`
Clear cache for specific type or all cache.

**Request Body:**
```json
{
  "type": "gender"  // Optional: clear specific type, omit to clear all
}
```

## Excel Import Format

### Template Structure
The Excel file should have the following columns:
- `name` - Master data name (required)
- `code` - Unique code (required, will be converted to uppercase)
- `description` - Description (optional)
- `metadata` - JSON object in string format (optional)

### Example: Gender Master

| name   | code | description  | metadata |
|--------|------|--------------|----------|
| Male   | M    | Male gender  | {}       |
| Female | F    | Female gender| {}       |

### Import Rules
1. First row is treated as header
2. Empty rows are skipped
3. Required fields: `name`, `code`
4. Code must be unique per type
5. Code is auto-converted to uppercase
6. Name is trimmed of whitespace
7. Invalid rows are reported with specific error messages

## Integration with Existing Modules

### Step 1: Update Models
Replace hardcoded enums with ObjectId references:

```javascript
// BEFORE
const PatientSchema = new mongoose.Schema({
  gender: { type: String, enum: ['Male', 'Female', 'Other'] }
});

// AFTER
const PatientSchema = new mongoose.Schema({
  genderId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'MasterData'
  }
});
```

### Step 2: Update Controllers
Use MDM integration utilities:

```javascript
const mdmIntegration = require('../utils/mdmIntegration');

// Get dropdown options
const genders = await mdmIntegration.getDropdownOptions('gender');

// Validate master data reference
const isValid = await mdmIntegration.validateMasterId('gender', genderId);

// Get specific master by code
const male = await mdmIntegration.getMasterByCode('gender', 'M');
```

### Step 3: Update API Responses
Populate master data in responses:

```javascript
const patients = await Patient.find()
  .populate('genderId')
  .populate('bloodGroupId')
  .lean();
```

## Caching Strategy

The MDM module implements in-memory caching with automatic invalidation:

### Cache Behavior
- **Enabled for:** Simple GET requests (no pagination/search)
- **TTL:** 1 hour (configurable)
- **Invalidation:** Automatic on create/update/delete/bulk import
- **LRU:** Memory-efficient with configurable limits

### Cache Configuration
```javascript
// In mdmService.js
mdmCache.setDefaultTTL(1000 * 60 * 60); // 1 hour
```

### Cache Keys
```
mdm:[type]:active     // Active records cache
mdm:[type]:all        // All records (including inactive)
```

## Performance Optimization

### Database Indexes
The MasterData schema includes the following indexes:
- `type, code` (compound unique)
- `type, isActive`
- `type, name`
- `parentId`

### Bulk Operations
- Bulk upsert is optimized for large imports
- Validation runs in parallel
- Database operations are batched

### Pagination
Default limit: 100 records
Maximum limit: 10,000 records (for exports)

## Security Measures

### Authentication
All endpoints require JWT authentication (via Authorization: Bearer header)

### Authorization
- **View (GET):** All authenticated users
- **Modify (POST/PUT/DELETE):** Admin only
- **Upload/Export:** Admin only
- **Cache Management:** Admin only

### File Upload Security
- Accepted formats: Excel (.xlsx, .xls) and CSV (.csv)
- File size limit: 10 MB
- Content-Type validation
- File type validation

### Input Validation
- SQL injection prevention (Mongoose with MongoDB)
- XSS prevention via schema validation
- Data type validation
- Required field validation
- Unique constraint enforcement

## Error Handling

### Common Error Responses

#### 400 Bad Request
```json
{
  "success": false,
  "message": "Missing required fields: name, code"
}
```

#### 401 Unauthorized
```json
{
  "success": false,
  "message": "Unauthorized: No token provided"
}
```

#### 403 Forbidden
```json
{
  "success": false,
  "message": "Forbidden: Only administrators can modify master data"
}
```

#### 404 Not Found
```json
{
  "success": false,
  "message": "Master data not found"
}
```

#### 409 Conflict
```json
{
  "success": false,
  "message": "Code 'M' already exists for this type"
}
```

#### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Server error"
}
```

## Usage Examples

### Example 1: Fetch & Use Gender Dropdown

**Frontend Request:**
```javascript
const response = await fetch('/api/masters/gender', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const { data } = await response.json();
// data = [{ _id: '...', name: 'Male', code: 'M' }, ...]
```

**Backend Usage:**
```javascript
const mdmIntegration = require('../utils/mdmIntegration');

// In controller
const genderOptions = await mdmIntegration.getDropdownOptions('gender');
res.json({ genders: genderOptions });
```

### Example 2: Create Patient with Master Data Reference

```javascript
const { patientData, genderId } = req.body;

// Validate gender
const isValidGender = await mdmIntegration.validateMasterId('gender', genderId);
if (!isValidGender) {
  return res.status(400).json({ message: 'Invalid gender' });
}

// Create patient with reference
const patient = new Patient({
  ...patientData,
  genderId
});
await patient.save();

// Populate before responding
await patient.populate('genderId');
res.json(patient);
```

### Example 3: Bulk Import Departments

```bash
# Create Excel file with headers: name, code, description
# Example content:
# Cardiology, CARD, Heart and Cardiovascular System
# Surgery, SURG, Surgical Department

curl -X POST http://localhost:5000/api/masters/upload/department \
  -H "Authorization: Bearer <admin_token>" \
  -F "file=@departments.xlsx"
```

### Example 4: Role-Based Permission Check

```javascript
const mdmIntegration = require('../utils/mdmIntegration');

// Check if user's role has permission
const hasViewBilling = await mdmIntegration.hasPermission(
  user.roleId,
  'VIEW_BILLING'
);

if (!hasViewBilling) {
  return res.status(403).json({ message: 'Access denied' });
}
```

## Database Initialization

### Initialize Master Data

Run the initialization script to seed default master data:

```bash
npm run init-mdm
```

Available commands (update package.json scripts):
```json
{
  "scripts": {
    "init-mdm": "node scripts/init-master-data.js",
    "start": "node server.js"
  }
}
```

The script creates master data for:
- All roles (Admin, Doctor, Nurse, Receptionist, Pharmacist)
- All permissions
- Common master data (Gender, Blood Groups, Departments, etc.)

## Troubleshooting

### Issue: Cache Not Invalidating
**Solution:** Check that operations go through the service layer, not directly to the repo.

### Issue: Excel Import Not Working
**Solution:** Verify file format (.xlsx or .csv) and column names match expected format.

### Issue: Slow Queries
**Solution:** 
1. Check database indexes are created
2. Use pagination for large datasets
3. Verify cache is enabled and being used

### Issue: Permission Denied on Upload
**Solution:** Verify user has admin role before uploading.

## Best Practices

1. ✅ Always validate master data references before using
2. ✅ Use dropdown APIs instead of hardcoding values
3. ✅ Implement proper error handling for missing master data
4. ✅ Cache master data on frontend when possible
5. ✅ Use bulk upload for large data migrations
6. ✅ Keep master data codes short and meaningful
7. ✅ Document custom metadata structure for each type
8. ✅ Regularly backup master data exports

## Migration Checklist

When migrating existing modules to use MDM:

- [ ] Create MasterData records for all enum values
- [ ] Update model schemas to use ObjectId references
- [ ] Update controllers to validate master data references
- [ ] Update API responses to populate master data
- [ ] Update frontend to use master data APIs
- [ ] Migrate existing data with codes
- [ ] Add integration tests
- [ ] Update documentation
- [ ] Train users on master data management
- [ ] Plan rollback strategy

## Future Enhancements

- [ ] Role-based master data visibility
- [ ] Master data versioning and rollback
- [ ] Scheduled imports and exports
- [ ] Data quality validation rules
- [ ] Master data replication/sync
- [ ] Audit log viewer UI
- [ ] Data dependencies tracking
- [ ] Master data lifecycle management

---

**Version:** 1.0.0  
**Last Updated:** April 2025  
**Maintained By:** Development Team
