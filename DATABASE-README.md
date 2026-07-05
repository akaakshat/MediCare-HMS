# Healthcare Information System - Database Setup

## Local MongoDB Setup Guide

### Prerequisites
1. **Install MongoDB** locally on your system
2. **Start MongoDB service**: Run `mongod` in a terminal
3. **Verify connection**: MongoDB should be running on `mongodb://localhost:27017`

### Database Structure

The system uses the following collections in the `his_db` database:

```
his_db/
├── users/           # Admin, doctors, nurses, receptionists
├── patients/        # Patient records with auto-generated UHIDs
├── appointments/    # Appointment scheduling
├── emrs/           # Electronic Medical Records
├── bills/          # Billing and invoices
└── pharmacyitems/  # Pharmacy inventory
```

### Quick Setup

1. **Start MongoDB** (in separate terminal):
   ```bash
   mongod
   ```

2. **Setup Database** (create collections, indexes, sample data):
   ```bash
   cd Backend
   npm run setup-db
   ```

3. **View Database Contents**:
   ```bash
   npm run view-db
   ```

4. **Start Backend Server**:
   ```bash
   npm start
   ```

5. **Start Frontend** (in another terminal):
   ```bash
   cd ../frontend
   npm run dev
   ```

### Sample Login Credentials

After setup, you can login with:

- **Admin**: `admin@hospital.local` / `Admin@123456`
- **Doctor**: `sarah.wilson@hospital.com` / `Doctor@123`
- **Doctor**: `michael.brown@hospital.com` / `Doctor@123`

### UHID Generation

Patient UHIDs are automatically generated in the format `UHID000001`, `UHID000002`, etc.
- Unique across all patients
- Auto-incrementing
- Generated before saving to database

### Viewing Data

Use **MongoDB Compass** to view your data:
1. Connect to: `mongodb://localhost:27017`
2. Select database: `his_db`
3. Browse collections to see all records

### Troubleshooting

**MongoDB Connection Issues:**
- Ensure MongoDB is running: `mongod`
- Check port 27017 is not blocked
- Verify no other MongoDB instances are running

**UHID Issues:**
- UHIDs are generated automatically when creating patients
- If UHID generation fails, check database connection
- Manual UHID assignment is not recommended

**Permission Issues:**
- Run setup scripts with proper permissions
- Ensure MongoDB has write permissions

### Database Indexes

The setup creates optimized indexes for:
- User emails (unique)
- Patient UHIDs (unique)
- Appointment IDs (unique)
- Phone numbers
- Status fields
- Date fields
- Doctor assignments

This ensures fast queries and data integrity.