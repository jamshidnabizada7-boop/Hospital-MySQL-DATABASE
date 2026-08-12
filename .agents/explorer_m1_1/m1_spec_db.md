# Milestone 1 Specification: Database Transactions & Auto-Provisioning for Employee CRUD (`backend/routes/employees.js`)

## Executive Summary
This document provides the complete, production-ready specification and Javascript/SQL code structure for `backend/routes/employees.js`. It defines the transaction boundary, SQL queries, username generation, password hashing, role lookup, error handling, and rollback mechanisms for creating, updating, and deleting non-doctor hospital staff (and general employees) in the Hospital Management System.

---

## Database Schema & Alignment Analysis

### 1. `Role` Table & Job Title Mapping
In `Hospital_Management_System.sql`, system roles are defined as:
- `Role_ID 1`: `Hospital_Admin`
- `Role_ID 2`: `Receptionist`
- `Role_ID 3`: `Doctor`
- `Role_ID 4`: `Lab_Technician`
- `Role_ID 5`: `Pharmacist`
- `Role_ID 6`: `Accountant`

When an employee is created via `POST /api/employees`, `job_title` string values (e.g. `"Receptionist"`, `"Lab Technician"`, `"Lab_Technician"`, `"Pharmacist"`, `"Accountant"`, `"Doctor"`) must be mapped to the corresponding `Role_Name` in the `Role` table.

**Role Mapping Logic:**
```javascript
const mapJobTitleToRoleName = (jobTitle) => {
  const normalized = (jobTitle || '').trim().toLowerCase().replace(/[\s_-]+/g, '');
  if (normalized.includes('reception')) return ROLES.RECEPTIONIST; // 'Receptionist'
  if (normalized.includes('lab') || normalized.includes('tech')) return ROLES.LAB_TECH; // 'Lab_Technician'
  if (normalized.includes('pharm')) return ROLES.PHARMACIST; // 'Pharmacist'
  if (normalized.includes('account') || normalized.includes('finance')) return ROLES.ACCOUNTANT; // 'Accountant'
  if (normalized.includes('doc') || normalized.includes('physician')) return ROLES.DOCTOR; // 'Doctor'
  return ROLES.RECEPTIONIST; // Default fallback role
};
```

---

### 2. Table Schemas & Foreign Keys

#### `App_User` Table
```sql
CREATE TABLE App_User (
    User_ID        INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    Role_ID        INT UNSIGNED  NOT NULL,
    Username       VARCHAR(50)   NOT NULL UNIQUE,
    Password_Hash  VARCHAR(255)  NOT NULL COMMENT 'bcrypt hash',
    Full_Name      VARCHAR(100)  NOT NULL,
    Email          VARCHAR(100)  NOT NULL UNIQUE,
    Phone          VARCHAR(20)       NULL,
    Is_Active      TINYINT(1)    NOT NULL DEFAULT 1,
    Last_Login     DATETIME          NULL,
    Created_At     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    Updated_At     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT pk_app_user PRIMARY KEY (User_ID),
    CONSTRAINT fk_user_role FOREIGN KEY (Role_ID) REFERENCES Role(Role_ID) ON DELETE RESTRICT ON UPDATE CASCADE
);
```

#### `Employee` Table
```sql
CREATE TABLE Employee (
    Emp_ID        INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    User_ID       INT UNSIGNED      NULL,
    Dept_ID       INT UNSIGNED  NOT NULL,
    First_Name    VARCHAR(50)   NOT NULL,
    Last_Name     VARCHAR(50)   NOT NULL,
    Gender        ENUM('Male','Female','Other') NOT NULL,
    Date_Of_Birth DATE          NOT NULL,
    Job_Title     VARCHAR(100)  NOT NULL,
    Phone         VARCHAR(20)   NOT NULL,
    Email         VARCHAR(100)  NOT NULL UNIQUE,
    Salary        DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    Hire_Date     DATE          NOT NULL DEFAULT (CURRENT_DATE),
    Is_Active     TINYINT(1)    NOT NULL DEFAULT 1,
    Created_At    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_employee PRIMARY KEY (Emp_ID),
    CONSTRAINT uq_emp_email UNIQUE (Email),
    CONSTRAINT fk_emp_dept FOREIGN KEY (Dept_ID) REFERENCES Department(Dept_ID) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_emp_user FOREIGN KEY (User_ID) REFERENCES App_User(User_ID) ON DELETE SET NULL ON UPDATE CASCADE
);
```

---

## Detailed Operation Specifications

### 1. `POST /api/employees` (Atomic Auto-Provisioning Transaction)

