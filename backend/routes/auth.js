/**
 * routes/auth.js — Login / me / logout
 */
const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const db      = require('../db');
const { authenticate, ROLES } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ success: false, message: 'Username and password required' });

  try {
    const [rows] = await db.query(`
      SELECT u.User_ID, u.Username, u.Password_Hash, u.Full_Name, u.Email, u.Is_Active,
             r.Role_Name
      FROM App_User u JOIN Role r ON u.Role_ID = r.Role_ID
      WHERE u.Username = ?`, [username]);

    if (!rows.length)
      return res.status(401).json({ success: false, message: 'Invalid username or password' });

    const user = rows[0];
    if (!user.Is_Active)
      return res.status(403).json({ success: false, message: 'Account is disabled' });

    // Real bcrypt hash = exactly 60 chars starting with $2b$ or $2a$
    const isRealHash = (user.Password_Hash.startsWith('$2b$') || user.Password_Hash.startsWith('$2a$'))
                       && user.Password_Hash.length === 60;
    let valid = false;
    if (isRealHash) {
      valid = await bcrypt.compare(password, user.Password_Hash);
    } else {
      // Demo mode: sample data placeholder hashes — accept any non-empty password
      valid = password.length > 0;
    }

    if (!valid)
      return res.status(401).json({ success: false, message: 'Invalid username or password' });

    // For Doctor role, get their Doctor_ID
    let doctorId = null;
    if (user.Role_Name === ROLES.DOCTOR) {
      const [dr] = await db.query('SELECT Doctor_ID FROM Doctor WHERE User_ID=?', [user.User_ID]);
      if (dr.length) doctorId = dr[0].Doctor_ID;
    }

    // For Accountant/Receptionist/Lab/Pharmacist get their Employee_ID
    let employeeId = null;
    if ([ROLES.ACCOUNTANT, ROLES.RECEPTIONIST, ROLES.LAB_TECH, ROLES.PHARMACIST].includes(user.Role_Name)) {
      const [emp] = await db.query('SELECT Emp_ID FROM Employee WHERE User_ID=?', [user.User_ID]);
      if (emp.length) employeeId = emp[0].Emp_ID;
    }

    // Update last login
    await db.query('UPDATE App_User SET Last_Login=NOW() WHERE User_ID=?', [user.User_ID]);

    const payload = {
      id:         user.User_ID,
      username:   user.Username,
      role:       user.Role_Name,
      name:       user.Full_Name,
      doctorId,
      employeeId,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });

    res.json({
      success: true,
      token,
      user: {
        id:         user.User_ID,
        username:   user.Username,
        name:       user.Full_Name,
        role:       user.Role_Name,
        email:      user.Email,
        doctorId,
        employeeId,
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT u.User_ID, u.Username, u.Full_Name, u.Email, u.Phone, u.Last_Login, r.Role_Name
      FROM App_User u JOIN Role r ON u.Role_ID=r.Role_ID WHERE u.User_ID=?`, [req.user.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user: { ...rows[0], doctorId: req.user.doctorId, employeeId: req.user.employeeId } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
