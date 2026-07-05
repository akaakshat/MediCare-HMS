# Clinic Users Form - Feature Management Guide

## Overview
The clinic users form has been enhanced to support flexible, role-based feature access where every feature is displayed as an individual checkbox for granular control.

## Key Features

### 1. **Individual Checkboxes for All Features**
Every feature in the system is now displayed as an individual checkbox, allowing admins to:
- Select or deselect any feature independently
- Have complete control over user access
- Mix and match features across roles without restrictions

### 2. **Organized by Category**
Features are automatically grouped into logical categories:
- **Patient Management** - Patient records, list, create, modify, delete
- **Appointments** - Appointment scheduling and management
- **Electronic Medical Records** - EMR access and management
- **Doctor Management** - Doctor profiles and scheduling
- **Pharmacy & Inventory** - Medications and stock management
- **Billing & Payments** - Financial transactions
- **Clinical Data** - Vitals, lab results, care plans
- **Reports & Analytics** - System reports and insights
- **User Management** - Staff and account administration
- **System & Administration** - Settings and audit logs

### 3. **Collapsible Categories**
- Click on any category header to expand/collapse
- See a count of features in each category
- Progress indicator shows how many features are selected per category
- Faster scrolling through large feature lists

### 4. **Role-Based Recommendations**
Smart recommendations for each role:

#### Doctor Role Recommended Features:
- Patients (records, list)
- Appointments (view, manage)
- EMR (view, create, update)
- Prescriptions
- Case Sheets
- Patient Vitals
- Lab Results
- Care Plans
- ICD Codes
- Dashboard

#### Receptionist Role Recommended Features:
- Patients (list, create)
- Appointments (create, modify, view, cancel)
- Doctor Scheduling
- Doctor Management
- Billing (view)
- Dashboard

#### Nurse Role Recommended Features:
- Patients (records)
- Patient Vitals
- Appointments (view)
- EMR (view)
- Prescriptions
- Case Sheets
- Lab Results
- Care Plans
- Dashboard

#### Staff Role Recommended Features:
- Patients (list)
- Appointments (view)
- Billing (view)
- Pharmacy (view)
- Dashboard

#### Admin Role:
- All features automatically granted

### 5. **Quick Apply Recommendations**
- Click "Apply [Role] Recommendations" button to quickly set optimal features for that role
- Can then customize by adding/removing individual features
- Saves time for admin users

### 6. **Feature Selection Tracking**
- Real-time counter shows selected features
- Color-coded feedback (orange = no features, green = features selected)
- Clear warning if no features are selected
- "Clear All" button to reset selections

### 7. **View Mode**
When viewing an existing user's features:
- Features are grouped by category
- Shows only granted features
- Read-only display
- Total count of granted features

## How to Use

### Creating a New Clinic User

1. **Fill Basic Information**
   - Full name, email, phone, gender, address
   - Username and password
   - Select role (Doctor, Receptionist, Nurse, Staff)

2. **Enter Role-Specific Fields**
   - Doctor: Specialization, qualification, experience, license info
   - Receptionist: Shift timing, work experience
   - Nurse: Qualification, registration, certifications
   - Staff: Job title, department, employment type

3. **Assign Features**
   - Click on category to expand it
   - Option 1: Click "Apply [Role] Recommendations" to auto-select optimal features
   - Option 2: Manually select individual features by clicking checkboxes
   - Option 3: Combination - apply recommendations, then add/remove features as needed

4. **Review and Submit**
   - Verify total features selected
   - Click "Create User" to save

### Important Notes

⚠️ **No Default Features** - Features must be explicitly selected. If no features are selected, the user will see "No access granted" message on login.

✅ **Flexible Assignment** - Users can have features from different role categories. For example:
- A receptionist might need all "Appointments" features plus "Billing" features
- A nurse might need both "EMR" and "Patient Vitals" features

🔧 **Easy Customization** - Role recommendations are just starting points. Customize as needed for your clinic's workflow.

## Feature Hierarchy

Features are organized both by role recommendations AND by functional category:

```
Patient Management
├── patients (parent)
├── patient_records
├── patient_list
├── patient_create
├── patient_modify
└── patient_delete

Appointments
├── appointments (parent)
├── appointment_create
├── appointment_modify
├── appointment_view
└── appointment_cancel

Electronic Medical Records
├── emr (parent)
├── emr_view
├── emr_create
├── emr_update
└── emr_delete

[... and more categories]
```

## API Information

The form submits to:
```
POST /api/clinic-users
```

With payload structure:
```json
{
  "commonFields": {
    "fullName": "string",
    "email": "string",
    "phone": "string",
    "gender": "string",
    "address": "string",
    "role": "doctor|receptionist|nurse|staff",
    "username": "string",
    "password": "string",
    "status": "active|inactive"
  },
  "roleSpecificFields": { ... },
  "selectedFeatures": ["feature1_id", "feature2_id", ...]
}
```

## Best Practices

1. **Start with Recommendations** - Use role recommendations as a baseline
2. **Principle of Least Privilege** - Only grant features users actually need
3. **Regular Reviews** - Periodically review user features and remove unnecessary access
4. **Document Changes** - Audit logs track all feature grants and changes
5. **Test Thoroughly** - Verify users can access only their assigned features

## Troubleshooting

**User sees "No access granted" message**
- User has no features selected
- Solution: Edit user and select at least one feature

**User can't access a feature they should**
- Feature is not selected for the user
- Solution: Edit user and select the required feature

**Too many features to manage**
- Use category collapse feature to focus on relevant categories
- Use role recommendations to group similar features
- Consider creating feature groups/roles for future versions
