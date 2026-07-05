# Clinic Management System - User Module Documentation

## 📋 Overview

A comprehensive role-based user management system for the Hospital Information System with dynamic forms, validation, and RBAC controls. Supports creation and management of different user roles with role-specific configurations.

## 🎯 Features

### 1. **User Types & Roles**
- **Doctor** - Medical professionals with specializations
- **Receptionist** - Front-desk staff managing appointments
- **Nurse** - Medical support staff
- **Admin** - System administrators

### 2. **Dynamic Forms**
- Common fields for all users (name, email, phone, etc.)
- Role-specific fields that appear based on selected role
- Real-time password strength validation
- Client-side & server-side validation

### 3. **Role-Based Access Control (RBAC)**

#### Admin Permissions
- ✅ Full access: Create, read, update, delete users
- ✅ Grant feature access to users
- ✅ View all users across roles
- ✅ Manage clinic operations

#### Doctor Permissions
- ✅ Access patient records
- ✅ Write prescriptions
- ✅ Manage appointments
- ❌ Create/delete other users

#### Receptionist Permissions
- ✅ Manage appointments
- ✅ Handle billing
- ✅ Patient registration
- ❌ Edit medical records

#### Nurse Permissions
- ✅ Update patient vitals
- ✅ Assist doctors
- ✅ View patient information
- ❌ Access billing

### 4. **Form Validation**

#### Common Field Validation
```
- Full Name: Min 3 characters
- Email: Valid email format (RFC compliant)
- Phone: 10-digit Indian phone number (+91 prefix optional)
- Date of Birth: Must be 18+ years old
- Password: 
  * Min 8 characters
  * Uppercase letter (A-Z)
  * Lowercase letter (a-z)
  * Number (0-9)
  * Special character (!@#$%^&*)
```

#### Doctor-Specific Validation
```
- Specialization: Required from predefined list
- Qualification: Required (e.g., MBBS, MD)
- Experience: Non-negative number
- License Number: Valid format
- License Expiry: Must be in future
- Registration Number: Valid format
- Consultation Fees: > 0
- Department: Required
- Available Days: At least one day
- Time Slots: At least one slot with valid times
```

#### Receptionist-Specific Validation
```
- Shift Timing: Start < End
- Work Experience: Non-negative number
- Days of Work: At least one day
- Department: Optional
```

#### Nurse-Specific Validation
```
- Qualification: Required (GNM, BSc, etc.)
- Registration Number: Valid format
- Experience: Non-negative number
- Shift Timing: Start < End
- Days of Work: At least one day
```

## 📁 Backend Structure

### Models

#### User Model
```javascript
- _id: ObjectId
- name: String (required)
- email: String (unique, required)
- phone: String (required)
- password: String (hashed)
- role: String ('doctor' | 'receptionist' | 'nurse' | 'admin')
- gender: String ('Male' | 'Female' | 'Other')
- dateOfBirth: Date
- address: String
- status: String ('active' | 'inactive')
- username: String (unique)
- profileImage: String (optional)
- createdBy: ObjectId (reference to User)
- createdAt: Date
- updatedAt: Date
- updatedBy: ObjectId
- deletedAt: Date
- deletedBy: ObjectId
```

#### DoctorProfile Model
```javascript
- _id: ObjectId
- userId: ObjectId (reference to User, unique)
- specialization: String (enum)
- qualification: String
- experience: Number
- licenseNumber: String (unique)
- licenseExpiry: Date
- consultationFees: Number
- department: ObjectId (reference to MasterData)
- availableDays: [String]
- timeSlots: [
    {
      day: String,
      startTime: String (HH:MM),
      endTime: String (HH:MM),
      slotDuration: Number
    }
  ]
- bio: String (optional)
- registrationNumber: String (unique)
- isVerified: Boolean
- createdAt: Date
- updatedAt: Date
```

#### ReceptionistProfile Model
```javascript
- _id: ObjectId
- userId: ObjectId (reference to User, unique)
- shiftTiming: {
    startTime: String (HH:MM),
    endTime: String (HH:MM),
    daysOfWeek: [String]
  }
- workExperience: Number
- department: ObjectId (optional)
- assignedToDoctor: ObjectId (optional)
- skills: [String]
- createdAt: Date
- updatedAt: Date
```

