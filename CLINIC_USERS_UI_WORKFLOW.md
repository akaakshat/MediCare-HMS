# Clinic Users Form - UI Layout & Workflow

## Form Layout Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                  ADD NEW CLINIC USER                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│ SECTION 1: BASIC INFORMATION                                    │
│ ├─ Full Name              │ Email                               │
│ ├─ Gender                 │ Phone                               │
│ ├─ Address               │ Status (Active/Inactive)            │
│ └─ Username              │ Password                             │
│                                                                   │
│ SECTION 2: ROLE SELECTION                                       │
│ ├─ Role: [Doctor ▼]      (Dynamically updates next section)    │
│                                                                   │
│ SECTION 3: ROLE-SPECIFIC FIELDS                                 │
│ ├─ (Changes based on role selection)                           │
│ │  Doctor:    Specialization, License, Qualifications         │
│ │  Receptionist: Shift Timing, Department                      │
│ │  Nurse:      Qualifications, Certifications                 │
│ │  Staff:      Job Title, Department, Employment Type          │
│                                                                   │
│ SECTION 4: ROLE-BASED FEATURE ACCESS                            │
│ ├─ 💡 Apply Doctor Recommendations [Button]                    │
│ │                                                                │
│ ├─ Patient Management                    [6/6 selected]  ▼      │
│ │  ├─ ☑ Patient Management                                     │
│ │  ├─ ☑ Patient Records                                        │
│ │  ├─ ☑ Patient List                                           │
│ │  ├─ ☑ Create Patients                                        │
│ │  ├─ ☑ Modify Patients                                        │
│ │  └─ ☑ Delete Patients                                        │
│ │                                                                │
│ ├─ Appointments                          [5/5 selected]  ▼      │
│ │  ├─ ☑ Appointment Management                                 │
│ │  ├─ ☑ Create Appointments                                    │
│ │  ├─ ☑ Modify Appointments                                    │
│ │  ├─ ☑ View Appointments                                      │
│ │  └─ ☑ Cancel Appointments                                    │
│ │                                                                │
│ ├─ Electronic Medical Records            [4/5 selected]  ▼      │
│ │  ├─ ☑ EMR Management                                         │
│ │  ├─ ☑ View EMR                                               │
│ │  ├─ ☑ Create EMR                                             │
│ │  ├─ ☑ Update EMR                                             │
│ │  └─ ☐ Delete EMR                                             │
│ │                                                                │
│ ├─ Doctor Management                    [2/3 selected]  ▼      │
│ │  ├─ ☑ Doctor Management                                      │
│ │  ├─ ☑ Doctor Scheduling                                      │
│ │  └─ ☐ Doctor Administration                                  │
│ │                                                                │
│ └─ [More categories collapsed...]                               │
│                                                                   │
│ Status: Selected 17 features ✅                                 │
│ ├─ Clear All [Button]                                          │
│                                                                   │
├─────────────────────────────────────────────────────────────────┤
│ [Cancel]  [Create User]                                         │
└─────────────────────────────────────────────────────────────────┘
```

## Interactive Workflow

### Step 1: Initial Form Load
```
┌─ Default Role: "Doctor"
├─ Feature Section: "Select a role first" (warning if no role)
└─ All fields visible/ready
```

### Step 2: Role Selection Changes
```
┌─ User changes role to "Receptionist"
├─ Role-specific fields update
├─ Previous feature selections clear
└─ New role recommendations available
```

### Step 3: Apply Recommendations
```
┌─ User clicks "Apply Receptionist Recommendations"
├─ System checks ROLE_FEATURE_RECOMMENDATIONS['receptionist']
├─ Auto-selects 12 optimal features
├─ Categories auto-expand to show selected features
└─ Counter shows "12 features selected"
```

### Step 4: Customize Features
```
┌─ User can:
├─ Add individual features (click checkbox)
├─ Remove individual features (uncheck)
├─ Expand/collapse categories
├─ See real-time counter update
└─ See progress per category (X/Y selected)
```

### Step 5: Review & Submit
```
┌─ Total features displayed
├─ Warning if 0 features selected
├─ Confirmation of user role
└─ Submit form to API
```

## Category Interaction Model

### Default State (All Collapsed)
```
✓ Patient Management              [6/6]  →
✓ Appointments                    [5/5]  →
✓ Electronic Medical Records      [4/5]  →
✓ Doctor Management               [2/3]  →
✓ Pharmacy & Inventory            [0/5]  →
✓ Billing & Payments              [0/5]  →
  ... more categories
```

### Expanded Category
```
✓ Patient Management              [6/6]  ↓
  ├─ ☑ Patient Management
  ├─ ☑ Patient Records
  ├─ ☑ Patient List
  ├─ ☑ Create Patients
  ├─ ☑ Modify Patients
  └─ ☑ Delete Patients
