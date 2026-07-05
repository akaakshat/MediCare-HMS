# Feature Access Control System

## Overview

This document explains how role-based feature access is implemented in the Hospital Management System. The system automatically assigns features and permissions to users based on their roles.

## Role-Based Feature Matrix

### Admin
- **Access Level**: Full system access
- **Modules**: 
  - dashboard, patients, appointments, doctors, emr, pharmacy, billing, icd, reports, admin, clinic-users, settings
- **Features**: All available features including audit logs and administrative functions

### Doctor
- **Modules**: 
  - dashboard, patients, appointments, emr, icd, settings
- **Features**: 
  - patient_records, patient_list, patient_view
  - appointment_view
  - emr_view, prescriptions, patient_vitals, lab_results, care_plans, case_sheets
  - icd_view
  - settings

### Nurse
- **Modules**: 
  - dashboard, patients, appointments, emr, icd, reports, settings
- **Features**: 
  - patient_records, patient_list, patient_view
  - appointment_view
  - emr_view, prescriptions, patient_vitals, lab_results, care_plans, case_sheets
  - icd_view
  - reports_view

### Receptionist
- **Modules**: 
  - dashboard, patients, appointments, doctors, pharmacy, billing, icd, reports, settings
- **Features**: 
  - patient_records, patient_list, patient_view, patient_create
  - appointment_view, appointment_create
  - doctor_schedule
  - pharmacy_view
  - billing_view
  - icd_view
  - reports_view
  - settings

### Staff
- **Modules**: 
  - dashboard, patients, appointments, pharmacy, billing, icd, reports, settings
- **Features**: 
  - patient_records, patient_list, patient_view
  - appointment_view
  - pharmacy_view, inventory, medications
  - billing_view
  - icd_view
  - reports_view
  - settings

## Architecture

### Backend Flow (Node.js/Express)

1. **Authentication Controller** (`authController.js`)
   - When a user logs in, the system retrieves their role from the database
   - Calls `getEffectivePermissions()` to get permissions based on role
   - Calls `getEffectiveFeatures()` to get features based on role
   - Returns both permissions and features in the auth response

2. **RBAC Service** (`rbacService.js`)
   - Maintains two mappings:
     - `defaultRolePermissions`: Maps roles to backend permissions
     - `defaultRoleFeatures`: Maps roles to frontend features/modules
   - Provides functions:
     - `getEffectivePermissions(user)`: Returns permissions for a user
     - `getEffectiveFeatures(user)`: Returns features for a user

3. **Permissions Config** (`permissions.js`)
   - Centralized permission catalog used by backend routes
   - Examples: `patients.view`, `appointments.create`, `emr.edit`, etc.

### Frontend Flow (React/TypeScript)

1. **Login Process** (`api.ts`)
   - ApiClient sends login credentials to backend
   - Backend returns token and user object with `permissions` and `features` arrays
   - User data is normalized using `normalizeUserAccess()` from permissions utils
   - User is stored in sessionStorage as `hospital_user`

2. **Access Control** (`App.tsx`)
   - `moduleRoleAccess`: Defines which modules each role can access
   - `moduleFeatureRequirements`: Defines which permissions are needed for each module
   - `getModuleAccessState()`: Determines if a module is visible and enabled
   - Modules are disabled if:
     - Role doesn't have access to the module, OR
     - Required permissions are missing

3. **Permission Verification** (`permissions.ts`)
   - `hasFeatureAccess()`: Checks if user has required permissions
   - `expandFeatureAccessToPermissions()`: Maps features to permissions
   - Feature aliases translate high-level features to granular permissions

## Data Flow Example

### User Login Scenario: Doctor Role

1. **User logs in** with email/password
2. **Backend authenticates** and fetches user document (role: "doctor")
3. **Backend calls** `getEffectiveFeatures(user)`:
   - Normalizes role to lowercase "doctor"
   - Returns array: `['dashboard', 'patients', 'appointments', 'emr', 'icd', 'settings', ...]`
