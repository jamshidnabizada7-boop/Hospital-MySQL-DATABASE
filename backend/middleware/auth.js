/**
 * auth.js — JWT authentication + role-based authorization middleware
 */
const jwt = require('jsonwebtoken');

const ROLES = {
  ADMIN:        'Hospital_Admin',
  DOCTOR:       'Doctor',
  RECEPTIONIST: 'Receptionist',
  LAB_TECH:     'Lab_Technician',
  PHARMACIST:   'Pharmacist',
  ACCOUNTANT:   'Accountant',
};

// Verify JWT token
const authenticate = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer '))
    return res.status(401).json({ success: false, message: 'No token provided' });
  try {
    req.user = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

// Only allow specific roles
const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role))
    return res.status(403).json({ success: false, message: 'Access denied for your role' });
  next();
};

// Admin always passes; additional roles can also pass
const adminOr = (...roles) => (req, res, next) => {
  if (req.user.role === ROLES.ADMIN || roles.includes(req.user.role))
    return next();
  return res.status(403).json({ success: false, message: 'Access denied for your role' });
};

module.exports = { authenticate, authorize, adminOr, ROLES };
