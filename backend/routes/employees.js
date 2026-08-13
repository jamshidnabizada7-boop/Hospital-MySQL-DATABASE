/**
 * routes/employees.js — Non-doctor and general hospital staff management API
 * Restricted to Hospital_Admin role.
 */
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const db     = require('../db');
const { authenticate, adminOr, ROLES } = require('../middleware/auth');

/**
 * Helper: Maps job_title string to standard ROLES constant name
 */
const mapJobTitleToRoleName = (jobTitle) => {
  const normalized = (jobTitle || '').trim().toLowerCase().replace(/[\s_-]+/g, '');
  if (normalized.includes('admin')) return ROLES.ADMIN;
  if (normalized.includes('reception')) return ROLES.RECEPTIONIST;
  if (normalized.includes('lab') || normalized.includes('tech')) return ROLES.LAB_TECH;
  if (normalized.includes('pharm')) return ROLES.PHARMACIST;
  if (normalized.includes('account') || normalized.includes('finance')) return ROLES.ACCOUNTANT;
  if (normalized.includes('doc') || normalized.includes('physician')) return ROLES.DOCTOR;
  return ROLES.RECEPTIONIST; // Default fallback
};

// Enforce authentication and Admin authorization on all employee routes
router.use(authenticate, adminOr());

/**
 * GET /api/employees/meta/departments
 * Metadata endpoint for active departments list
 */
