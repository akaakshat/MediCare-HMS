# MDM API Testing Guide

## Postman Collection Instructions

Use the examples below in Postman or curl to test MDM endpoints.

### Prerequisites
1. Backend server running: `npm start`
2. Admin user created with valid JWT token
3. Initialize master data: `npm run init-mdm`

## Environment Variables (Postman)

Set these in your Postman environment:
```json
{
  "base_url": "http://localhost:5000",
  "api_path": "/api/masters",
  "admin_token": "<your_admin_jwt_token>",
  "gender_id": "<gender_master_id>" // Save from response
}
```

## Test Cases

### 1. View Master Data (No Auth Required)

#### 1.1 Get All Genders (Authenticated User)
```http
GET {{base_url}}{{api_path}}/gender
Authorization: Bearer {{admin_token}}
```

Expected Response (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "type": "gender",
      "name": "Male",
      "code": "M",
      "description": "Male gender",
      "isActive": true,
      "displayOrder": 0,
      "createdAt": "2025-04-05T10:00:00Z",
      "updatedAt": "2025-04-05T10:00:00Z"
    }
  ],
  "total": 3,
  "page": 1,
  "limit": 100,
  "pages": 1,
  "fromCache": true
}
```

#### 1.2 Get Gender with Pagination
```http
GET {{base_url}}{{api_path}}/gender?page=1&limit=10&activeOnly=true
Authorization: Bearer {{admin_token}}
```

#### 1.3 Search Master Data
```http
GET {{base_url}}{{api_path}}/gender?search=male
Authorization: Bearer {{admin_token}}
```

#### 1.4 Get Specific Gender by ID
```http
GET {{base_url}}{{api_path}}/gender/{{gender_id}}
Authorization: Bearer {{admin_token}}
```

Expected Response (200 OK):
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "type": "gender",
    "name": "Male",
    "code": "M",
    "description": "Male gender",
    "isActive": true
  }
}
```

### 2. Create Master Data (Admin Only)

#### 2.1 Create New Gender
```http
POST {{base_url}}{{api_path}}/gender
Authorization: Bearer {{admin_token}}
Content-Type: application/json

{
  "name": "Non-Binary",
  "code": "NB",
  "description": "Non-binary gender",
  "displayOrder": 1,
  "metadata": {
    "abbreviation": "NB"
  }
}
```

Expected Response (201 Created):
```json
{
  "success": true,
  "message": "Master data created successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439012",
    "type": "gender",
    "name": "Non-Binary",
    "code": "NB",
    "description": "Non-binary gender",
    "isActive": true,
    "displayOrder": 1,
    "metadata": {
      "abbreviation": "NB"
    },
    "createdAt": "2025-04-05T10:30:00Z",
    "updatedAt": "2025-04-05T10:30:00Z"
  }
}
```

#### 2.2 Create with Metadata
```http
POST {{base_url}}{{api_path}}/department
Authorization: Bearer {{admin_token}}
Content-Type: application/json

{
  "name": "Cardiology",
  "code": "CARD",
  "description": "Heart and cardiovascular system",
  "metadata": {
    "staffCount": 10,
    "equipment": ["ECG", "Ultrasound", "Stress Test"],
    "operatingHours": "08:00-18:00"
  }
}
```

### 3. Update Master Data (Admin Only)

#### 3.1 Update Gender
```http
PUT {{base_url}}{{api_path}}/gender/{{gender_id}}
Authorization: Bearer {{admin_token}}
Content-Type: application/json

{
  "description": "Updated description",
  "displayOrder": 2
}
```

Expected Response (200 OK):
```json
{
  "success": true,
  "message": "Master data updated successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "type": "gender",
    "name": "Male",
    "code": "M",
    "description": "Updated description",
    "displayOrder": 2,
    "updatedAt": "2025-04-05T11:00:00Z"
  }
}
```

### 4. Delete Master Data (Admin Only - Soft Delete)

#### 4.1 Delete Gender
```http
DELETE {{base_url}}{{api_path}}/gender/{{gender_id}}
Authorization: Bearer {{admin_token}}
```

