# Quick Reference: Feature Assignments by Role

## Doctor Role
**Recommended Features Count:** ~16 features

### Core Features:
✓ Patient Records & List - View patient information
✓ Appointments (View Only) - Check schedule
✓ EMR (View, Create, Update) - Medical records
✓ Prescriptions - Write prescriptions
✓ Case Sheets - Document patient cases
✓ Patient Vitals - Monitor vitals
✓ Lab Results - Review test results
✓ Care Plans - Create care plans
✓ ICD Codes - Access medical coding
✓ Dashboard - Overview

### Optional Features (customize based on needs):
○ Patient Create/Modify - If doctor manages own patients
○ Billing View - To see patient billing status
○ EMR Delete - Only if senior doctor with delete rights

**Typical Setup:** 
Click "Apply Doctor Recommendations" → Add/remove as needed

---

## Receptionist Role
**Recommended Features Count:** ~12 features

### Core Features:
✓ Patient List & Create - Manage patient registration
✓ Appointments (Create, Modify, View, Cancel) - Full appointment control
✓ Doctor Scheduling - Check doctor availability
✓ Doctor Management - View doctor profiles
✓ Billing View - See patient billing
✓ Dashboard - Overview

### Optional Features (customize based on needs):
○ Patient Records - If they need more patient details
○ Patient Modify - If they update existing patient info
○ Payments - To process patient payments

**Typical Setup:** 
Click "Apply Receptionist Recommendations" → Add payments if processing payments

---

## Nurse Role
**Recommended Features Count:** ~13 features

### Core Features:
✓ Patient Records & Vitals - Monitor patient health
✓ Appointments (View) - Check patient schedule
✓ EMR (View) - Read medical records
✓ Prescriptions - Follow prescriptions
✓ Case Sheets - Document patient care
✓ Lab Results - Review test results
✓ Care Plans - Access treatment plans
✓ Dashboard - Overview

### Optional Features (customize based on needs):
○ EMR Create/Update - If authorized to document
○ Patient List - For general patient overview

**Typical Setup:** 
Click "Apply Nurse Recommendations" → Add EMR Create/Update if they document

---

## Staff Role
**Recommended Features Count:** ~6-7 features

### Core Features:
✓ Patient List - View patients
✓ Appointments (View) - Check schedules
✓ Billing View - See payments
✓ Pharmacy View - Check medications
✓ Dashboard - Overview

### Optional Features (customize based on needs):
○ Patient Records - If they need detailed info
○ EMR View - If supporting clinical staff

**Typical Setup:** 
Click "Apply Staff Recommendations" → Minimize features to reduce clutter

---

## Admin Role
**Recommended Features Count:** All features (~45+)

### Automatic:
✓ ALL features are automatically granted

### Configuration:
Usually no need to customize - admins get full access

**Typical Setup:** 
Admin automatically has all features, no configuration needed

---

## Common Custom Scenarios

### Receptionist + Billing Coordinator
- Base: Receptionist features
- Add: Billing Create, Billing Modify, Payments
- Total: ~15 features

### Nurse + Case Manager
- Base: Nurse features
- Add: Case Sheets Create/Modify, Care Plans Create
- Remove: Limited to view if not authorized for all EMR updates
- Total: ~15 features

### Staff + Junior Receptionist Training
- Base: Staff features
- Add: Patient Create (with supervisor review)
- Add: Appointment Create (supervised)
- Total: ~9 features

### Pharmacist
- Base: Staff features
- Add: Pharmacy (full access - view, create, update, delete)
- Add: Inventory (full access)
- Add: Medications
- Remove: Irrelevant clinical features
- Total: ~10 features

---

## Feature Count Guideline

| Role | Min Features | Recommended | Max Features | Notes |
|------|-------------|------------|--------------|-------|
| Doctor | 8 | 16 | 35 | Focus on clinical features |
| Receptionist | 6 | 12 | 20 | Focus on scheduling & patients |
| Nurse | 8 | 13 | 25 | Focus on patient care & vitals |
| Staff | 4 | 7 | 15 | Keep minimal for less access |
| Admin | 45+ | 45+ | 45+ | All features always |

---

## How to Apply

1. **Select Role** in the clinic user form
2. **Click Category Headers** to see available features
3. **One-Click Option:** Click "Apply [Role] Recommendations" to auto-select optimal features
4. **Manual Option:** Click individual checkboxes for custom selection
5. **Verify:** See the counter showing "Selected: X features"
6. **Save:** Click "Create User"

---

## Important Reminders

⚠️ **No Default Features** - Every feature must be explicitly selected

🔄 **Easy to Update** - Edit user anytime to add/remove features

✅ **Flexible Design** - Mix and match features for custom roles

🛡️ **Audit Trail** - All feature changes are logged

📊 **Progress Tracking** - Category badges show selection progress
