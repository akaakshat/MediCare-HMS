# Clinic User Management API Reference

## 🔐 Authentication

All endpoints require a valid JWT token in the `Authorization` header:

```
Authorization: Bearer <your_jwt_token>
```

Get token by logging in through the frontend or using the `/api/auth/login` endpoint.

---

## 📋 Endpoints

### 1. Create Clinic User

**Endpoint:** `POST /api/clinic-users`

**Auth:** Required (Admin only)

**Description:** Create a new clinic user with role-specific profile

**Request Body:**
```json
{
  "commonFields": {
    "fullName": "Dr. John Doe",
    "email": "john@hospital.com",
    "phone": "9876543210",
    "gender": "Male",
    "dateOfBirth": "1985-05-15",
    "address": "123 Hospital Complex, City",
    "role": "doctor",
    "username": "dr_john",
    "password": "SecurePass@123",
    "status": "active"
  },
  "roleSpecificFields": {
    "specialization": "Cardiology",
    "qualification": "MBBS, MD",
    "experience": 10,
    "licenseNumber": "MED1234567",
    "licenseExpiry": "2028-12-31",
    "registrationNumber": "REG9876543",
    "consultationFees": 500,
    "department": "507f1f77bcf86cd799439011",
    "availableDays": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    "timeSlots": [
      {
        "day": "Monday",
        "startTime": "09:00",
        "endTime": "12:00",
        "slotDuration": 30
      }
    ]
  }
}
```

**Receptionist Variant:**
```json
{
  "commonFields": { /* same as above */ },
  "roleSpecificFields": {
    "shiftTiming": {
      "startTime": "08:00",
      "endTime": "17:00",
      "daysOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
    },
    "workExperience": 5,
    "department": "507f1f77bcf86cd799439012",
    "assignedToDoctor": "507f1f77bcf86cd799439013",
    "skills": ["Reception", "Billing"]
  }
}
```

**Nurse Variant:**
```json
{
  "commonFields": { /* same as above */ },
  "roleSpecificFields": {
    "qualification": "BSc Nursing",
    "registrationNumber": "NUR1234567",
    "experience": 7,
    "specialization": "ICU",
    "shiftTiming": {
      "startTime": "07:00",
      "endTime": "15:00",
      "daysOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
    },
    "certifications": ["Basic Life Support"]
  }
}
```

**Success Response (200):**
```json
{
  "message": "Clinic user created successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439014",
    "name": "Dr. John Doe",
    "email": "john@hospital.com",
    "role": "doctor",
    "status": "active",
    "createdAt": "2024-04-15T10:30:00Z"
  }
}
```

**Error Responses:**
- `400` - Validation error
- `401` - Unauthorized
- `403` - Not admin
- `409` - Email/phone/license already exists

---

### 2. Get All Clinic Users

**Endpoint:** `GET /api/clinic-users`

**Auth:** Required (Authenticated user)

**Description:** Retrieve all clinic users with optional filters

**Query Parameters:**
- `role` - Filter by role (doctor, receptionist, nurse, admin)
- `status` - Filter by status (active, inactive)
- `page` - Page number (default: 1)
- `limit` - Results per page (default: 10)

**Examples:**
```
GET /api/clinic-users
GET /api/clinic-users?role=doctor
GET /api/clinic-users?status=active
GET /api/clinic-users?role=doctor&status=active
GET /api/clinic-users?page=2&limit=20
```

**Success Response (200):**
```json
{
  "message": "Users fetched successfully",
  "data": [
    {
      "_id": "507f1f77bcf86cd799439014",
      "name": "Dr. John Doe",
      "email": "john@hospital.com",
      "phone": "9876543210",
      "role": "doctor",
      "status": "active",
      "profile": {
        "specialization": "Cardiology",
        "consultationFees": 500
      },
      "createdAt": "2024-04-15T10:30:00Z"
    }
  ],
  "total": 15,
  "page": 1,
  "limit": 10
}
```

---

### 3. Get Specific User

**Endpoint:** `GET /api/clinic-users/:userId`

**Auth:** Required

**Description:** Get details of a specific user including role profile

**URL Parameters:**
- `userId` - MongoDB ObjectId of user

**Example:**
```
GET /api/clinic-users/507f1f77bcf86cd799439014
```

