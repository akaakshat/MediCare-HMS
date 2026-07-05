# Feature Access Control - Visual User Flow

## Admin Dashboard Flow

### Step 1: Clinic User Management View
```
┌─────────────────────────────────────────────────────────────────────┐
│ 🏥 Clinic User Management                                 [+ Create] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│ [Search] [Role: All] [Status: Active] [Export] [Import]             │
│                                                                       │
│ ┌────────┬──────────┬────────┬──────────┬────────┬───────┬─────────┐│
│ │ Name   │ Email    │ Phone  │ Role     │ Status │ Joined│ Actions ││
├────────┼──────────┼────────┼──────────┼────────┼───────┼─────────┤│
│ │ Dr.    │ doctor@  │ +91... │ Doctor   │ Active │ Jan15 │ 👁️ ✏️ 🗑││
│ │ Smith  │ clinic   │        │          │        │       │         ││
├────────┼──────────┼────────┼──────────┼────────┼───────┼─────────┤│
│ │ Nurse  │ nurse@   │ +91... │ Nurse    │ Active │ Jan14 │ 👁️ ✏️ 🗑││
│ │ Jane   │ clinic   │        │          │        │       │         ││
├────────┼──────────┼────────┼──────────┼────────┼───────┼─────────┤│
│ │ Recep  │ recep@   │ +91... │ Recept.  │ Active │ Jan12 │ 👁️ ✏️ 🗑││
│ │ Mark   │ clinic   │        │          │        │       │         ││
└────────┴──────────┴────────┴──────────┴────────┴───────┴─────────┘│
│                                                                       │
│ [Total Users: 3] [Doctors: 1] [Receptionists: 1] [Nurses: 1]        │
└─────────────────────────────────────────────────────────────────────┘
```

### Step 2: Click Eye Icon (👁️) to View Features

```
User clicks: 👁️ button next to "Dr. Smith"

Action: setSelectedUserForFeatureView(user)
Effect: UserFeatureView modal opens
```

### Step 3: Feature View Modal Opens

```
┌──────────────────────────────────────────────────────────────────────┐
│  Dr. Smith                                                          ✖ │
│  Role: Doctor                                                         │
├──────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  Granted Features                                                      │
│                                                                        │
│  ┌─────────────────────────┐  ┌─────────────────────────┐            │
│  │ ✓ Patient Records       │  │ ✓ Appointments          │            │
│  │ Access patient records  │  │ Manage appointments     │            │
│  │ and history             │  │                         │            │
│  └─────────────────────────┘  └─────────────────────────┘            │
│                                                                        │
│  ┌─────────────────────────┐  ┌─────────────────────────┐            │
│  │ ✓ Prescriptions         │  │ ✓ Lab Results           │            │
│  │ Manage prescriptions    │  │ View lab results        │            │
│  └─────────────────────────┘  └─────────────────────────┘            │
│                                                                        │
│  ┌─────────────────────────┐  ┌─────────────────────────┐            │
│  │ ✓ Billing               │  │ ✓ Patient Vitals        │            │
│  │ Manage billing/payments │  │ Record patient vitals   │            │
│  └─────────────────────────┘  └─────────────────────────┘            │
│                                                                        │
│  ┌───────────────────────────────────────────────────────┐            │
│  │ Total: 6 features granted                             │            │
│  └───────────────────────────────────────────────────────┘            │
│                                                                        │
├──────────────────────────────────────────────────────────────────────┤
│                                                           [Close]      │
└──────────────────────────────────────────────────────────────────────┘
```

### Step 4a: No Features Granted Case

```
┌──────────────────────────────────────────────────────────────────────┐
│  New User                                                           ✖ │
│  Role: Staff                                                         │
├──────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  Granted Features                                                      │
│                                                                        │
│  ⚠️  No features granted                                              │
│                                                                        │
│  This user has not been granted any features. They will see          │
│  "No access granted" message on login.                               │
│                                                                        │
├──────────────────────────────────────────────────────────────────────┤
│                                                           [Close]      │
└──────────────────────────────────────────────────────────────────────┘
```

### Step 4b: User Login Experience (No Features)