#### NurseProfile Model
```javascript
- _id: ObjectId
- userId: ObjectId (reference to User, unique)
- qualification: String (enum)
- registrationNumber: String (unique)
- experience: Number
- assignedDoctor: ObjectId (optional)
- assignedDepartment: ObjectId (optional)
- shiftTiming: {
    startTime: String (HH:MM),
    endTime: String (HH:MM),
    daysOfWeek: [String]
  }
- specialization: String (default: 'General')
- certifications: [String]
- createdAt: Date
- updatedAt: Date
```

### Routes

```
POST   /api/clinic-users              - Create new user (Admin only)
GET    /api/clinic-users              - Get all users with filters
GET    /api/clinic-users/:userId      - Get specific user
GET    /api/clinic-users/role/:role   - Get users by role
PUT    /api/clinic-users/:userId      - Update user (Admin only)
DELETE /api/clinic-users/:userId      - Delete user soft-delete (Admin only)
```

### Controllers

**clinicUserController.js**
- `createClinicUser()` - Create user with role validation
- `getClinicUser()` - Fetch user with role profile
- `getAllClinicUsers()` - List users with filters
- `updateClinicUser()` - Update user details
- `deleteClinicUser()` - Soft delete user
- `getUsersByRole()` - Get users filtered by role

### Validation

**validationRules.js** exports:
- `validateEmail(email)` - RFC compliant email validation
- `validatePhone(phone)` - Indian phone number validation
- `validatePassword(password)` - Password strength check
- `validateDateOfBirth(dob)` - Age validation (18+)
- `validateLicenseNumber(license)` - License format validation
- `validateRegistrationNumber(regNum)` - Registration format
- `validateExperience(exp)` - Non-negative experience
- `validateTimeSlot(startTime, endTime)` - Time slot validation
- `validateCommonUserFields(data)` - Common field validation
- `validateDoctorProfile(data)` - Doctor-specific validation
- `validateReceptionistProfile(data)` - Receptionist-specific validation
- `validateNurseProfile(data)` - Nurse-specific validation

## 🎨 Frontend Components

### ClinicUserForm.tsx
**Main user creation form component**
- Dynamic field rendering based on role
- Real-time password strength indicator
- Form validation with error display
- Role-specific field sections:
  - Doctor: Specialization, qualifications, time slots
  - Receptionist: Shift timing, experience
  - Nurse: Qualifications, shifts, department

**Features:**
- File upload support (profile image)
- Checkbox selection for available days
- Dynamic time slot management
- Multi-select capabilities

### ClinicUserManagement.tsx
**User listing and management interface**
- Search by name, email, phone
- Filter by role and status
- User statistics dashboard
- Edit/Delete actions
- Status badges with color coding
- Responsive table layout

**Actions:**
- View user details
- Edit user information
- Delete user (soft delete)
- Grant feature access
- Change user status

## 🔐 Security Features

### Authentication & Authorization
- JWT token-based authentication
- Role-normalized to lowercase
- Admin-only CRUD operations
- Middleware-based access control

