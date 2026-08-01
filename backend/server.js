/**
 * server.js — Hospital Management System API
 * Node.js + Express + MySQL 8.0
 */
require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');

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
app.use('/api/appointments',require('./routes/appointments'));
app.use('/api/billing',     require('./routes/billing'));
app.use('/api/pharmacy',    require('./routes/pharmacy'));
app.use('/api/lab',         require('./routes/laboratory'));
app.use('/api/medical',     require('./routes/medical'));
app.use('/api/reports',     require('./routes/reports'));

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
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// ── Start ─────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '5000');
app.listen(PORT, () => {
  console.log(`🏥  HMS API running at http://localhost:${PORT}`);
  console.log(`📋  Frontend  :  http://localhost:${PORT}`);
  console.log(`🔑  API base  :  http://localhost:${PORT}/api`);
});

module.exports = app;
