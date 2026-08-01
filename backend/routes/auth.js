/**
 * routes/auth.js — Login / me / logout
 */
const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const db      = require('../db');
const { authenticate } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ success: false, message: 'Username and password required' });

  try {
    const [rows] = await db.query(
      `SELECT u.User_ID, u.Username, u.Password_Hash, u.Full_Name, u.Email, u.Is_Active,
              r.Role_Name
       FROM App_User u JOIN Role r ON u.Role_ID = r.Role_ID
       WHERE u.Username = ?`, [username]
    );
    if (!rows.length)
      return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const user = rows[0];
    if (!user.Is_Active)
      return res.status(403).json({ success: false, message: 'Account disabled' });

    // Accept plain-text passwords for sample data
    // Real bcrypt hashes are exactly 60 chars; sample data uses short fake hashes
    let valid = false;
    const isRealHash = (user.Password_Hash.startsWith('$2b$') || user.Password_Hash.startsWith('$2a$'))
                       && user.Password_Hash.length === 60;
    if (isRealHash) {
      valid = await bcrypt.compare(password, user.Password_Hash);
    } else {
      // Demo mode: placeholder hashes — accept any non-empty password
      valid = password.length > 0;
    }

    if (!valid)
      return res.status(401).json({ success: false, message: 'Invalid credentials' });

    // Update last login
    await db.query('UPDATE App_User SET Last_Login = NOW() WHERE User_ID = ?', [user.User_ID]);

    const token = jwt.sign(
      { id: user.User_ID, username: user.Username, role: user.Role_Name, name: user.Full_Name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({
      success: true,
      token,
      user: { id: user.User_ID, username: user.Username, name: user.Full_Name, role: user.Role_Name, email: user.Email }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT u.User_ID, u.Username, u.Full_Name, u.Email, u.Phone, u.Last_Login, r.Role_Name
       FROM App_User u JOIN Role r ON u.Role_ID = r.Role_ID WHERE u.User_ID = ?`,
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
