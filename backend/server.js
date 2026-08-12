/**
 * server.js — Hospital Management System API
 * Node.js + Express + MySQL 8.0
 */
const path    = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors    = require('cors');

const app = express();

// ── Middleware ────────────────────────────────────────────────
app.use(cors({ origin: '*', methods: ['GET','POST','PUT','DELETE','OPTIONS'] }));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Serve frontend static files ───────────────────────────────
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// ── API Routes ────────────────────────────────────────────────
app.use('/api/auth',        require('./routes/auth'));
app.use('/api/dashboard',   require('./routes/dashboard'));
app.use('/api/patients',    require('./routes/patients'));
app.use('/api/doctors',     require('./routes/doctors'));
app.use('/api/employees',   require('./routes/employees'));
app.use('/api/appointments',require('./routes/appointments'));
app.use('/api/billing',     require('./routes/billing'));
app.use('/api/pharmacy',    require('./routes/pharmacy'));
app.use('/api/lab',         require('./routes/laboratory'));
app.use('/api/medical',     require('./routes/medical'));
app.use('/api/reports',       require('./routes/reports'));
app.use('/api/notifications', require('./routes/notifications'));

// ── Health check ──────────────────────────────────────────────
app.get('/api/health', (_, res) =>
  res.json({ status: 'ok', time: new Date().toISOString() }));

// ── SPA fallback — serve index.html for all non-API routes ────
app.get('/{*path}', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
  } else {
    res.status(404).json({ success: false, message: 'Route not found' });
  }
});

// ── Global error handler ──────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err.code, err.message);

  // Friendly MySQL error messages
  const mysqlErrors = {
    ER_DUP_ENTRY:          'A record with this value already exists.',
    ER_NO_REFERENCED_ROW_2:'Referenced record not found. Check the ID you entered.',
    ER_ROW_IS_REFERENCED_2:'Cannot delete — this record is used by other data.',
    ER_DATA_TOO_LONG:      'One of the values you entered is too long.',
    ER_BAD_NULL_ERROR:     'A required field is missing.',
    ER_TRUNCATED_WRONG_VALUE: 'Invalid value entered in one of the fields.',
  };

  if (err.code && mysqlErrors[err.code])
    return res.status(400).json({ success: false, message: mysqlErrors[err.code] });

  res.status(500).json({ success: false, message: 'An unexpected error occurred. Please try again.' });
});

// ── Start ─────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '5000');
app.listen(PORT, () => {
  console.log(`🏥  HMS API running at http://localhost:${PORT}`);
  console.log(`📋  Frontend  :  http://localhost:${PORT}`);
  console.log(`🔑  API base  :  http://localhost:${PORT}/api`);
});

module.exports = app;
