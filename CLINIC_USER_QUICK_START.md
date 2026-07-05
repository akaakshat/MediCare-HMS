# Clinic User Management - Quick Start Guide

## 🚀 Getting Started

### Step 1: Backend Setup

The backend is already configured. Just ensure the following files exist:

```
Backend/
├── models/
│   ├── DoctorProfile.js
│   ├── ReceptionistProfile.js
│   └── NurseProfile.js
├── controllers/
│   └── clinicUserController.js
├── routes/
│   └── clinicUsers.js
├── utils/
│   └── validationRules.js
└── server.js (updated with clinic-users route)
```

### Step 2: Frontend Setup

Components are ready in:

```
frontend/src/components/modules/admin/
├── ClinicUserForm.tsx
└── ClinicUserManagement.tsx
```

Updated in `App.tsx` with new module.

### Step 3: Test the System

#### 1. Start Backend
```bash
cd Backend
npm start
```

#### 2. Start Frontend
```bash
cd frontend
npm run dev
```

#### 3. Login as Admin
- Email: `admin@hospital.com`
- Password: `admin123`

#### 4. Navigate to Clinic Users
1. Click on sidebar menu
2. Find "Clinic Users" option (cyan colored icon)
3. Click to open the user management interface

### Step 4: Create Your First User

#### Option A: Create a Doctor
1. Click "Add New User" button
2. Fill Common Fields:
   - Full Name: `Dr. John Doe`
   - Email: `john@hospital.com`
   - Phone: `9876543210`
   - Gender: Male
   - DOB: `1985-05-15`
   - Address: Hospital Complex
   - Username: `dr_john`
   - Password: `SecurePass@123` (must have uppercase, lowercase, number, special char)
   - Role: **Doctor**

3. Fill Doctor-Specific Fields:
   - Specialization: Cardiology
   - Qualification: MBBS, MD Cardiology
   - Experience: 10
   - License Number: MED1234567
   - License Expiry: 2028-12-31
   - Registration Number: REG7654321
   - Consultation Fees: 500
   - Department: Select from dropdown
   - Available Days: Check Mon-Fri
   - Time Slots: Add 09:00-12:00 (30 min slots)

4. Click "Create User"

#### Option B: Create a Receptionist
1. Click "Add New User" button
2. Fill Common Fields (same as above)
3. Role: **Receptionist**
4. Fill Receptionist Fields:
   - Shift Start: 08:00
   - Shift End: 17:00
   - Work Experience: 5
   - Department: Optional

5. Click "Create User"

#### Option C: Create a Nurse
1. Click "Add New User" button
2. Fill Common Fields
3. Role: **Nurse**
4. Fill Nurse Fields:
   - Qualification: BSc Nursing
   - Registration: NUR1234567
   - Experience: 8
   - Specialization: ICU (optional)
   - Shift Start: 07:00
   - Shift End: 15:00

5. Click "Create User"

## 📋 Validation Rules Quick Reference

### Password Requirements
✓ Minimum 8 characters  
✓ At least one UPPERCASE letter  
✓ At least one lowercase letter  
✓ At least one NUMBER  
✓ At least one SPECIAL character (!@#$%^&*)

**Example**: `Hospital@2024` ✓

### Email Format
Valid: `user@hospital.com`, `dr.name@clinic.co.in`  
Invalid: `userhospital.com`, `user@.com`

### Phone Number
Valid: `9876543210`, `+919876543210`, `919876543210`  
Must start with 6-9

### License & Registration Numbers
Format: Letters followed by numbers  
Example: `MED1234567`, `REG9876543`

### Dates
- Date of Birth: Must be 18+ years old
- License Expiry: Must be in the future

## 🎯 Common Tasks

### View All Users
1. Go to "Clinic Users"
2. Check search bar and filters
3. All users displayed in table

### Filter Users by Role
1. Click "Role" dropdown
2. Select: Doctor, Receptionist, Nurse, or Admin
3. Click "Apply Filters"

### Search for User
1. Type in search box (name, email, or phone)
2. Results update in real-time

### Delete User
1. Find user in table
2. Click red trash icon
3. Confirm deletion
4. User marked as inactive (soft delete)

### View User Statistics
- At the bottom of user list
- Shows: Total, Doctors, Receptionists, Nurses

## 🔒 Access Control

### What Each Role Can Do

**Admin**
- ✅ Create users
- ✅ Edit users
- ✅ Delete users
- ✅ View all users
- ✅ Grant feature access

**Doctor**
- ✅ View patients
- ✅ Create prescriptions
- ✅ Manage appointments
- ❌ Create users

**Receptionist**
- ✅ Manage appointments
- ✅ Handle billing
- ✅ Register patients
- ❌ Edit medical records

**Nurse**
- ✅ Update vitals
- ✅ Assist doctors
- ✅ View patient info
- ❌ Access billing

## 🐛 Troubleshooting

### Issue: "Only administrators can create clinic users"
**Solution**: You must be logged in as admin (role: admin)

### Issue: Password validation error
**Solution**: Password must include:
- 8+ characters
- Uppercase letter
- Lowercase letter
- Number
- Special character

### Issue: "Invalid phone number"
**Solution**: Use 10-digit format starting with 6-9
- ✓ 9876543210
- ✓ +919876543210
- ❌ 0876543210

### Issue: "User with this email already exists"
**Solution**: Use a different email address

### Issue: License expiry error
**Solution**: Ensure date is in future (not past)

### Issue: Time slot error
**Solution**: Ensure end time is after start time

## 📊 Database Collections Created

- `users` - Main user table
- `doctor_profiles` - Doctor-specific data
- `receptionist_profiles` - Receptionist-specific data
- `nurse_profiles` - Nurse-specific data

## 🔑 Default Admin Credentials

**Email**: `admin@hospital.com`  
**Password**: `admin123`

⚠️ Change these credentials in production!

## 📝 API Endpoints

All endpoints require authentication (Bearer token)

```
POST   /api/clinic-users              Create user
GET    /api/clinic-users              List all users
GET    /api/clinic-users/:userId      Get specific user
GET    /api/clinic-users/role/:role   Get by role
PUT    /api/clinic-users/:userId      Update user
DELETE /api/clinic-users/:userId      Delete user
```

## 💡 Tips & Tricks

1. **Bulk Time Slots**: Click "+ Add Slot" to add multiple consultation slots
2. **Available Days**: Select weekdays the doctor is available
3. **Search Tips**: Search by full name, email, or phone number
4. **Status Tracking**: Active/Inactive badges show user status
5. **Role Colors**: Each role has unique color badge for quick identification

## 🎓 Learning Path

1. **Start**: Create a Doctor user
2. **Practice**: Create a Receptionist
3. **Experiment**: Try creating a Nurse
4. **Master**: Edit and delete users
5. **Advanced**: Grant feature access to users

## 📞 Getting Help

Check these sections in documentation:
- Requirements: CLINIC_USER_MANAGEMENT_GUIDE.md
- API Reference: Backend routes
- Validation Rules: validationRules.js
- Component Code: ClinicUserForm.tsx, ClinicUserManagement.tsx

## ✅ Verification Checklist

- [ ] Backend running on port 5000
- [ ] Frontend running on port 5173
- [ ] Logged in as admin
- [ ] Can see "Clinic Users" in sidebar
- [ ] Can create a test doctor user
- [ ] Can see user in the list
- [ ] Can filter by role
- [ ] Can search for user
- [ ] Can delete user
- [ ] Can view user statistics

Once all checked ✓, you're ready to use the Clinic User Management System!

---

**Version**: 1.0  
**Last Updated**: April 2026  
**Status**: Production Ready ✓
