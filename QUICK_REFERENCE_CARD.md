# 🚀 Role-Based Feature Access - Quick Reference Card

## At a Glance

```
User Role         → Assigned Features        → Accessible Modules
===============================================================
admin             → All features             → 12 modules (all)
doctor            → Clinical features       → 6 modules
nurse             → Clinical + reports      → 7 modules
receptionist      → Scheduling + billing    → 9 modules
staff             → Pharmacy + billing      → 7 modules
```

## For Developers

### Add Feature to a Role
**File**: `Backend/services/rbacService.js`

```javascript
// In defaultRoleFeatures, find the role and add to array:
doctor: [
  'dashboard',
  'patients',
  'appointments',
  'emr',
  'icd',
  'settings',
  'new_feature'  // ← Add here
]
```

### Get User Features (Backend)
```javascript
const { getEffectiveFeatures } = require('../services/rbacService');
const features = getEffectiveFeatures(user);
// Returns: ['dashboard', 'patients', ...]
```

### Get User Features (Frontend)
```javascript
const user = JSON.parse(sessionStorage.getItem('hospital_user'));
console.log(user.features);  // Array of features for this user
```

## For Administrators

### Check User's Features
1. Open browser console (F12)
2. Run: `JSON.parse(sessionStorage.getItem('hospital_user')).features`
3. See array of features user has access to

### Grant Access to New Module
1. Identify user's role
2. Update `Backend/services/rbacService.js`
3. Add feature to role's array in `defaultRoleFeatures`
4. Restart backend
5. User gets access on next login

### Verify Features Are Working
```bash
# In terminal
cd Backend
npm start

# In browser console after login
const user = JSON.parse(sessionStorage.getItem('hospital_user'));
console.log('Role:', user.role);
console.log('Features:', user.features);
```

## Files to Know

| File | Purpose | Edit For |
|------|---------|----------|
| `rbacService.js` | Feature mapping | Adding/removing features per role |
| `authController.js` | Auth endpoints | (Usually don't edit) |
| `App.tsx` | Module definitions | Adding new modules |
| `permissions.ts` | Feature aliases | (Usually don't edit) |

## Common Tasks

### Task 1: Doctor needs access to Billing
```javascript
// In defaultRoleFeatures['doctor'], add:
'billing',
'billing_view',
```

### Task 2: Create new role "lab_technician"
```javascript
// In defaultRoleFeatures, add:
lab_technician: [
  'dashboard',
  'patients',
  'lab_results',
  'settings'
]
```

### Task 3: Verify who can access what
```bash
# Login as each role and run in console:
console.table(JSON.parse(sessionStorage.getItem('hospital_user')).features);
```

## API Reference

### Login Response
```json
{
  "success": true,
  "token": "...",
  "user": {
    "id": "...",
    "role": "doctor",
    "features": ["dashboard", "patients", "appointments", "emr", "icd", "settings"],
    "permissions": ["dashboard.view", "patients.view", ...]
  }
}
```

### Decode Features
```javascript
// Each feature enables:
'dashboard'      → Dashboard module
'patients'       → Patient management module
'appointments'   → Appointments module
'emr'            → EMR/Case sheets module
'pharmacy'       → Pharmacy & inventory module
'billing'        → Billing & payments module
'icd'            → ICD management module
'reports'        → Reports & analytics module
'doctors'        → Doctor schedule management
'admin'          → Admin panel
'clinic-users'   → Clinic user management
'settings'       → Settings panel
```

## Feature Aliases (What they map to)

```
'patients'            → ['patients.view', 'patients.create', 'patients.edit', 'patients.delete']
'appointments'        → ['appointments.view', 'appointments.create', 'appointments.edit', 'appointments.cancel']
'emr'                 → ['emr.view', 'emr.create', 'emr.edit']
'pharmacy'            → ['pharmacy.view', 'pharmacy.create', 'pharmacy.edit', 'pharmacy.delete']
'billing'             → ['billing.view', 'billing.create', 'billing.edit', 'billing.refund']
'reports'             → ['reports.view', 'reports.export']
'doctor_schedule'     → ['doctors.view']
'clinic-users'        → ['users.view', 'users.create', 'users.edit', 'users.delete']
```

## Testing Commands

```bash
# Test admin login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@hospital.local","password":"Admin@123456"}'

# Test doctor login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"doctor@test.com","password":"doctor123"}'

# Verify session (replace TOKEN with actual token)
curl -X GET http://localhost:5000/api/auth/session \
  -H "Authorization: Bearer TOKEN"
```

## Browser Console Commands

```javascript
// Check current user features
JSON.parse(sessionStorage.getItem('hospital_user')).features

// Check current user permissions
JSON.parse(sessionStorage.getItem('hospital_user')).permissions

// Check current user role
JSON.parse(sessionStorage.getItem('hospital_user')).role

// Check all user data
JSON.parse(sessionStorage.getItem('hospital_user'))

// Clear and re-login
sessionStorage.clear();
// Then refresh page and login again
```

## Debugging Flowchart

```
Module shows as locked?
  ↓
  ✓ Check role is correct: JSON.parse(sessionStorage.getItem('hospital_user')).role
  ↓
  ✓ Check features array: JSON.parse(sessionStorage.getItem('hospital_user')).features
  ↓
  ✓ Is module name in features? (case-sensitive)
  ↓
  ✗ If not, update Backend/services/rbacService.js
  ↓
  ✓ Clear sessionStorage: sessionStorage.clear()
  ↓
  ✓ Re-login
  ↓
Done! Module should now be visible.
```

## Emergency Reset

```javascript
// In browser console - force clear and logout
sessionStorage.clear();
localStorage.clear();
location.reload();

// Then login again normally
```

## Performance Notes

✅ Features assigned at login (no database lookups)
✅ Features stored in sessionStorage (fast access)
✅ No external API calls needed
✅ Works offline once logged in
✅ Instant feature access on login

## Support Matrix

| Issue | Time | Solution |
|-------|------|----------|
| Wrong features shown | 5 min | Update defaultRoleFeatures, restart backend |
| Module doesn't exist | 10 min | Add module to App.tsx modules array |
| Features not loading | 2 min | Clear sessionStorage, re-login |
| Role not updating | 5 min | Check User database role field |
| Custom role needed | 15 min | Add to defaultRoleFeatures, restart |

---

**Need help?** Check `FEATURE_ACCESS_SYSTEM.md` for details or `CODE_CHANGES_REFERENCE.md` for exact code changes.
