# Master Data Management (MDM) - Quick Start Guide

## Installation & Setup

### 1. Install Dependencies
```bash
cd Backend
npm install
```

This will install multer (already added to package.json) along with other dependencies.

### 2. Register Routes in Server

The MDM routes have been automatically added to `server.js`. No additional configuration needed.

### 3. Initialize Master Data

Run this command to seed initial master data:

```bash
npm run init-mdm
```

This creates default values for:
- Roles: Admin, Doctor, Nurse, Receptionist, Pharmacist
- Permissions: View/Manage various modules
- Patient data: Gender, Blood Groups, Marital Status, Patient Type
- Doctor data: Departments, Specializations
- Appointment: Statuses, Visit Types, Consultation Types
- Billing: Payment Status, Payment Methods, Invoice Types
- Pharmacy: Medicine Categories, Dosage Forms, Units

## Quick Test

### 1. Start Backend Server
```bash
npm start
```

### 2. Get All Genders
```bash
curl -X GET http://localhost:5000/api/masters/gender \
  -H "Authorization: Bearer <admin_token>"
```

### 3. Create New Gender (Admin Only)
```bash
curl -X POST http://localhost:5000/api/masters/gender \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Non-Binary",
    "code": "NB",
    "description": "Non-binary gender"
  }'
```

### 4. Upload Excel File
First, create an Excel file with columns: `name`, `code`, `description`

```bash
curl -X POST http://localhost:5000/api/masters/upload/gender \
  -H "Authorization: Bearer <admin_token>" \
  -F "file=@genders.xlsx"
```

### 5. Export to Excel
```bash
curl -X GET http://localhost:5000/api/masters/export/gender \
  -H "Authorization: Bearer <admin_token>"
```

## File Structure

```
Backend/
├── models/
│   ├── MasterData.js          # Main MDM schema
│   ├── RolePermission.js       # Role-permission mapping
│   └── ... (existing models)
│
├── controllers/
│   ├── mdmController.js        # API endpoint handlers
│   └── ... (existing controllers)
│
├── services/
│   ├── mdmService.js           # Business logic layer
│   └── ... (existing services)
│
├── repositories/
│   ├── mdmRepository.js        # Database operations
│   └── ... (existing repositories)
│
├── routes/
│   ├── mdm.js                  # MDM endpoints
│   └── ... (existing routes)
│
├── middleware/
│   ├── mdmMiddleware.js        # Authorization & file upload
│   └── ... (existing middleware)
│
├── utils/
│   ├── excelHandler.js         # Excel import/export
│   ├── mdmCache.js             # In-memory caching
│   ├── mdmIntegration.js       # Integration helpers
│   └── ... (existing utilities)
│
├── scripts/
│   ├── init-master-data.js     # Seed script
│   └── ... (existing scripts)
│
├── MDM_README.md               # Full documentation
├── MDM_INTEGRATION_GUIDE.md    # Integration instructions
└── MDM_REFERENCE_IMPLEMENTATION.md # Code examples
```

## Key Features

✅ **Centralized Master Data**
- All reference data in one place
- Eliminates hardcoding

✅ **Excel Import/Export**
- Bulk upload data
- Download templates
- Error reporting

✅ **Caching**
- In-memory cache (1-hour TTL)
- Automatic invalidation
- Performance optimization

✅ **Security**
- JWT authentication
- Admin-only modifications
- File upload validation

✅ **Flexibility**
- Custom metadata fields
- Hierarchical data support
- Soft delete (non-destructive)

## Common Use Cases

### Use Case 1: Fetch Dropdown for Gender
```javascript
// Frontend
const response = await fetch('/api/masters/gender', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const { data } = await response.json();
// Use data to populate dropdown
```

### Use Case 2: Validate Master Data Reference
```javascript
// Backend Controller
const mdmIntegration = require('../utils/mdmIntegration');

const isValid = await mdmIntegration.validateMasterId('gender', genderId);
if (!isValid) {
  return res.status(400).json({ message: 'Invalid gender' });
}
```

### Use Case 3: Bulk Import Department Masters
```bash
# Create Excel file with: name, code, description
curl -X POST http://localhost:5000/api/masters/upload/department \
  -H "Authorization: Bearer <admin_token>" \
  -F "file=@departments.xlsx"
```

## Master Data Types Available

| Type | Code | Usage |
|------|------|-------|
| Role | `role` | User roles |
| Permission | `permission` | System permissions |
| Gender | `gender` | Patient gender |
| Blood Group | `blood_group` | Blood types |
| Department | `department` | Doctor specialization |
| Appointment Status | `appointment_status` | Appointment state |
| Payment Method | `payment_method` | Payment types |
| Medicine Category | `medicine_category` | Drug classification |
| ... | ... | See MDM_README.md for full list |

## Integration Checklist

- [ ] Run `npm run init-mdm` to seed data
- [ ] Test GET `/api/masters/gender` endpoint
- [ ] Test POST to create new master data
- [ ] Update Patient model to use `genderId` reference
- [ ] Update Patient controller to validate references
- [ ] Update frontend to fetch dropdowns from API
- [ ] Test Excel upload with sample file
- [ ] Update other modules (Appointments, Billing, etc.)

## Troubleshooting

**Problem:** "Unauthorized" error when uploading
- **Solution:** Use admin account, check JWT token is valid

**Problem:** Excel file not being parsed
- **Solution:** Ensure file is .xlsx or .csv, has data rows with headers

**Problem:** "Code already exists" error
- **Solution:** Use unique codes, check database for duplicates

**Problem:** Slow performance
- **Solution:** Check cache is working, verify indexes exist, use pagination

## Documentation

For detailed information, see:
1. **MDM_README.md** - Complete API reference and features
2. **MDM_INTEGRATION_GUIDE.md** - How to integrate with existing modules
3. **MDM_REFERENCE_IMPLEMENTATION.md** - Code examples and patterns

## Support

For issues, check:
1. Database connection (MongoDB URI)
2. Admin user exists in database
3. Required fields in Excel/JSON
4. JWT token is valid and not expired
5. Backend server is running on correct port

## Next Steps

1. ✅ Initialize master data: `npm run init-mdm`
2. ✅ Test endpoints with sample requests
3. ✅ Migrate Patient module (follow MDM_REFERENCE_IMPLEMENTATION.md)
4. ✅ Migrate Appointment module
5. ✅ Migrate Billing module
6. ✅ Update frontend components to use MDM APIs

---

**Version:** 1.0.0
**Last Updated:** April 2025