### Data Protection
- Password hashing with bcryptjs (10 salt rounds)
- Soft deletes (mark as inactive, don't remove)
- Audit trails (createdBy, updatedBy, deletedBy)
- Unique constraints on email, phone, license numbers

### Validation
- Client-side validation for UX
- Server-side validation for security
- Email format validation
- Password strength requirements
- Phone number format validation

## 📊 Database Schema

### Relationships
```
User (1) ←→ (1) DoctorProfile
User (1) ←→ (1) ReceptionistProfile
User (1) ←→ (1) NurseProfile
User → MasterData (department reference)
DoctorProfile → MasterData (department reference)
```

### Indexes
- User: `{ email: 1 }`, `{ phone: 1 }`, `{ role: 1, status: 1 }`
- DoctorProfile: `{ userId: 1 }`, `{ licenseNumber: 1 }`
- ReceptionistProfile: `{ userId: 1 }`
- NurseProfile: `{ userId: 1 }`, `{ registrationNumber: 1 }`

## 🚀 API Usage Examples

### Create Doctor User
```bash
POST /api/clinic-users
Content-Type: application/json
Authorization: Bearer <token>

{
  "commonFields": {
    "fullName": "Dr. Rajesh Kumar",
    "gender": "Male",
    "dateOfBirth": "1985-03-15",
    "phone": "9876543210",
    "email": "rajesh@hospital.com",
    "address": "123 Medical Complex, City",
    "role": "doctor",
    "username": "dr_rajesh",
    "password": "SecurePass@123",
    "status": "active"
  },
  "roleSpecificFields": {
    "specialization": "Cardiology",
    "qualification": "MBBS, MD Cardiology",
    "experience": 12,
    "licenseNumber": "MED1234567",
    "licenseExpiry": "2028-12-31",
    "registrationNumber": "REG9876543",
    "consultationFees": 500,
    "department": "507f1f77bcf86cd799439011",
    "availableDays": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    "timeSlots": [
      {
        "day": "Monday",
        "startTime": "09:00",
        "endTime": "12:00",
        "slotDuration": 30
      }
    ]
  }
}
```

### Get All Doctors
```bash
GET /api/clinic-users/role/doctor
Authorization: Bearer <token>
```

### Update User
```bash
PUT /api/clinic-users/507f1f77bcf86cd799439011
Content-Type: application/json
Authorization: Bearer <token>

{
  "commonFields": {
    "fullName": "Dr. Rajesh Kumar Updated",
    "phone": "9876543211",
    "status": "active"
  },
  "roleSpecificFields": {
    "consultationFees": 600
  }
}
```

## 🔄 Integration with Existing System

### In server.js
```javascript
const clinicUserRoutes = require('./routes/clinicUsers');
app.use('/api/clinic-users', clinicUserRoutes);
```

### In App.tsx
```typescript
import { ClinicUserManagement } from './components/modules/admin/ClinicUserManagement';

// Added to admin modules:
{
  id: 'clinic-users',
  title: 'Clinic Users',
  icon: UserPlus,
  color: 'bg-cyan-500',
  component: ClinicUserManagement
}

// Added to admin's allowedModules
```

### In API Client
```typescript
// Methods available in ApiClient:
ApiClient.post('/clinic-users', userData)
ApiClient.get('/clinic-users')
ApiClient.get('/clinic-users/:userId')
ApiClient.put(`/clinic-users/:userId`, updateData)
ApiClient.delete(`/clinic-users/:userId`)
ApiClient.get('/clinic-users/role/:role')
```

## 📱 User Interface Flow

1. **Login** → Authenticate as Admin
2. **Navigate** → Click "Clinic Users" in sidebar
3. **View List** → See all users with filters
4. **Create** → Click "Add New User" button
5. **Select Role** → Choose role (Doctor/Receptionist/Nurse)
6. **Fill Form** → Complete common fields and role-specific fields
7. **Validate** → Real-time validation feedback
8. **Submit** → Create user in database
9. **Confirm** → See success toast notification
10. **Manage** → Edit or delete users from list

## ⚡ Performance Optimizations

- **Pagination**: Supports query params for large datasets
- **Filtering**: Server-side role and status filtering
- **Indexing**: Database indexes on frequently queried fields
- **Caching**: Optional MasterData caching for departments
- **Lazy Loading**: Role-specific components load on demand

## 🧪 Testing Recommendations

### Unit Tests
- Validation function tests
- Password strength validation
- Date validation (age check)
- Email/phone validation

### Integration Tests
- User creation with role profiles
- User update operations
- Soft delete functionality
- Role-based access control

### E2E Tests
- Complete user creation flow
- Form validation UI
- Error handling
- Success notifications

## 📝 Audit Logging

All operations are tracked:
- **Create**: `createdBy`, `createdAt`
- **Update**: `updatedBy`, `updatedAt`
- **Delete**: `deletedBy`, `deletedAt`

## 🔮 Future Enhancements

1. **Batch Import** - Upload users from CSV/Excel
2. **Profile Images** - Image upload and storage
3. **Email Verification** - Confirm user email addresses
4. **Activity Audit** - Complete action history
5. **Salary Management** - Add compensation details
6. **Leave Management** - Track leave balance
7. **Performance Reviews** - Annual evaluations
8. **2FA Authentication** - Two-factor authentication

## 🐛 Troubleshooting

### Common Issues

**Issue**: "Feature access type not found"
**Solution**: Ensure 'feature_access' is in MasterData schema enum

**Issue**: Time slot validation errors
**Solution**: Ensure startTime < endTime in HH:MM format

**Issue**: License number validation fails
**Solution**: Use format like "MED1234567" (letters followed by numbers)

**Issue**: User creation returns 403
**Solution**: Confirm you're logged in as admin (role: 'admin')

## 📞 Support

For issues or questions:
1. Check error messages in browser console
2. Review server logs
3. Verify database connectivity
4. Check user permissions
5. Validate data format

## 📄 License

Part of Hospital Information System (HIS)
