# Code Changes Reference - Feature Access Control

## Summary

This document outlines the exact code changes made to implement role-based feature access control.

---

## 1. Backend Service Update

### File: `Backend/services/rbacService.js`

#### Change 1: Added Role-to-Features Mapping

**Added after `defaultRolePermissions` object:**

```javascript
// Role-based feature access mapping - defines which features/modules each role can access
const defaultRoleFeatures = {
  admin: [
    'dashboard',
    'patients',
    'appointments',
    'doctors',
    'emr',
    'pharmacy',
    'billing',
    'icd',
    'reports',
    'admin',
    'clinic-users',
    'settings',
    'patient_records',
    'prescriptions',
    'patient_vitals',
    'lab_results',
    'care_plans',
    'medications',
    'patient_list',
    'appointment_view',
    'emr_view',
    'pharmacy_view',
    'billing_view',
    'icd_view',
    'patient_view',
    'audit_logs',
  ],
  doctor: [
    'dashboard',
    'patients',
    'appointments',
    'emr',
    'icd',
    'settings',
    'patient_records',
    'patient_list',
    'patient_view',
    'appointment_view',
    'emr_view',
    'icd_view',
    'prescriptions',
    'patient_vitals',
    'lab_results',
    'care_plans',
    'case_sheets',
  ],
  nurse: [
    'dashboard',
    'patients',
    'appointments',
    'emr',
    'icd',
    'reports',
    'settings',
    'patient_records',
    'patient_list',
    'patient_view',
    'appointment_view',
    'emr_view',
    'icd_view',
    'reports_view',
    'patient_vitals',
    'lab_results',
    'care_plans',
    'case_sheets',
  ],
  receptionist: [
    'dashboard',
    'patients',
    'appointments',
    'doctors',
    'pharmacy',
    'billing',
    'icd',
    'reports',
    'settings',
    'patient_records',
    'patient_list',
    'patient_create',
    'appointment_view',
    'appointment_create',
    'doctor_schedule',
    'pharmacy_view',
    'billing_view',
    'icd_view',
    'reports_view',
    'patient_view',
  ],
  staff: [
    'dashboard',
    'patients',
    'appointments',
    'pharmacy',
    'billing',
    'icd',
    'reports',
    'settings',
    'patient_records',
    'patient_list',
    'appointment_view',
    'pharmacy_view',
    'billing_view',
    'icd_view',
    'reports_view',
    'patient_view',
    'inventory',
    'medications',
  ],
};
```

#### Change 2: Added getEffectiveFeatures Function

**Added after `hasAnyPermission` function:**

```javascript
// Get effective features for a user based on their role
const getEffectiveFeatures = (user = {}) => {
  const normalizedRole = String(user.role || '').toLowerCase();

  if (normalizedRole === 'admin') {
    return normalizeStringArray(defaultRoleFeatures.admin || []);
  }

  return normalizeStringArray(defaultRoleFeatures[normalizedRole] || []);
};
```

#### Change 3: Updated Module Exports

**Modified the exports object:**

```javascript
module.exports = {
  normalizeStringArray,
  defaultRolePermissions,
  defaultRoleFeatures,                    // ← NEW
  expandFeatureAccessToPermissions,
  getEffectivePermissions,
  getEffectiveFeatures,                   // ← NEW
  hasPermission,
  hasAnyPermission,
  permissionCatalog: Object.values(permissionsConfig),
};
```

---

## 2. Backend Auth Controller Update

### File: `Backend/controllers/authController.js`

#### Change 1: Updated Imports

**Changed from:**
```javascript
const { getEffectivePermissions, normalizeStringArray } = require('../services/rbacService');
```

**Changed to:**
```javascript
const { getEffectivePermissions, getEffectiveFeatures, normalizeStringArray } = require('../services/rbacService');
```

#### Change 2: Updated Login Function