**Success Response (200):**
```json
{
  "message": "User fetched successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439014",
    "name": "Dr. John Doe",
    "email": "john@hospital.com",
    "phone": "9876543210",
    "gender": "Male",
    "dateOfBirth": "1985-05-15",
    "address": "123 Hospital Complex, City",
    "role": "doctor",
    "username": "dr_john",
    "status": "active",
    "profile": {
      "_id": "507f1f77bcf86cd799439015",
      "specialization": "Cardiology",
      "qualification": "MBBS, MD",
      "experience": 10,
      "licenseNumber": "MED1234567",
      "consultationFees": 500,
      "timeSlots": [
        {
          "day": "Monday",
          "startTime": "09:00",
          "endTime": "12:00",
          "slotDuration": 30
        }
      ]
    },
    "createdAt": "2024-04-15T10:30:00Z",
    "updatedAt": "2024-04-15T10:30:00Z"
  }
}
```

**Error Response:**
- `404` - User not found

---

### 4. Get Users by Role

**Endpoint:** `GET /api/clinic-users/role/:role`

**Auth:** Required

**Description:** Get all users of a specific role

**URL Parameters:**
- `role` - doctor, receptionist, nurse, or admin

**Examples:**
```
GET /api/clinic-users/role/doctor
GET /api/clinic-users/role/receptionist
GET /api/clinic-users/role/nurse
```

**Success Response (200):**
```json
{
  "message": "Users by role fetched successfully",
  "data": [
    {
      "_id": "507f1f77bcf86cd799439014",
      "name": "Dr. John Doe",
      "email": "john@hospital.com",
      "role": "doctor",
      "profile": {
        "specialization": "Cardiology",
        "consultationFees": 500
      }
    }
  ],
  "total": 5
}
```

---

### 5. Update Clinic User

**Endpoint:** `PUT /api/clinic-users/:userId`

**Auth:** Required (Admin only)

**Description:** Update user details (common or role-specific fields)

**URL Parameters:**
- `userId` - MongoDB ObjectId of user

**Request Body:**
```json
{
  "commonFields": {
    "fullName": "Dr. John Doe Updated",
    "phone": "9876543211",
    "address": "New Address",
    "status": "inactive"
  },
  "roleSpecificFields": {
    "consultationFees": 600,
    "experience": 11
  }
}
```

**Success Response (200):**
```json
{
  "message": "User updated successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439014",
    "name": "Dr. John Doe Updated",
    "email": "john@hospital.com",
    "phone": "9876543211",
    "status": "inactive",
    "updatedAt": "2024-04-16T10:30:00Z"
  }
}
```

**Error Responses:**
- `400` - Validation error
- `403` - Not admin
- `404` - User not found

---

### 6. Delete Clinic User (Soft Delete)

**Endpoint:** `DELETE /api/clinic-users/:userId`

**Auth:** Required (Admin only)