Expected Response (200 OK):
```json
{
  "success": true,
  "message": "Master data deleted successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "type": "gender",
    "name": "Male",
    "code": "M",
    "isActive": false,
    "deletedAt": "2025-04-05T11:30:00Z"
  }
}
```

### 5. Excel Operations (Admin Only)

#### 5.1 Get Import Template
```http
GET {{base_url}}{{api_path}}/template/gender
Authorization: Bearer {{admin_token}}
```

Expected Response:
```json
{
  "success": true,
  "message": "Template generated successfully",
  "data": {
    "filename": "gender_template.xlsx",
    "downloadUrl": "/exports/gender_template.xlsx"
  }
}
```

#### 5.2 Upload Excel File (Bulk Import)
```http
POST {{base_url}}{{api_path}}/upload/gender
Authorization: Bearer {{admin_token}}
Content-Type: multipart/form-data

file: <select_file>
```

Expected Response (200 OK):
```json
{
  "success": true,
  "message": "Excel import completed",
  "summary": {
    "totalRows": 10,
    "validRows": 9,
    "invalidRows": 1,
    "inserted": 5,
    "updated": 4,
    "errors": 1
  },
  "data": {
    "inserted": [
      {
        "_id": "...",
        "type": "gender",
        "name": "Gender 1",
        "code": "G1",
        "isActive": true
      }
    ],
    "updated": [...],
    "errors": [
      {
        "rowNumber": 5,
        "data": { "name": "", "code": "INVALID" },
        "errors": ["Missing required field: name"]
      }
    ]
  }
}
```

#### 5.3 Export to Excel
```http
GET {{base_url}}{{api_path}}/export/gender?activeOnly=true
Authorization: Bearer {{admin_token}}
```

Expected Response:
```json
{
  "success": true,
  "message": "Master data exported successfully",
  "data": {
    "filename": "gender_export_2025-04-05.xlsx",
    "recordCount": 3,
    "downloadUrl": "/exports/gender_export_2025-04-05.xlsx"
  }
}
```

### 6. Role-Permission Management

#### 6.1 Get All Role-Permissions
```http
GET {{base_url}}{{api_path}}/role-permissions
Authorization: Bearer {{admin_token}}
```

Expected Response:
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "roleId": {
        "_id": "...",
        "name": "Admin",
        "code": "ADMIN"
      },
      "permissionId": {
        "_id": "...",
        "name": "Manage Users",
        "code": "MANAGE_USERS"
      },
      "isActive": true
    }
  ]
}
```

#### 6.2 Get Permissions for Specific Role
```http
GET {{base_url}}{{api_path}}/role-permissions?roleId={{role_id}}
Authorization: Bearer {{admin_token}}
```

#### 6.3 Create Role-Permission Mapping
```http
POST {{base_url}}{{api_path}}/role-permissions
Authorization: Bearer {{admin_token}}
Content-Type: application/json

{
  "roleId": "507f1f77bcf86cd799439011",
  "permissionId": "507f1f77bcf86cd799439012"
}
```

Expected Response (201 Created):
```json
{
  "success": true,
  "message": "Role-permission mapping created successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439013",
    "roleId": "507f1f77bcf86cd799439011",
    "permissionId": "507f1f77bcf86cd799439012",
    "isActive": true
  }
}
```

#### 6.4 Delete Role-Permission Mapping
```http
DELETE {{base_url}}{{api_path}}/role-permissions/{{mapping_id}}
Authorization: Bearer {{admin_token}}
```

### 7. Cache Management (Admin Only)

#### 7.1 Get Cache Statistics
```http
GET {{base_url}}{{api_path}}/cache/stats
Authorization: Bearer {{admin_token}}
```

Expected Response:
```json
{
  "success": true,
  "data": {
    "size": 5,
    "keys": [
      "mdm:gender:active",
      "mdm:blood_group:active",
      "mdm:department:active",
      "mdm:role:active",
      "mdm:permission:active"
    ],
    "memoryUsage": 250
  }
}
```

#### 7.2 Clear Specific Cache
```http
POST {{base_url}}{{api_path}}/cache/clear
Authorization: Bearer {{admin_token}}
Content-Type: application/json