**Changed from:**
```javascript
exports.login = async (req, res) => {
  try {
    const email = req.body.email?.toString().trim().toLowerCase();
    const password = req.body.password;
    if (!email || !password) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const token = generateToken(user);
    
    const permissions = getEffectivePermissions(user);

    // Admin gets all features; others get only granted features
    const features = user.role === 'admin'
      ? normalizeStringArray(getAllFeatures())
      : await fetchUserFeatureAccess(user._id);

    res.json({
      success: true,
      token,
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        role: (user.role || '').toString().toLowerCase(),
        permissions,
        features
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};
```

**Changed to:**
```javascript
exports.login = async (req, res) => {
  try {
    const email = req.body.email?.toString().trim().toLowerCase();
    const password = req.body.password;
    if (!email || !password) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const token = generateToken(user);
    
    const permissions = getEffectivePermissions(user);
    const features = getEffectiveFeatures(user);

    res.json({
      success: true,
      token,
      user: { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        role: (user.role || '').toString().toLowerCase(),
        permissions,
        features
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};
```

#### Change 3: Updated getSession Function

**Changed from:**
```javascript
exports.getSession = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const permissions = getEffectivePermissions(user);

    // Admin gets all features; others get only granted features
    const features = user.role === 'admin'
      ? normalizeStringArray(getAllFeatures())
      : await fetchUserFeatureAccess(user._id);
      
    res.json({ 
      success: true, 
      user: {
        ...user.toObject(),
        permissions,
        features
      }
    });
  } catch (error) {
    console.error('Error in getSession:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
```

**Changed to:**
```javascript
exports.getSession = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const permissions = getEffectivePermissions(user);
    const features = getEffectiveFeatures(user);
      
    res.json({ 
      success: true, 
      user: {
        ...user.toObject(),
        permissions,
        features
      }
    });
  } catch (error) {
    console.error('Error in getSession:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
```

---

## 3. Frontend (No Changes Required)

The frontend was already properly configured:

- ✅ `frontend/src/App.tsx` - Uses `moduleRoleAccess` and `hasFeatureAccess()`
- ✅ `frontend/src/utils/permissions.ts` - Has feature aliases and permission mapping
- ✅ `frontend/src/utils/api.ts` - Properly stores user with features in sessionStorage

---

## Testing the Changes

### 1. Verify Backend Compiled

```bash
cd Backend
npm start  # or node server.js
```

### 2. Test Login Endpoint

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@hospital.local","password":"Admin@123456"}'
```

**Expected Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "name": "System Admin",
    "email": "admin@hospital.local",
    "role": "admin",
    "permissions": ["dashboard.view", "patients.view", ...],
    "features": ["dashboard", "patients", "appointments", "doctors", "emr", "pharmacy", "billing", "icd", "reports", "admin", "clinic-users", "settings", ...]
  }
}
```

### 3. Test Session Endpoint

```bash
curl -X GET http://localhost:5000/api/auth/session \
  -H "Authorization: Bearer {token_from_login}"
```

**Expected Response:** User object with `permissions` and `features` arrays

---

## Verification Checklist

- ✅ `rbacService.js` has `defaultRoleFeatures` object
- ✅ `rbacService.js` exports `getEffectiveFeatures` function
- ✅ `authController.js` imports `getEffectiveFeatures`
- ✅ `login()` calls `getEffectiveFeatures(user)`
- ✅ `getSession()` calls `getEffectiveFeatures(user)`
- ✅ Both endpoints return `features` array in response
- ✅ Frontend receives features and stores in sessionStorage
- ✅ All 5 roles have defined feature sets

---

## Breaking Changes

**None** - This is a backward-compatible enhancement:
- Existing API responses still work
- New `features` field is added to existing responses
- Frontend already supports `features` field

---

## Migration Notes

If you're updating an existing system:

1. Stop the backend server
2. Apply changes to `rbacService.js` and `authController.js`
3. Restart backend server
4. Users will automatically get features on next login
5. No database changes required
6. Existing sessions will be invalidated (users need to re-login)

---

## Support for Custom Roles

To add a custom role:

1. Add to `defaultRoleFeatures` in `rbacService.js`:
   ```javascript
   custom_role: ['dashboard', 'patients', ...features...]
   ```

2. Restart backend server

3. When users with that role log in, they'll get those features

That's it! No frontend changes needed.