**Description:** Soft delete a user (mark as inactive, don't remove)

**URL Parameters:**
- `userId` - MongoDB ObjectId of user

**Example:**
```
DELETE /api/clinic-users/507f1f77bcf86cd799439014
```

**Success Response (200):**
```json
{
  "message": "User deleted successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439014",
    "status": "inactive",
    "deletedAt": "2024-04-16T10:30:00Z",
    "deletedBy": "507f1f77bcf86cd799439001"
  }
}
```

**Error Responses:**
- `403` - Not admin
- `404` - User not found

---

## 🔍 Common Request/Response Patterns

### Validation Errors

**Response (400):**
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format"
    },
    {
      "field": "phone",
      "message": "Phone must be 10 digits"
    }
  ]
}
```

### Authentication Error

**Response (401):**
```json
{
  "error": "Unauthorized",
  "message": "No token provided"
}
```

### Authorization Error

**Response (403):**
```json
{
  "error": "Forbidden",
  "message": "Only administrators can create clinic users"
}
```

### Not Found Error

**Response (404):**
```json
{
  "error": "Not found",
  "message": "User with ID 507f1f77bcf86cd799439014 not found"
}
```

### Conflict Error (Duplicate)

**Response (409):**
```json
{
  "error": "Conflict",
  "message": "User with email john@hospital.com already exists"
}
```

---

## ⚙️ Field Specifications

### Common Fields (All Users)

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| fullName | String | Yes | Min 3 chars, Max 100 chars |
| email | String | Yes | Valid email, Unique |
| phone | String | Yes | 10-digit, Unique |
| gender | String | Yes | Male, Female, Other |
| dateOfBirth | Date | Yes | Must be 18+ years |
| address | String | Yes | Min 5 chars |
| role | String | Yes | doctor, receptionist, nurse, admin |
| username | String | Yes | 3+ chars, Unique |
| password | String | Yes | 8+ chars, must include uppercase, lowercase, number, special char |
| status | String | Yes | active, inactive |

### Doctor-Specific Fields

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| specialization | String | Yes | From predefined list |
| qualification | String | Yes | Min 3 chars |
| experience | Number | Yes | >= 0, <= 60 |
| licenseNumber | String | Yes | Unique, alphanumeric |
| licenseExpiry | Date | Yes | Must be future date |
| registrationNumber | String | Yes | Unique, alphanumeric |
| consultationFees | Number | Yes | > 0 |
| department | ObjectId | Yes | Valid MasterData ID |
| availableDays | Array | Yes | Min 1 day, Max 7 days |
| timeSlots | Array | Yes | Min 1 slot |
| bio | String | No | Max 500 chars |

### Receptionist-Specific Fields

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| shiftTiming.startTime | String | Yes | HH:MM format |
| shiftTiming.endTime | String | Yes | HH:MM format, > startTime |
| shiftTiming.daysOfWeek | Array | Yes | Min 1 day |
| workExperience | Number | Yes | >= 0 |
| department | ObjectId | No | Valid MasterData ID |
| assignedToDoctor | ObjectId | No | Valid User ID (doctor role) |
| skills | Array | No | Array of strings |

### Nurse-Specific Fields

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| qualification | String | Yes | GNM, BSc Nursing, MSc Nursing, Diploma Nursing, ANM |
| registrationNumber | String | Yes | Unique, alphanumeric |
| experience | Number | Yes | >= 0 |
| specialization | String | No | General, ICU, Operation Theatre, Emergency |
| shiftTiming.startTime | String | Yes | HH:MM format |
| shiftTiming.endTime | String | Yes | HH:MM format, > startTime |
| shiftTiming.daysOfWeek | Array | Yes | Min 1 day |
| certifications | Array | No | Array of certification names |

---

## 🎯 Usage Examples

### cURL Examples

**Create Doctor:**
```bash
curl -X POST http://localhost:5000/api/clinic-users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_token_here" \
  -d '{
    "commonFields": {
      "fullName": "Dr. John Doe",
      "email": "john@hospital.com",
      "phone": "9876543210",
      "gender": "Male",
      "dateOfBirth": "1985-05-15",
      "address": "123 Hospital Complex",
      "role": "doctor",
      "username": "dr_john",
      "password": "SecurePass@123",
      "status": "active"
    },
    "roleSpecificFields": {
      "specialization": "Cardiology",
      "qualification": "MBBS, MD",
      "experience": 10,
      "licenseNumber": "MED1234567",
      "licenseExpiry": "2028-12-31",
      "registrationNumber": "REG9876543",
      "consultationFees": 500,
      "department": "507f1f77bcf86cd799439011",
      "availableDays": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      "timeSlots": [{"day": "Monday", "startTime": "09:00", "endTime": "12:00", "slotDuration": 30}]
    }
  }'
```

**Get All Doctors:**
```bash
curl -X GET http://localhost:5000/api/clinic-users/role/doctor \
  -H "Authorization: Bearer your_token_here"
```

**Update User:**
```bash
curl -X PUT http://localhost:5000/api/clinic-users/507f1f77bcf86cd799439014 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_token_here" \
  -d '{
    "commonFields": {
      "phone": "9876543211",
      "status": "inactive"
    }
  }'
```

**Delete User:**
```bash
curl -X DELETE http://localhost:5000/api/clinic-users/507f1f77bcf86cd799439014 \
  -H "Authorization: Bearer your_token_here"
```

---

## 📊 Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (no token) |
| 403 | Forbidden (not admin) |
| 404 | Not Found |
| 409 | Conflict (duplicate data) |
| 500 | Server Error |

---

## 🔒 Authorization

- **Public Endpoints:** None (all require authentication)
- **Admin-Only Endpoints:** CREATE, UPDATE, DELETE
- **Authenticated Endpoints:** GET operations

---

## 💾 Data Persistence

All data is stored in MongoDB:
- `users` collection - User records
- `doctor_profiles` collection - Doctor-specific data
- `receptionist_profiles` collection - Receptionist-specific data
- `nurse_profiles` collection - Nurse-specific data

---

## 📞 API Support

For API issues:
1. Check endpoint URL and HTTP method
2. Verify token in Authorization header
3. Validate request body format
4. Review error response message
5. Check server logs for details

---

**API Version:** 1.0  
**Last Updated:** April 2024  
**Status:** Production Ready ✓