✓ Appointments                    [5/5]  →
```

### Mixed Selection (Some Unchecked)
```
✓ Electronic Medical Records      [4/5]  ↓
  ├─ ☑ EMR Management
  ├─ ☑ View EMR
  ├─ ☑ Create EMR
  ├─ ☑ Update EMR
  └─ ☐ Delete EMR  ← Unchecked (user doesn't need delete)
```

## Feature Selection States

### Feature Not Selected
```
┌─────────────────────────────────────┐
│ ☐ Patient Management                │
│ Access patient records, create...   │
└─────────────────────────────────────┘
(White background, gray border, hover effect)
```

### Feature Selected
```
┌─────────────────────────────────────┐
│ ☑ Patient Management            ✓  │
│ Access patient records, create...   │
└─────────────────────────────────────┘
(Blue background, blue border, checkmark)
```

## Selection Counter Progress

### No Features Selected
```
┌─────────────────────────────────────┐
│ Selected: 0 features                │
│ ⚠️ User will have NO access        │
│                                     │
│ [Clear All]                         │
└─────────────────────────────────────┘
(Orange background = warning state)
```

### Some Features Selected
```
┌─────────────────────────────────────┐
│ Selected: 17 features               │
│                                     │
│                          [Clear All] │
└─────────────────────────────────────┘
(Green background = healthy state)
```

## Role-Specific Recommendations Button

```
📋 ROLE-BASED FEATURE ACCESS

💡 Apply Doctor Recommendations
   (Click to auto-select optimal features for Doctor role)

[Click button]
   ↓
All Doctor recommended features are checked:
- patients, patient_records, patient_list
- appointments, appointment_view
- emr, emr_view, emr_create, emr_update
- prescriptions, case_sheets, patient_vitals
- lab_results, care_plans, icd_codes, dashboard

User can then:
- Add more features (checkbox ☐→☑)
- Remove unnecessary features (checkbox ☑→☐)
- Result: 16 features for a Doctor role
```

## Mobile/Responsive View

### Desktop (2-column grid)
```
[Feature Checkbox 1]  [Feature Checkbox 2]
[Feature Checkbox 3]  [Feature Checkbox 4]
```

### Tablet (2-column with wrap)
```
[Feature Checkbox 1]  [Feature Checkbox 2]
[Feature Checkbox 3]  [Feature Checkbox 4]
[Feature Checkbox 5]
```

### Mobile (1-column stack)
```
[Feature Checkbox 1]
[Feature Checkbox 2]
[Feature Checkbox 3]
[Feature Checkbox 4]
```

## API Flow

```
┌─────────────────────────┐
│ User Fills Form         │
│ & Selects Features      │
└────────────┬────────────┘
             │
             ↓
┌─────────────────────────┐
│ Form Validates          │
│ - Password strength     │
│ - Email format          │
│ - Required fields       │
└────────────┬────────────┘
             │
             ↓
┌─────────────────────────┐
│ POST /clinic-users      │
│ {                       │
│  commonFields,          │
│  roleSpecificFields,    │
│  selectedFeatures: []   │
│ }                       │
└────────────┬────────────┘
             │
             ↓
┌─────────────────────────┐
│ Backend Creates:        │
│ - User record           │
│ - Role profile          │
│ - Feature access grants │
│ - Audit log entry       │
└────────────┬────────────┘
             │
             ↓
┌─────────────────────────┐
│ Response:               │
│ - User ID               │
│ - Role Profile data     │
│ - Success message       │
└────────────┬────────────┘
             │
             ↓
┌─────────────────────────┐
│ Form Resets             │
│ User Created Success!   │
└─────────────────────────┘
```

## Feature Access Model

### No Features Granted (Danger State)
```
User Login
   ↓
Fetch Features for User
   ↓
Find: [] (empty array)
   ↓
Show: "No access granted"
   ↓
Redirect to limited dashboard
```

### Features Granted (Normal State)
```
User Login
   ↓
Fetch Features for User
   ↓
Find: ['patients', 'appointments', 'emr', ...]
   ↓
Show: Dashboard with accessible modules
   ↓
User can access only granted features
```

## Category Performance

| Category | Features | Typical Selected | %Used |
|----------|----------|-----------------|-------|
| Patient Mgmt | 6 | 4-6 | 67-100% |
| Appointments | 5 | 3-5 | 60-100% |
| EMR | 5 | 2-5 | 40-100% |
| Doctor Mgmt | 3 | 1-3 | 33-100% |
| Pharmacy | 5 | 0-5 | 0-100% |
| Billing | 5 | 0-5 | 0-100% |
| Clinical Data | 4 | 1-4 | 25-100% |
| Other | 12 | 0-5 | 0-42% |

## Usage Tips

1. **Quick Setup:** Use "Apply [Role] Recommendations" button
2. **Fine-Tuning:** Uncheck unnecessary features
3. **Custom Roles:** Mix features from different categories
4. **Minimal Access:** Uncheck all under "Reports", "Settings", "Audit Logs" for basic users
5. **Full Access:** Check all features or use Admin role