#### Workflow & Requirements:
1. Restricted to `ROLES.ADMIN`.
2. Validates mandatory input fields (`first_name`, `last_name`, `job_title`, `phone`, `email`, `dept_id`).
3. Acquires dedicated DB connection (`await db.getConnection()`).
4. Begins explicit transaction (`await conn.beginTransaction()`).
5. Looks up `Role_ID` from `Role` table using mapped `Role_Name`.
6. Generates unique username using base pattern `firstname.lastname` (lowercased, special characters stripped).
7. Uniqueness Loop: queries `App_User` for matching `Username`. Appends incrementing numerical suffix (`1`, `2`, `3`...) until an unused username is found.
8. Hashes default password (`admin123`) using `bcrypt.hashSync('admin123', 10)`.
9. Inserts record into `App_User` table and retrieves `User_ID` (`insertId`).
10. Inserts record into `Employee` table linking `User_ID`, `Dept_ID`, demographics, salary, and hire date, and retrieves `Emp_ID` (`insertId`).
11. Commits transaction (`await conn.commit()`).
12. Releases connection in `finally` block (`conn.release()`).
13. On failure: catches error, rolls back transaction (`await conn.rollback()`), releases connection, and returns specific error response (e.g., 400 for duplicate email/validation, 500 for internal errors).

#### SQL Statements Executed:
```sql
-- 1. Role lookup
SELECT Role_ID FROM Role WHERE Role_Name = ?;

-- 2. Username check loop
SELECT User_ID FROM App_User WHERE Username = ?;

-- 3. App_User Insert
INSERT INTO App_User (Role_ID, Username, Password_Hash, Full_Name, Email, Phone, Is_Active)
VALUES (?, ?, ?, ?, ?, ?, 1);

-- 4. Employee Insert
INSERT INTO Employee (User_ID, Dept_ID, First_Name, Last_Name, Gender, Date_Of_Birth, Job_Title, Phone, Email, Salary, Hire_Date, Is_Active)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1);
```

---

### 2. `PUT /api/employees/:id` (Employee & Linked User Update Transaction)

#### Workflow & Requirements:
1. Restricted to `ROLES.ADMIN`.
2. Acquires DB connection and starts transaction (`await conn.beginTransaction()`).
3. Fetches target `Employee` record by `Emp_ID` to obtain linked `User_ID`. If not found, returns `404 Not Found`.
4. If `job_title` is updated, resolves new `Role_ID` from `Role` table.
5. Updates `Employee` record (`First_Name`, `Last_Name`, `Gender`, `Date_Of_Birth`, `Job_Title`, `Dept_ID`, `Phone`, `Email`, `Salary`, `Hire_Date`, `Is_Active`).
6. If linked `User_ID` exists in `App_User`:
   - Updates `App_User` record (`Full_Name`, `Email`, `Phone`, `Role_ID`, `Is_Active`).
7. Commits transaction (`await conn.commit()`).
8. Releases connection in `finally` block.
9. On error: rolls back transaction, releases connection, handles duplicate key constraints (`ER_DUP_ENTRY`), returns error response.

#### SQL Statements Executed:
```sql
-- 1. Fetch current employee
SELECT Emp_ID, User_ID FROM Employee WHERE Emp_ID = ?;

-- 2. Lookup new Role_ID (if job_title provided)
SELECT Role_ID FROM Role WHERE Role_Name = ?;

-- 3. Update Employee
UPDATE Employee SET
    First_Name = ?, Last_Name = ?, Gender = ?, Date_Of_Birth = ?,
    Job_Title = ?, Dept_ID = ?, Phone = ?, Email = ?,
    Salary = ?, Hire_Date = ?, Is_Active = ?
WHERE Emp_ID = ?;

-- 4. Update linked App_User
UPDATE App_User SET
    Full_Name = ?, Email = ?, Phone = ?, Role_ID = ?, Is_Active = ?
WHERE User_ID = ?;
```

---

### 3. `DELETE /api/employees/:id` (Atomic Cascaded Delete Transaction)

#### Workflow & Requirements:
1. Restricted to `ROLES.ADMIN`.
2. Acquires DB connection and starts transaction (`await conn.beginTransaction()`).
3. Fetches target `Employee` record by `Emp_ID` to obtain linked `User_ID`. If not found, returns `404 Not Found`.
4. Deletes `Employee` record (`DELETE FROM Employee WHERE Emp_ID = ?`).
5. If `User_ID` exists, deletes corresponding `App_User` record (`DELETE FROM App_User WHERE User_ID = ?`).
6. Commits transaction (`await conn.commit()`).
7. Releases connection in `finally` block.
8. Error Handling:
   - Foreign key violation (`ER_ROW_IS_REFERENCED_2` or SQL state `23000`): rolls back and returns `409 Conflict` with clear message (`"Cannot delete employee because of active references in lab results or payment logs."`).

