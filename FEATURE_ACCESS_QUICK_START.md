# Role-Based Feature Access - Quick Setup Guide

## ✅ Implementation Complete

The role-based feature access system is now fully implemented and ready to use. Here's what was done:

### Backend Changes

**File**: `Backend/services/rbacService.js`
- ✅ Added `defaultRoleFeatures` object with role-to-features mapping
- ✅ Added `getEffectiveFeatures()` function to determine features based on user role
- ✅ Exported new function for use in authentication

**File**: `Backend/controllers/authController.js`
- ✅ Updated `login()` to use `getEffectiveFeatures()` from rbacService
- ✅ Updated `getSession()` to use `getEffectiveFeatures()` from rbacService
- ✅ Now consistently assigns features based on user roles

## 🚀 Getting Started

### 1. Start the Backend Server

```bash
cd Backend
npm install    # if not already done
node server.js # or npm start
```

The backend will be running at `http://localhost:5000/api`

### 2. Start the Frontend

```bash
cd frontend
npm install    # if not already done
npm run dev
```

The frontend will be running at `http://localhost:5173` (or similar)

## 🔐 Testing Different Roles

Each user role automatically gets the correct feature set when they log in:

### Admin Account
```
Email: admin@hospital.local
Password: Admin@123456
Features: All modules unlocked
```

### Create Test Accounts (Optional)

You can create users with different roles. When they log in, they'll automatically get the right features:

- **Doctor**: Access to patients, appointments, EMR, ICD, settings
- **Nurse**: Access to patients, appointments, EMR, ICD, reports, settings  
- **Receptionist**: Access to patients, appointments, doctors, pharmacy, billing, ICD, reports
- **Staff**: Access to patients, appointments, pharmacy, billing, ICD, reports

## 📋 Feature Access Matrix

### Admin
- **Can Access**: dashboard, patients, appointments, doctors, emr, pharmacy, billing, icd, reports, admin, clinic-users, settings
- **Permissions**: Full system access

### Doctor
- **Can Access**: dashboard, patients, appointments, emr, icd, settings
- **Cannot Access**: billing, pharmacy, admin, clinic-users
- **Key Features**: Patient records, EMR, Vitals

### Nurse
- **Can Access**: dashboard, patients, appointments, emr, icd, reports, settings
- **Cannot Access**: billing, pharmacy, doctors, admin, clinic-users
- **Key Features**: Patient care, EMR, Reports

### Receptionist
- **Can Access**: dashboard, patients, appointments, doctors, pharmacy, billing, icd, reports, settings
- **Cannot Access**: emr, admin, clinic-users
- **Key Features**: Scheduling, Billing, Pharmacy

### Staff
- **Can Access**: dashboard, patients, appointments, pharmacy, billing, icd, reports, settings
- **Cannot Access**: doctors, emr, admin, clinic-users
- **Key Features**: Pharmacy, Billing, Reports

## 🧪 Verification Steps

### 1. Verify Backend Assigns Features

```bash
# In terminal, check if getEffectiveFeatures is exported:
grep -n "getEffectiveFeatures" Backend/services/rbacService.js

# You should see: getEffectiveFeatures defined and exported
```

### 2. Verify Login Returns Features

Open browser developer tools (F12) and:

1. Go to login page
2. Log in with any user
3. Open Console tab
4. Run:
   ```javascript
   const user = JSON.parse(sessionStorage.getItem('hospital_user'));
   console.log('Role:', user.role);
   console.log('Features:', user.features);
   ```

You should see an array of features appropriate for that role.

### 3. Verify Frontend Module Access

After login:

1. Look at sidebar/dashboard
2. Modules should be enabled/disabled based on role
3. Locked modules show a lock icon
4. Only unlocked modules are clickable

### 4. Test Different Roles

1. Log in as Admin → All modules visible ✅
2. Log out
3. Log in as Doctor → Only doctor modules visible ✅
4. Log out
5. Log in as Receptionist → Only receptionist modules visible ✅

## 🔍 Troubleshooting

### Problem: All modules are showing for every role

**Solution**: 
- Clear browser cache and localStorage
- Restart frontend dev server
- Clear sessionStorage: `sessionStorage.clear()`
- Log out and log back in

### Problem: Module shows as locked but shouldn't be

**Solution**:
1. Check user's role in database
2. Verify role is spelled correctly (lowercase)
3. Check `defaultRoleFeatures` in rbacService.js for that role
4. Clear sessionStorage and re-login

### Problem: Getting "No token provided" error

**Solution**:
- Make sure you're logged in
- Check sessionStorage has `hospital_access_token`
- Make sure backend auth token is not expired
- Re-login if needed

## 📊 Configuration Files

All role-based access is configured in these files:

1. **Backend/services/rbacService.js**
   - Lines: `defaultRoleFeatures` object
   - Define which features each role can access

2. **Backend/config/permissions.js**
   - Centralized permission catalog
   - Maps permission names to permission strings

3. **frontend/src/App.tsx**
   - Lines: `moduleRoleAccess` object
   - Defines which modules exist

4. **frontend/src/utils/permissions.ts**
   - Feature aliases and permission mapping

## ✨ Key Features Implemented

✅ **Automatic Feature Assignment**: Features assigned based on role at login
✅ **Consistent Access Control**: Same logic on frontend and backend
✅ **Easy to Manage**: Add/modify roles in one place (rbacService.js)
✅ **Secure**: Backend validates permissions, frontend respects them
✅ **User-Friendly**: Locked modules show visual lock icon

## 📝 Next Steps

1. **Test the system** with different user accounts
2. **Monitor logs** for any permission errors
3. **Create test cases** for each role to verify access
4. **Document** any custom features your organization adds

## 📞 Support

If you need to:
- **Add a new role**: Update `defaultRoleFeatures` in rbacService.js
- **Modify role access**: Edit the features array for that role
- **Add a new feature**: Add to module list and update appropriate roles

---

**System Status**: ✅ Ready to use
**Last Updated**: 2024
**Documentation**: See `FEATURE_ACCESS_SYSTEM.md` for detailed information
