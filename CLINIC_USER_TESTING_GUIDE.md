# Testing Guide - Clinic User Management System

## 🧪 Pre-Testing Checklist

- [ ] Backend running on port 5000
- [ ] Frontend running on port 5173
- [ ] MongoDB connection active
- [ ] Browser console ready (F12)
- [ ] Admin account accessible

## 📋 Test Scenarios

### Test 1: Admin Login & Navigation

**Steps:**
1. Open browser: `http://localhost:5173`
2. Login with:
   - Email: `admin@hospital.com`
   - Password: `admin123`
3. Look for "Clinic Users" in sidebar
4. Click "Clinic Users"

**Expected Result:**
✓ User list page loads
✓ "Add New User" button visible
✓ Empty table if no users exist
✓ Filter options available

**Actual Result:** _________________

---

### Test 2: Create Doctor User

**Preconditions:**
- Logged in as admin
- On Clinic Users page
- Department data exists in MasterData

**Steps:**
1. Click "Add New User"
2. Fill common fields:
   - Full Name: `Dr. Arun Sharma`
   - Email: `arun@hospital.com`
   - Phone: `9988776655`
   - Gender: Male
   - DOB: `1980-06-15`
   - Address: `123 Medical Tower, Mumbai`
   - Username: `dr_arun`
   - Password: `DocPass@2024` (note: has uppercase, lowercase, number, special)
   - Role: **Doctor**
   - Status: Active

3. Doctor fields appear
4. Fill doctor fields:
   - Specialization: Cardiology
   - Qualification: MBBS, MD Cardiology
   - Experience: 15
   - License Number: MED1234567
   - License Expiry: 2028-12-31
   - Registration Number: REG9876543
   - Consultation Fees: 500
   - Department: Select from dropdown
   - Available Days: Check Mon-Fri
   - Time Slots:
     - Day: Monday
     - Start: 09:00
     - End: 12:00
     - Duration: 30
   - Bio: Experienced cardiologist

5. Click "Create User"

**Expected Result:**
✓ Success toast appears
✓ Form clears
✓ Returns to user list
✓ New doctor appears in table
✓ Doctor count incremented in stats

**Actual Result:** _________________

---

### Test 3: Create Receptionist User

**Steps:**
1. Click "Add New User"
2. Fill common fields:
   - Full Name: `Priya Patel`
   - Email: `priya@hospital.com`
   - Phone: `9988665544`
   - Gender: Female
   - DOB: `1995-03-20`
   - Address: `456 Office Complex, Mumbai`
   - Username: `priya_reception`
   - Password: `RecepPass@123`
   - Role: **Receptionist**
   - Status: Active

3. Receptionist fields appear
4. Fill receptionist fields:
   - Shift Start Time: 08:00
   - Shift End Time: 17:00
   - Work Experience: 5
   - Department: Leave empty (optional)

5. Click "Create User"

**Expected Result:**
✓ Success toast appears
✓ New receptionist in table
✓ Receptionist count incremented

**Actual Result:** _________________

---

### Test 4: Create Nurse User

**Steps:**
1. Click "Add New User"
2. Fill common fields:
   - Full Name: `Sneha Desai`
   - Email: `sneha@hospital.com`
   - Phone: `9877665533`
   - Gender: Female
   - DOB: `1992-08-10`
   - Address: `789 Hospital Quarters, Mumbai`
   - Username: `sneha_nurse`
   - Password: `NursePass@24`
   - Role: **Nurse**
   - Status: Active

3. Nurse fields appear
4. Fill nurse fields:
   - Qualification: BSc Nursing
   - Registration Number: NUR1234567
   - Experience: 7
   - Specialization: ICU
   - Shift Start Time: 07:00
   - Shift End Time: 15:00

5. Click "Create User"

**Expected Result:**
✓ Nurse created successfully
✓ Nurse count incremented
✓ All 3 roles now visible in list

**Actual Result:** _________________

---

### Test 5: Password Validation

**Test 5a: Weak Password**
1. Try password: `password` (lowercase only)
2. Check: Password strength indicator
3. "Create User" button disabled
4. Error message shows requirements