router.get('/meta/departments', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT Dept_ID, Dept_Name FROM Department WHERE Is_Active = 1 ORDER BY Dept_Name');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/employees/meta/roles
 * Metadata endpoint for system roles list
 */
router.get('/meta/roles', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT Role_ID, Role_Name, Description FROM Role WHERE Is_Active = 1 ORDER BY Role_Name');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/employees
 * Search, filter, and paginate employees list joined with Department, App_User, and Role
 */
router.get('/', async (req, res) => {
  const { search = '', role = '', dept_id, page = 1, limit = 20 } = req.query;
  const pageNum  = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.max(1, parseInt(limit) || 20);
  const offset   = (pageNum - 1) * limitNum;

  const whereConditions = ['e.Is_Active = 1'];
  const params = [];

  if (search && search.trim() !== '') {
    const like = `%${search.trim()}%`;
    whereConditions.push('(e.First_Name LIKE ? OR e.Last_Name LIKE ? OR CONCAT(e.First_Name, " ", e.Last_Name) LIKE ? OR e.Email LIKE ? OR e.Job_Title LIKE ? OR e.Phone LIKE ? OR u.Username LIKE ?)');
    params.push(like, like, like, like, like, like, like);
  }

  if (dept_id) {
    whereConditions.push('e.Dept_ID = ?');
    params.push(parseInt(dept_id));
  }

  if (role) {
    whereConditions.push('(r.Role_Name = ? OR e.Job_Title = ?)');
    params.push(role, role);
  }

  const whereClause = whereConditions.length ? 'WHERE ' + whereConditions.join(' AND ') : '';

  try {
    const [rows] = await db.query(`
      SELECT e.Emp_ID, e.User_ID, e.Dept_ID, e.First_Name, e.Last_Name, e.Gender, e.Date_Of_Birth,
             e.Job_Title, e.Phone, e.Email, e.Salary, e.Hire_Date, e.Is_Active, e.Created_At,
             dept.Dept_Name,
             u.Username,
             r.Role_ID, r.Role_Name,
             TIMESTAMPDIFF(YEAR, e.Date_Of_Birth, CURDATE()) AS Age
      FROM Employee e
      LEFT JOIN Department dept ON e.Dept_ID = dept.Dept_ID
      LEFT JOIN App_User   u    ON e.User_ID = u.User_ID
      LEFT JOIN Role       r    ON u.Role_ID = r.Role_ID
      ${whereClause}
      ORDER BY e.Emp_ID DESC
      LIMIT ? OFFSET ?`, [...params, limitNum, offset]);

    const [[{ total }]] = await db.query(`
      SELECT COUNT(*) AS total
      FROM Employee e
      LEFT JOIN Department dept ON e.Dept_ID = dept.Dept_ID
      LEFT JOIN App_User   u    ON e.User_ID = u.User_ID
      LEFT JOIN Role       r    ON u.Role_ID = r.Role_ID
      ${whereClause}`, params);

    res.json({
      success: true,
      data: rows,
      total: parseInt(total || 0),
      page: pageNum,
      limit: limitNum
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/employees/:id
 * Single employee detail by Emp_ID
 */
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT e.Emp_ID, e.User_ID, e.Dept_ID, e.First_Name, e.Last_Name, e.Gender, e.Date_Of_Birth,
             e.Job_Title, e.Phone, e.Email, e.Salary, e.Hire_Date, e.Is_Active, e.Created_At,
             dept.Dept_Name,
             u.Username,
             r.Role_ID, r.Role_Name,
             TIMESTAMPDIFF(YEAR, e.Date_Of_Birth, CURDATE()) AS Age
      FROM Employee e
      LEFT JOIN Department dept ON e.Dept_ID = dept.Dept_ID
      LEFT JOIN App_User   u    ON e.User_ID = u.User_ID
      LEFT JOIN Role       r    ON u.Role_ID = r.Role_ID
      WHERE e.Emp_ID = ?`, [req.params.id]);

    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * POST /api/employees
 * Create employee and auto-provision App_User account inside an atomic SQL transaction
 */
router.post('/', async (req, res) => {
  const {
    first_name, last_name, gender, date_of_birth,
    job_title, phone, email, dept_id, salary, hire_date,
    new_password, password
  } = req.body;

  const isDoctor = (job_title || '').trim().toLowerCase().includes('doc');
  if (!first_name || !last_name || !job_title || !phone || !email || (isDoctor && !dept_id)) {
    return res.status(400).json({
      success: false,
      message: `Required fields missing: first_name, last_name, job_title, phone, email${isDoctor ? ', dept_id' : ''}`
    });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Resolve Role_ID for job title (Admin / Hospital_Admin -> Role_ID = 1)
    const roleName = mapJobTitleToRoleName(job_title);
    const [roleRows] = await conn.query(
      'SELECT Role_ID FROM Role WHERE Role_Name = ? OR Role_Name = ?',
      [roleName, job_title.trim()]
    );
    
    let roleId;
    if (roleRows.length) {
      roleId = roleRows[0].Role_ID;
    } else {
      const [defaultRole] = await conn.query('SELECT Role_ID FROM Role WHERE Role_Name = ?', [ROLES.RECEPTIONIST]);
      roleId = defaultRole.length ? defaultRole[0].Role_ID : 2;
    }

    // 2. Generate unique username (firstname.lastname pattern with suffix handling)
    let baseUsername = `${first_name.toLowerCase()}.${last_name.toLowerCase()}`.replace(/[^a-z0-9.]/g, '');
    if (!baseUsername || baseUsername === '.') baseUsername = 'user';

    let username = baseUsername;
    let userSuffix = 1;
    while (true) {
      const [existingUser] = await conn.query('SELECT User_ID FROM App_User WHERE Username = ?', [username]);
      if (!existingUser.length) break;
      username = `${baseUsername}${userSuffix}`;
      userSuffix++;
    }

    // 3. Hash custom password or default 'admin123'
    const customPassword = new_password || password;
    const finalPassword = (customPassword && customPassword.trim()) ? customPassword.trim() : 'admin123';
    const passwordHash = bcrypt.hashSync(finalPassword, 10);
    const fullName = `${first_name} ${last_name}`;

    // 4. Insert into App_User
    const [userResult] = await conn.query(`
      INSERT INTO App_User (Role_ID, Username, Password_Hash, Full_Name, Email, Phone, Is_Active)
      VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [roleId, username, passwordHash, fullName, email, phone]
    );
    const userId = userResult.insertId;

    // 5. Insert into Employee (Dept_ID nullable for non-doctors)
    const defaultDOB  = date_of_birth || '1990-01-01';
    const defaultHire = hire_date || new Date().toISOString().slice(0, 10);
    const deptIdValue = dept_id ? parseInt(dept_id) : null;
    
    const dobDate = new Date(defaultDOB);
    const hireDateObj = new Date(defaultHire);
    let calculatedAge = hireDateObj.getFullYear() - dobDate.getFullYear();
    if (hireDateObj.getMonth() < dobDate.getMonth() || (hireDateObj.getMonth() === dobDate.getMonth() && hireDateObj.getDate() < dobDate.getDate())) { calculatedAge--; }
    if (calculatedAge < 18) {
      await conn.rollback(); conn.release();
      return res.status(400).json({ success: false, message: 'Employee must be at least 18 years old at the time of hiring.' });
    }

    const [empResult] = await conn.query(`
      INSERT INTO Employee (User_ID, Dept_ID, First_Name, Last_Name, Gender, Date_Of_Birth, Job_Title, Phone, Email, Salary, Hire_Date, Is_Active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        userId, deptIdValue, first_name, last_name,
        gender || 'Male', defaultDOB, job_title, phone, email,
        parseFloat(salary || 0.00), defaultHire
      ]
    );
    const empId = empResult.insertId;

    await conn.commit();

    res.status(201).json({
      success: true,
      emp_id: empId,
      user_id: userId,
      username,
      message: 'Employee added successfully and login account provisioned',
      credentials: {
        username,
        password: 'admin123'
      }
    });
  } catch (err) {
    await conn.rollback();
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({
        success: false,
        message: 'An employee or user with this email or username already exists.'
      });
    }
    res.status(500).json({ success: false, message: err.message });
  } finally {
    conn.release();
  }
});

/**
 * PUT /api/employees/:id
 * Update employee record and linked App_User account inside an atomic SQL transaction
 */
router.put('/:id', async (req, res) => {
  const {
    first_name, last_name, gender, date_of_birth,
    job_title, phone, email, dept_id, salary, hire_date, is_active,
    new_password, password
  } = req.body;

  const empId = req.params.id;
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    // Fetch existing employee & linked user
    const [empRows] = await conn.query('SELECT Emp_ID, User_ID FROM Employee WHERE Emp_ID = ?', [empId]);
    if (!empRows.length) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }
    const userId = empRows[0].User_ID;

    const activeFlag = is_active !== undefined ? (is_active ? 1 : 0) : 1;
    const deptIdValue = dept_id ? parseInt(dept_id) : null;
    
    const dobStr = date_of_birth || '1990-01-01';
    const hireStr = hire_date || new Date().toISOString().slice(0, 10);
    const dobDate = new Date(dobStr);
    const hireDateObj = new Date(hireStr);
    let calculatedAge = hireDateObj.getFullYear() - dobDate.getFullYear();
    if (hireDateObj.getMonth() < dobDate.getMonth() || (hireDateObj.getMonth() === dobDate.getMonth() && hireDateObj.getDate() < dobDate.getDate())) { calculatedAge--; }
    if (calculatedAge < 18) {
      await conn.rollback(); conn.release();
      return res.status(400).json({ success: false, message: 'Employee must be at least 18 years old at the time of hiring.' });
    }

    // Update Employee record
    await conn.query(`
      UPDATE Employee SET
        First_Name = ?, Last_Name = ?, Gender = ?, Date_Of_Birth = ?,
        Job_Title = ?, Dept_ID = ?, Phone = ?, Email = ?,
        Salary = ?, Hire_Date = ?, Is_Active = ?
      WHERE Emp_ID = ?`,
      [
        first_name, last_name, gender || 'Male', date_of_birth || '1990-01-01',
        job_title, deptIdValue, phone, email,
        parseFloat(salary || 0.00), hire_date || new Date().toISOString().slice(0, 10), activeFlag,
        empId
      ]
    );

    // Sync App_User record if linked
    if (userId) {
      const roleName = mapJobTitleToRoleName(job_title);
      const [roleRows] = await conn.query(
        'SELECT Role_ID FROM Role WHERE Role_Name = ? OR Role_Name = ?',
        [roleName, (job_title || '').trim()]
      );
      const roleId = roleRows.length ? roleRows[0].Role_ID : null;
      const fullName = `${first_name} ${last_name}`;

      const customPassword = new_password || password;
      const shouldUpdatePassword = customPassword && typeof customPassword === 'string' && customPassword.trim() !== '';
      const passwordHash = shouldUpdatePassword ? bcrypt.hashSync(customPassword.trim(), 10) : null;

      if (shouldUpdatePassword) {
        if (roleId) {
          await conn.query(`
            UPDATE App_User SET
              Full_Name = ?, Email = ?, Phone = ?, Role_ID = ?, Password_Hash = ?, Is_Active = ?
            WHERE User_ID = ?`,
            [fullName, email, phone, roleId, passwordHash, activeFlag, userId]
          );
        } else {
          await conn.query(`
            UPDATE App_User SET
              Full_Name = ?, Email = ?, Phone = ?, Password_Hash = ?, Is_Active = ?
            WHERE User_ID = ?`,
            [fullName, email, phone, passwordHash, activeFlag, userId]
          );
        }
      } else {
        if (roleId) {
          await conn.query(`
            UPDATE App_User SET
              Full_Name = ?, Email = ?, Phone = ?, Role_ID = ?, Is_Active = ?
            WHERE User_ID = ?`,
            [fullName, email, phone, roleId, activeFlag, userId]
          );
        } else {
          await conn.query(`
            UPDATE App_User SET
              Full_Name = ?, Email = ?, Phone = ?, Is_Active = ?
            WHERE User_ID = ?`,
            [fullName, email, phone, activeFlag, userId]
          );
        }
      }
    }

    await conn.commit();
    res.json({ success: true, message: 'Employee updated successfully' });
  } catch (err) {
    await conn.rollback();
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({
        success: false,
        message: 'Email address is already in use by another account.'
      });
    }
    res.status(500).json({ success: false, message: err.message });
  } finally {
    conn.release();
  }
});

/**
 * DELETE /api/employees/:id
 * Delete employee and associated App_User record inside an atomic SQL transaction,
 * with lockout protection preventing self-deletion of active logged-in admin.
 */
router.delete('/:id', async (req, res) => {
  const empId = req.params.id;
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    // 1. Check employee existence & get linked User_ID
    const [empRows] = await conn.query('SELECT Emp_ID, User_ID FROM Employee WHERE Emp_ID = ?', [empId]);
    if (!empRows.length) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const userId = empRows[0].User_ID;

    // 2. Lockout protection check: prevent logged-in admin from deleting their own account
    const currentUserId = req.user ? (req.user.user_id || req.user.id) : null;
    const currentEmpId  = req.user ? req.user.employeeId : null;

    if ((userId && currentUserId && parseInt(userId) === parseInt(currentUserId)) ||
        (currentEmpId && parseInt(empId) === parseInt(currentEmpId))) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        message: 'Action prohibited: Cannot delete the currently logged-in administrator account.'
      });
    }

    // 3. Delete Employee record first
    await conn.query('DELETE FROM Employee WHERE Emp_ID = ?', [empId]);

    // 4. Delete linked App_User record if present
    if (userId) {
      await conn.query('DELETE FROM App_User WHERE User_ID = ?', [userId]);
    }

    await conn.commit();
    res.json({ success: true, message: 'Employee and login account deleted successfully' });
  } catch (err) {
    await conn.rollback();
    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(409).json({
        success: false,
        message: 'Cannot delete employee because they are referenced by active laboratory results, payments, or other records.'
      });
    }
    res.status(500).json({ success: false, message: err.message });
  } finally {
    conn.release();
  }
});

module.exports = router;