#### SQL Statements Executed:
```sql
-- 1. Fetch User_ID
SELECT Emp_ID, User_ID FROM Employee WHERE Emp_ID = ?;

-- 2. Delete Employee
DELETE FROM Employee WHERE Emp_ID = ?;

-- 3. Delete App_User (if User_ID is not null)
DELETE FROM App_User WHERE User_ID = ?;
```

---

## Production-Ready Implementation Code (`backend/routes/employees.js`)

Below is the complete, modular Express route implementation ready for inclusion in `backend/routes/employees.js`.

```javascript
/**
 * routes/employees.js — Non-doctor hospital staff management API
 * Restricted to Admin users.
 */
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const db     = require('../db');
const { authenticate, authorize, ROLES } = require('../middleware/auth');

/**
 * Helper: Maps job_title string to standard ROLES constant name
 */
const mapJobTitleToRoleName = (jobTitle) => {
  const normalized = (jobTitle || '').trim().toLowerCase().replace(/[\s_-]+/g, '');
  if (normalized.includes('reception')) return ROLES.RECEPTIONIST;
  if (normalized.includes('lab') || normalized.includes('tech')) return ROLES.LAB_TECH;
  if (normalized.includes('pharm')) return ROLES.PHARMACIST;
  if (normalized.includes('account') || normalized.includes('finance')) return ROLES.ACCOUNTANT;
  if (normalized.includes('doc') || normalized.includes('physician')) return ROLES.DOCTOR;
  return ROLES.RECEPTIONIST; // Default fallback
};

// Apply auth & admin check to all employee endpoints
router.use(authenticate, authorize(ROLES.ADMIN));

/**
 * GET /api/employees
 * List employees with search, department filter, role filter, and pagination
 */
router.get('/', async (req, res) => {
  const { search = '', dept_id, role, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const like   = `%${search}%`;

  let whereConditions = [`(e.First_Name LIKE ? OR e.Last_Name LIKE ? OR e.Email LIKE ? OR e.Job_Title LIKE ?)`];
  const params = [like, like, like, like];

  if (dept_id) {
    whereConditions.push('e.Dept_ID = ?');
    params.push(parseInt(dept_id));
  }

  if (role) {
    whereConditions.push('r.Role_Name = ?');
    params.push(role);
  }

  const whereClause = whereConditions.join(' AND ');

  try {
    const [rows] = await db.query(`
      SELECT e.Emp_ID, e.User_ID, e.First_Name, e.Last_Name, e.Gender, e.Date_Of_Birth,
             e.Job_Title, e.Phone, e.Email, e.Salary, e.Hire_Date, e.Is_Active, e.Created_At,
             dept.Dept_ID, dept.Dept_Name,
             u.Username, r.Role_Name,
             TIMESTAMPDIFF(YEAR, e.Date_Of_Birth, CURDATE()) AS Age
      FROM Employee e
      LEFT JOIN Department dept ON e.Dept_ID = dept.Dept_ID
      LEFT JOIN App_User u      ON e.User_ID = u.User_ID
      LEFT JOIN Role r          ON u.Role_ID = r.Role_ID
      WHERE ${whereClause}
      ORDER BY e.Last_Name, e.First_Name
      LIMIT ? OFFSET ?`, [...params, parseInt(limit), offset]);

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total 
       FROM Employee e 
       LEFT JOIN App_User u ON e.User_ID = u.User_ID 
       LEFT JOIN Role r ON u.Role_ID = r.Role_ID 
       WHERE ${whereClause}`, params);

    res.json({
      success: true,
      data: rows,
      total,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/employees/:id
 * Get single employee detail by Emp_ID
 */
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT e.Emp_ID, e.User_ID, e.First_Name, e.Last_Name, e.Gender, e.Date_Of_Birth,
             e.Job_Title, e.Phone, e.Email, e.Salary, e.Hire_Date, e.Is_Active, e.Created_At,
             dept.Dept_ID, dept.Dept_Name,
             u.Username, r.Role_Name,
             TIMESTAMPDIFF(YEAR, e.Date_Of_Birth, CURDATE()) AS Age
      FROM Employee e
      LEFT JOIN Department dept ON e.Dept_ID = dept.Dept_ID
      LEFT JOIN App_User u      ON e.User_ID = u.User_ID
      LEFT JOIN Role r          ON u.Role_ID = r.Role_ID
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
 * Create employee and auto-provision App_User account inside an atomic transaction
 */
router.post('/', async (req, res) => {
  const {
    first_name, last_name, gender, date_of_birth,
    job_title, phone, email, dept_id, salary, hire_date
  } = req.body;

  if (!first_name || !last_name || !job_title || !phone || !email || !dept_id) {
    return res.status(400).json({
      success: false,
      message: 'Required fields: first_name, last_name, job_title, phone, email, dept_id'
    });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Resolve Role_ID for job title
    const roleName = mapJobTitleToRoleName(job_title);
    const [roleRows] = await conn.query('SELECT Role_ID FROM Role WHERE Role_Name = ?', [roleName]);
    if (!roleRows.length) {
      throw new Error(`Role '${roleName}' not found in database`);
    }
    const roleId = roleRows[0].Role_ID;

    // 2. Generate unique username (firstname.lastname pattern)
    let baseUsername = `${first_name.toLowerCase()}.${last_name.toLowerCase()}`.replace(/[^a-z0-9.]/g, '');
    if (!baseUsername) baseUsername = 'user';

    let username = baseUsername;
    let userSuffix = 1;
    while (true) {
      const [existingUser] = await conn.query('SELECT User_ID FROM App_User WHERE Username = ?', [username]);
      if (!existingUser.length) break;
      username = `${baseUsername}${userSuffix}`;
      userSuffix++;
    }

    // 3. Hash default password 'admin123'
    const passwordHash = bcrypt.hashSync('admin123', 10);
    const fullName = `${first_name} ${last_name}`;

    // 4. Insert App_User
    const [userResult] = await conn.query(`
      INSERT INTO App_User(Role_ID, Username, Password_Hash, Full_Name, Email, Phone, Is_Active)
      VALUES(?, ?, ?, ?, ?, ?, 1)`,
      [roleId, username, passwordHash, fullName, email, phone]
    );
    const userId = userResult.insertId;

    // 5. Insert Employee
    const defaultDOB  = date_of_birth || '1990-01-01';
    const defaultHire = hire_date || new Date().toISOString().slice(0, 10);
    const [empResult] = await conn.query(`
      INSERT INTO Employee(User_ID, Dept_ID, First_Name, Last_Name, Gender, Date_Of_Birth, Job_Title, Phone, Email, Salary, Hire_Date, Is_Active)
      VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        userId, parseInt(dept_id), first_name, last_name,
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
 * Update employee details and sync linked App_User account inside a transaction
 */
router.put('/:id', async (req, res) => {
  const {
    first_name, last_name, gender, date_of_birth,
    job_title, phone, email, dept_id, salary, hire_date, is_active
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

    // Update Employee record
    const activeFlag = is_active !== undefined ? (is_active ? 1 : 0) : 1;
    await conn.query(`
      UPDATE Employee SET
        First_Name = ?, Last_Name = ?, Gender = ?, Date_Of_Birth = ?,
        Job_Title = ?, Dept_ID = ?, Phone = ?, Email = ?,
        Salary = ?, Hire_Date = ?, Is_Active = ?
      WHERE Emp_ID = ?`,
      [
        first_name, last_name, gender || 'Male', date_of_birth || '1990-01-01',
        job_title, parseInt(dept_id), phone, email,
        parseFloat(salary || 0.00), hire_date || new Date().toISOString().slice(0, 10), activeFlag,
        empId
      ]
    );

    // Sync App_User record if linked
    if (userId) {
      const roleName = mapJobTitleToRoleName(job_title);
      const [roleRows] = await conn.query('SELECT Role_ID FROM Role WHERE Role_Name = ?', [roleName]);
      const roleId = roleRows.length ? roleRows[0].Role_ID : null;

      const fullName = `${first_name} ${last_name}`;
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
 * Delete employee and associated App_User record inside an atomic transaction
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

    // 2. Delete Employee record first
    await conn.query('DELETE FROM Employee WHERE Emp_ID = ?', [empId]);

    // 3. Delete linked App_User record if present
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
```

---

## Server Integration (`backend/server.js`)
To enable this route in Express, add the line to `backend/server.js`:
```javascript
app.use('/api/employees', require('./routes/employees'));
```

---

## Verification & Test Plan

1. **Powershell Security Test (`test_roles.ps1`)**:
   Verify `/api/employees` returns `401 Unauthorized` without token, `403 Forbidden` with Doctor/Receptionist tokens, and `200/201` with Admin token.
2. **Powershell Functional Test (`test_api.ps1`)**:
   Verify POST `/api/employees` creates employee, returns credentials (`firstname.lastname` / `admin123`), and that POST `/api/auth/login` succeeds with generated credentials.