**Expected Result:**
✗ Button disabled
✓ Requirements shown (uppercase, number, special)

**Actual Result:** _________________

**Test 5b: Strong Password**
1. Enter: `Hospital@2024`
2. Check: Strength indicator turns green
3. All requirements met
4. "Create User" button enabled

**Expected Result:**
✓ Button enabled
✓ All checkmarks visible

**Actual Result:** _________________

---

### Test 6: Validation Errors

**Test 6a: Missing Email**
1. Leave email field empty
2. Try to submit
3. Check error message

**Expected Result:**
✓ Error: "Email is required"
✗ Form not submitted

**Actual Result:** _________________

**Test 6b: Invalid Email**
1. Enter: `invalidemail`
2. Try to submit

**Expected Result:**
✓ Error: "Invalid email format"

**Actual Result:** _________________

**Test 6c: Invalid Phone**
1. Enter: `12345` (too short)
2. Try to submit

**Expected Result:**
✓ Error: "Invalid phone number"

**Actual Result:** _________________

**Test 6d: Under 18 Years**
1. Set DOB to: `2010-01-01` (14 years old)
2. Try to submit

**Expected Result:**
✓ Error about minimum age

**Actual Result:** _________________

---

### Test 7: Search Functionality

**Test 7a: Search by Name**
1. In search box, type: `arun`
2. Observe table
3. Only Doctor "Dr. Arun Sharma" shown

**Expected Result:**
✓ Results filtered in real-time
✓ Only matching users shown

**Actual Result:** _________________

**Test 7b: Search by Email**
1. Search: `priya@hospital.com`
2. Only Receptionist "Priya Patel" shown

**Expected Result:**
✓ Email search works
✓ Exact match found

**Actual Result:** _________________

**Test 7c: Search by Phone**
1. Search: `9988776655`
2. Doctor "Dr. Arun Sharma" found

**Expected Result:**
✓ Phone search works
✓ Correct user found

**Actual Result:** _________________

---

### Test 8: Filter by Role

**Test 8a: Filter for Doctors**
1. Click Role dropdown
2. Select: Doctor
3. Click "Apply Filters"

**Expected Result:**
✓ Only doctors shown
✓ Count matches

**Actual Result:** _________________

**Test 8b: Filter for Receptionists**
1. Role dropdown: Receptionist
2. Click "Apply Filters"

**Expected Result:**
✓ Only receptionists shown

**Actual Result:** _________________

**Test 8c: All Roles**
1. Role dropdown: "All Roles"
2. Click "Apply Filters"

**Expected Result:**
✓ All 3 users shown
✓ Different roles visible

**Actual Result:** _________________

---

### Test 9: Filter by Status

**Test 9a: Active Users**
1. Status dropdown: Active
2. Click "Apply Filters"

**Expected Result:**
✓ All active users shown
✓ Count matches

**Actual Result:** _________________

---

### Test 10: Statistics Display

**Steps:**
1. Scroll to bottom
2. View stat cards

**Expected Result:**
✓ Total Users: 3
✓ Doctors: 1
✓ Receptionists: 1
✓ Nurses: 1

**Actual Result:** _________________

---

### Test 11: Delete User

**Steps:**
1. Find receptionist "Priya Patel"
2. Click trash icon
3. Confirm deletion

**Expected Result:**
✓ Confirmation dialog appears
✓ On confirm, success toast shown
✓ User removed from table
✓ Receptionist count decremented (now 0)
✓ Total count decremented (now 2)

**Actual Result:** _________________

---

### Test 12: Role Badges

**Steps:**
1. Look at user table
2. Check role column badges

**Expected Result:**
✓ Doctor badge: Purple
✓ Receptionist badge: Green
✓ Nurse badge: Pink
✓ Admin badge: Red

**Actual Result:** _________________

---

### Test 13: Status Badges

**Steps:**
1. Look at status column

**Expected Result:**
✓ Active: Green badge
✓ Inactive: Gray badge

**Actual Result:** _________________

---

### Test 14: Edit User (Partial)