```
When user with NO features logs in:

┌──────────────────────────────────────────────────────────────────────┐
│                                                                        │
│                                                                        │
│                     ⛔ Access Not Granted                             │
│                                                                        │
│                 You don't have access to any features                │
│                                                                        │
│            This user account hasn't been granted any                 │
│            features yet. Please contact your admin to                │
│            request access.                                           │
│                                                                        │
│  Role: Staff                                                          │
│                                                                        │
│  📧 Contact Admin: admin@clinic.com                                  │
│                                                                        │
│                                                                        │
└──────────────────────────────────────────────────────────────────────┘
```

### Step 5: Close Modal

```
User clicks: [Close] button or ✖ icon

Action: onClose() called
Effect: setSelectedUserForFeatureView(null)
Result: Modal closes, state cleared, back to user list
```

---

## Component Data Flow Diagram

```
                    ┌─────────────────────────────┐
                    │ ClinicUserManagement.tsx    │
                    │                             │
                    │ State:                      │
                    │ • users[]                   │
                    │ • selectedUserForFeatureView│
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │ User clicks Eye icon        │
                    │ setSelectedUserForFeatureView
                    │ = user object               │
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │ UserFeatureView Modal       │
                    │ Props:                      │
                    │ • userId                    │
                    │ • userName                  │
                    │ • userRole                  │
                    │ • onClose callback          │
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │ useEffect() on mount        │
                    │ Fetch:                      │
                    │ GET /api/mdm/user-features/ │
                    │     {userId}                │
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │ Backend Response            │
                    │ {                           │
                    │   success: true,            │
                    │   data: [{                  │
                    │     features: [...]         │
                    │   }]                        │
                    │ }                           │
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │ Parse Response              │
                    │ • Merge features array      │
                    │ • Remove duplicates         │
                    │ • Set state                 │
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │ Render Feature Grid         │
                    │ • CheckCircle icons         │
                    │ • Feature names & descriptions
                    │ • Green styling             │
                    │ • Total count               │
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │ User clicks Close           │
                    │ onClose() callback          │
                    │ setSelectedUserForFeatureView
                    │ = null                      │
                    └──────────────┬──────────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │ Modal unmounts              │
                    │ Back to user list           │
                    └─────────────────────────────┘
```

---

## Styling Details

### Feature Card Styling (Each Feature)
```
┌─────────────────────────────────────────────────┐
│ ✓ Patient Records                               │
│ Access patient records and history              │
└─────────────────────────────────────────────────┘
  
  Background: Gradient from green-50 to emerald-50
  Border: 1px solid green-200
  Padding: 1rem
  Border-radius: 0.5rem
  Icon: CheckCircle - green-600 - 20px
  
  Title: Font-medium, gray-900
  Description: Text-sm, gray-600, margin-top 0.5rem
```

### Modal Styling
```
Fixed overlay:
  • Background: Black with 50% opacity
  • Full screen coverage (inset-0)
  • z-index: 50 (above all other content)

White card:
  • Max-width: 42rem (2xl)
  • Shadow: xl
  • Rounded corners
  • Padding: 1.5rem (6 = 24px)

Header:
  • Border-bottom: 1px solid gray-200
  • User name: 1.25rem font-bold
  • Role label: text-sm text-gray-500

Content:
  • Responsive grid: 1 col mobile, 2 cols desktop
  • Gap between cards: 0.75rem (3)
  • Padding: 1.5rem

Footer:
  • Border-top: 1px solid gray-200
  • Background: Gray-50
  • Button: Gray-600 hover:Gray-700
```

---

## Status Indicators

### User Without Access (Inactive/No Features)
```
On login form submit:
  1. Check user.status === 'active'
  2. Check user has granted features
  3. If no features → Show NoAccessPage
  4. If has features → Show dashboard
```

### In User Management Table
- Eye icon: Green text (text-green-600)
- Edit icon: Blue text (text-blue-600)  
- Delete icon: Red text (text-red-600)

Hover effects:
- Eye: bg-green-50
- Edit: bg-blue-50
- Delete: bg-red-50

---

**This visual flow is implemented and ready for testing!** ✅