{
  "type": "gender"
}
```

Expected Response:
```json
{
  "success": true,
  "message": "Cache cleared for type: gender"
}
```

#### 7.3 Clear All Cache
```http
POST {{base_url}}{{api_path}}/cache/clear
Authorization: Bearer {{admin_token}}
Content-Type: application/json

{}
```

## Error Test Cases

### Test 1: Unauthorized (No Token)
```http
GET {{base_url}}{{api_path}}/gender

Response: 401 Unauthorized
{
  "message": "No token provided"
}
```

### Test 2: Forbidden (Non-Admin User)
```http
POST {{base_url}}{{api_path}}/gender
Authorization: Bearer {{user_token}}
Content-Type: application/json

{
  "name": "Test",
  "code": "TEST"
}

Response: 403 Forbidden
{
  "message": "Forbidden: Only administrators can modify master data"
}
```

### Test 3: Invalid Master Type
```http
GET {{base_url}}{{api_path}}/invalid_type
Authorization: Bearer {{admin_token}}

Response: 400 Bad Request
{
  "message": "Invalid master type: invalid_type",
  "validTypes": [...]
}
```

### Test 4: Duplicate Code
```http
POST {{base_url}}{{api_path}}/gender
Authorization: Bearer {{admin_token}}
Content-Type: application/json

{
  "name": "New Male",
  "code": "M"  // Already exists
}

Response: 409 Conflict
{
  "message": "Code 'M' already exists for this type"
}
```

### Test 5: Invalid File Upload
```http
POST {{base_url}}{{api_path}}/upload/gender
Authorization: Bearer {{admin_token}}
Content-Type: multipart/form-data

file: <image_file.png>  // Invalid format

Response: 400 Bad Request
{
  "message": "Only Excel and CSV files are allowed"
}
```

### Test 6: File Too Large
```http
POST {{base_url}}{{api_path}}/upload/gender
Authorization: Bearer {{admin_token}}
Content-Type: multipart/form-data

file: <large_file.xlsx>  // > 10 MB

Response: 400 Bad Request
{
  "message": "File size exceeds 10 MB limit"
}
```

### Test 7: Missing Required Fields
```http
POST {{base_url}}{{api_path}}/gender
Authorization: Bearer {{admin_token}}
Content-Type: application/json

{
  "name": "Male"
  // Missing "code"
}

Response: 400 Bad Request
{
  "message": "Missing required fields: name, code"
}
```

### Test 8: Not Found
```http
GET {{base_url}}{{api_path}}/gender/invalid_id
Authorization: Bearer {{admin_token}}

Response: 404 Not Found
{
  "message": "Master data not found"
}
```

## Performance Testing

### Test Load with Multiple Requests
```bash
#!/bin/bash
# Load test script

for i in {1..100}; do
  curl -X GET http://localhost:5000/api/masters/gender \
    -H "Authorization: Bearer $ADMIN_TOKEN" &
done

wait
echo "All requests completed"
```

### Monitor Cache Effectiveness
```bash
# Before cache (first request)
curl -X GET http://localhost:5000/api/masters/gender \
  -H "Authorization: Bearer $ADMIN_TOKEN"
# Note: "fromCache": false

# After cache (subsequent requests)
curl -X GET http://localhost:5000/api/masters/gender \
  -H "Authorization: Bearer $ADMIN_TOKEN"
# Note: "fromCache": true (faster response)
```

## Excel File Sample

Create a file named `genders.xlsx` with this content:

| name   | code | description  |
|--------|------|--------------|
| Male   | M    | Male gender  |
| Female | F    | Female gender|
| Other  | O    | Other gender |

Then upload:
```bash
curl -X POST http://localhost:5000/api/masters/upload/gender \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -F "file=@genders.xlsx"
```

## Curl Test Script

```bash
#!/bin/bash

# Set your variables
BASE_URL="http://localhost:5000"
API_PATH="/api/masters"
ADMIN_TOKEN="your_token_here"

echo "1. Get all genders"
curl -X GET "$BASE_URL$API_PATH/gender" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

echo "\n2. Create new gender"
curl -X POST "$BASE_URL$API_PATH/gender" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","code":"TEST"}'

echo "\n3. Get cache stats"
curl -X GET "$BASE_URL$API_PATH/cache/stats" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

echo "\nTests completed!"
```

---

For more details, refer to MDM_README.md