**Note:** Edit UI shows "Coming Soon"

**Steps:**
1. Click edit icon on any user
2. Toast message shows

**Expected Result:**
✓ Edit feature message shown
✓ No page change

**Actual Result:** _________________

---

### Test 15: Time Slot Management (Doctor Form)

**Steps:**
1. Click "Add New User"
2. Select role: Doctor
3. Fill common fields
4. In Doctor section, click "+ Add Slot"
5. Multiple slots should appear with fields for:
   - Day (dropdown)
   - Start Time
   - End Time
   - Duration

**Expected Result:**
✓ New slot row added
✓ All fields present
✓ Can add multiple slots

**Actual Result:** _________________

---

### Test 16: Available Days Selection (Doctor)

**Steps:**
1. In Doctor form, see "Available Days"
2. Select: Mon, Wed, Fri
3. Deselect: Other days

**Expected Result:**
✓ Checkboxes work
✓ Selected days highlighted
✓ Values captured for submission

**Actual Result:** _________________

---

### Test 17: License Expiry Validation

**Steps:**
1. Enter License Expiry: `2020-01-01` (past date)
2. Try to submit

**Expected Result:**
✓ Error: "License expiry date must be in the future"

**Actual Result:** _________________

---

### Test 18: Duplicate Email Check

**Steps:**
1. Try to create user with:
   - Email: `arun@hospital.com` (already used)
2. Submit form

**Expected Result:**
✓ Error: "User with this email already exists"

**Actual Result:** _________________

---

### Test 19: Duplicate License Number

**Steps:**
1. Create doctor with License: MED1234567
2. Try to create another doctor with same license

**Expected Result:**
✓ Error on submit
✓ License uniqueness enforced

**Actual Result:** _________________

---

### Test 20: Doctor Stats Display

**Steps:**
1. Create 3 more doctors (if not already)
2. Check statistics

**Expected Result:**
✓ Doctor count: 4
✓ Total Users: increased accordingly

**Actual Result:** _________________

---

## 📊 Test Summary

| Test # | Test Name | Status | Notes |
|--------|-----------|--------|-------|
| 1 | Login & Navigation | __ | |
| 2 | Create Doctor | __ | |
| 3 | Create Receptionist | __ | |
| 4 | Create Nurse | __ | |
| 5a | Password - Weak | __ | |
| 5b | Password - Strong | __ | |
| 6a | Validation - Empty Email | __ | |
| 6b | Validation - Invalid Email | __ | |
| 6c | Validation - Invalid Phone | __ | |
| 6d | Validation - Age Check | __ | |
| 7a | Search - Name | __ | |
| 7b | Search - Email | __ | |
| 7c | Search - Phone | __ | |
| 8a | Filter - Doctors | __ | |
| 8b | Filter - Receptionists | __ | |
| 8c | Filter - All | __ | |
| 9a | Filter - Active | __ | |
| 10 | Statistics | __ | |
| 11 | Delete User | __ | |
| 12 | Role Badges | __ | |
| 13 | Status Badges | __ | |
| 14 | Edit User | __ | |
| 15 | Time Slots | __ | |
| 16 | Available Days | __ | |
| 17 | License Expiry | __ | |
| 18 | Duplicate Email | __ | |
| 19 | Duplicate License | __ | |
| 20 | Doctor Stats | __ | |

---

## 🔍 Browser Console Checks

While testing, monitor console for:

1. ✓ No JavaScript errors
2. ✓ API calls successful (200 status)
3. ✓ No network errors
4. ✓ No validation errors logged
5. ✓ Proper error handling shown

Check console with: **F12 → Console Tab**

---

## 🎯 Success Criteria

- [ ] All 20 tests pass
- [ ] No JavaScript errors
- [ ] All validations work
- [ ] UI responsive on mobile
- [ ] Data persists after refresh
- [ ] RBAC working correctly
- [ ] Statistics accurate

---

## 📝 Notes

_Use this space for additional observations:_

```
[Your notes here]
```

---

**Test Date**: _______________
**Tester Name**: _______________
**Overall Status**: _______________
