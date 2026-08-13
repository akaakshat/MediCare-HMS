const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { connectDB } = require('./config/db');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const clinicUserRoutes = require('./routes/clinicUsers');
const auditLogRoutes = require('./routes/auditLogs');
const patientRoutes = require('./routes/patients');
const appointmentRoutes = require('./routes/appointments');
const doctorsRoutes = require('./routes/doctors');
const billingRoutes = require('./routes/billing');
const emrRoutes = require('./routes/emr');
const alertsRoutes = require('./routes/alerts');
const pharmacyRoutes = require('./routes/pharmacy');
const inventoryRoutes = require('./routes/inventory');
const icdRoutes = require('./routes/icd');
const analyticsRoutes = require('./routes/analytics');
const roleRoutes = require('./routes/roles');
const rbacRoutes = require('./routes/rbac');
const mdmRoutes = require('./routes/mdm');
const supportArticleRoutes = require('./routes/supportArticles');
const supportAssistantRoutes = require('./routes/supportAssistant');
const { scheduleInactivePatientJob, markInactivePatients } = require('./jobs/inactivePatientJob');
const { importIcdCodes } = require('./scripts/import-icd10');
const { importMedicineFormulas } = require('./scripts/import-medicine-formulas');

const app = express();
const PORT = process.env.PORT || 5000;
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:4173'
].filter(Boolean);

// Security hardening
app.use(helmet());

// Ensure CORS headers are always sent (including error responses like 429)
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

// Rate limiting for API requests (can be customized via env vars)
// Note: In development (NODE_ENV !== 'production') we disable rate limiting to avoid
// hitting 429 when tooling (Vite/HMR) or dashboard polling generates lots of requests.
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX || '200', 10);
const DISABLE_RATE_LIMIT =
  process.env.DISABLE_RATE_LIMIT === 'true' ||
  process.env.NODE_ENV !== 'production';

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    // Ensure CORS headers are always present when rate limiting triggers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Authorization'
    );
    res.status(options.statusCode).send(options.message);
  },
});

if (DISABLE_RATE_LIMIT) {
  console.log('Rate limiting disabled (development mode or DISABLE_RATE_LIMIT=true)');
} else {
  console.log(`Rate limiting enabled (max ${RATE_LIMIT_MAX} requests per 15min)`);
  app.use('/api/', apiLimiter);
}

app.use(express.json());

// Simple request logger to help debug incoming requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/clinic-users', clinicUserRoutes); // Clinic User Management
app.use('/api/audit-logs', auditLogRoutes); // Audit Logs
app.use('/api/patients', patientRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/doctors', doctorsRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/emr', emrRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/pharmacy', pharmacyRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/icd', icdRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/roles', roleRoutes); // Role Management routes
app.use('/api/rbac', rbacRoutes); // RBAC routes
app.use('/api/mdm', mdmRoutes); // Feature access and MDM endpoints
app.use('/api/masters', mdmRoutes); // Backward-compatible alias for existing UI/docs
app.use('/api/support-articles', supportArticleRoutes); // IT support knowledge base
app.use('/api/support-assistant', supportAssistantRoutes); // AI-assisted system support

// Health check
app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date() }));

// Expose generated export/template files
app.use('/exports', express.static(path.join(__dirname, 'uploads', 'exports')));

// 404 handler - return JSON instead of HTML
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Not Found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Server error' });
});

connectDB().then(async () => {
  app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    try {
      await markInactivePatients();
    } catch (err) {
      console.error('Initial inactive patient marking failed:', err);
    }
    scheduleInactivePatientJob();
  });

  importIcdCodes(path.join(__dirname, 'section111_valid_icd10_october2025.csv'), {
    connect: false,
    skipIfExists: true,
  })
    .then((summary) => {
      console.log(`ICD seed import completed: inserted=${summary.inserted}, updated=${summary.updated}, skipped=${summary.skipped}`);
    })
    .catch((err) => {
      console.error('ICD seed import failed:', err);
    });

  importMedicineFormulas([
    path.join(__dirname, '..', 'WHO-MVP-EMP-IAU-2019.06-eng.csv'),
    path.join(__dirname, '..', 'essentialmedicineslist2013_2.csv'),
  ], {
    connect: false,
    skipIfExists: false,
  })
    .then((summary) => {
      console.log(`Medicine formulas seed completed: inserted=${summary.inserted}, updated=${summary.updated}, skipped=${summary.skipped}`);
    })
    .catch((err) => {
      console.error('Medicine formulas seed failed:', err);
    });
}).catch((err) => {
  console.error('Failed to connect to DB and start server:', err);
  process.exit(1);
});