4. **Backend sends** response with features array
5. **Frontend** receives features and stores in sessionStorage
6. **App.tsx** reads features and checks access for each module:
   - ✅ Patients module: Visible + Enabled (doctor has "patients" feature)
   - ✅ EMR module: Visible + Enabled (doctor has "emr" feature)
   - ❌ Billing module: Not visible (doctor doesn't have "billing" feature)
   - ❌ Pharmacy module: Not visible (doctor doesn't have "pharmacy" feature)

## Permission/Feature Aliases

The system automatically translates features to permissions:

```
Feature: 'patients' → Permissions: ['patients.view', 'patients.create', 'patients.edit', 'patients.delete']
Feature: 'emr' → Permissions: ['emr.view', 'emr.create', 'emr.edit']
Feature: 'billing' → Permissions: ['billing.view', 'billing.create', 'billing.edit', 'billing.refund']
Feature: 'pharmacy' → Permissions: ['pharmacy.view', 'pharmacy.create', 'pharmacy.edit', 'pharmacy.delete']
```

## Testing Feature Access

### 1. Test Login with Different Roles

```bash
# Login as Doctor
POST /auth/login
{
  "email": "doctor@example.com",
  "password": "password"
}

# Response will include:
{
  "success": true,
  "token": "...",
  "user": {
    "id": "...",
    "role": "doctor",
    "permissions": ["dashboard.view", "patients.view", ...],
    "features": ["dashboard", "patients", "appointments", "emr", ...]
  }
}
```

### 2. Check Session Endpoint

```bash
GET /auth/session
Authorization: Bearer {token}

# Returns current user with permissions and features
```

### 3. Test Frontend Module Access

- After login, open browser console
- Run: `ApiClient.getCurrentUser()`
- Check `features` array to verify user has expected features

## Adding New Features

### To add a new feature to a role:

1. **Backend** (`rbacService.js`):
   - Add feature to `defaultRoleFeatures[role]` array
   - Example: Add 'new_module' to doctor features

2. **Frontend** (`App.tsx`):
   - Add module to `moduleRoleAccess` if needed
   - Add module config to `modules` array
   - The feature access control will automatically restrict it

3. **Optional** (`permissions.ts`):
   - Add feature alias mapping if this feature maps to permissions

## Troubleshooting

### Issue: Module appears locked even with correct role

**Solution**: Check that:
1. Backend returns feature in `features` array
2. Frontend receives feature in sessionStorage (`hospital_user`)
3. Module exists in `modules` array with correct ID
4. Feature requirement is satisfied in `moduleFeatureRequirements`

### Issue: User sees modules they shouldn't

**Solution**: 
1. Verify role is correctly set in User database
2. Check that role is in `defaultRoleFeatures`
3. Clear sessionStorage and re-login

### Debug Commands (Browser Console)

```javascript
// Check current user's features
const user = JSON.parse(sessionStorage.getItem('hospital_user'));
console.log('Features:', user.features);
console.log('Permissions:', user.permissions);

// Check which modules are enabled
const modules = ['patients', 'appointments', 'doctors', 'emr', 'pharmacy', 'billing', 'icd', 'reports', 'clinic-users'];
modules.forEach(m => console.log(m, user.features.includes(m)));
```

## Configuration Files

- **Backend RBAC**: `/Backend/services/rbacService.js`
  - `defaultRolePermissions`: Backend permission mappings
  - `defaultRoleFeatures`: Frontend feature mappings

- **Backend Permissions**: `/Backend/config/permissions.js`
  - Centralized permission catalog

- **Frontend Permissions**: `/frontend/src/utils/permissions.ts`
  - `featureAccessAliases`: Feature to permission mappings
  - `hasFeatureAccess()`: Permission checker function

- **Frontend App**: `/frontend/src/App.tsx`
  - `moduleRoleAccess`: Role to module mappings
  - `moduleFeatureRequirements`: Module to permission requirements
  - `getModuleAccessState()`: Access determination logic

## Summary

The feature access system works in two layers:

1. **Backend**: Manages authentication, permissions, and issues tokens
2. **Frontend**: Manages UI visibility based on features received from backend

When a user logs in:
- Backend determines their role → features → permissions
- Frontend receives features → determines module visibility → prevents access to locked modules

This approach ensures:
- ✅ Centralized role management
- ✅ Consistent access control across frontend and backend
- ✅ Easy to audit who has access to what
- ✅ Simple to add new roles or modify permissions
