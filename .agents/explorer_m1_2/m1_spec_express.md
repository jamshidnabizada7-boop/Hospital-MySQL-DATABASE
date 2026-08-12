# Express Routes, Auth Middleware & API Specification for `/api/employees`

## Executive Summary
This document defines the complete backend API specification, middleware pipeline, input validation, SQL pagination/filtering query logic, atomic database transactions for auto-provisioning, and server route registration for the new `/api/employees` endpoint in the Hospital Management System (Milestone 1).

---

## 1. Middleware Architecture & Security Specification

### 1.1 Authentication & Authorization Pipeline
All endpoints under `/api/employees` must enforce strict authentication and admin-only role-based access control (RBAC).

- **Authentication Middleware**: `authenticate` (from `backend/middleware/auth.js`)
  - Validates `Authorization: Bearer <JWT_TOKEN>` header.
  - Populates `req.user` payload (`User_ID`, `username`, `role`, `doctorId`, etc.).
  - Returns `401 Unauthorized` if header is missing or token is invalid/expired.

- **Authorization Middleware**: `adminOr()` (from `backend/middleware/auth.js`)
  - When called with no arguments (`adminOr()`), enforces `req.user.role === ROLES.ADMIN` (`'Hospital_Admin'`).
  - Returns `403 Forbidden` (`{ "success": false, "message": "Access denied for your role" }`) for any non-admin token (Doctors, Receptionists, Pharmacists, Lab Techs, Accountants).

### 1.2 Route Pipeline Overview
```javascript
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const db     = require('../db');
const { authenticate, adminOr, ROLES } = require('../middleware/auth');

// All employee management routes are Admin-only
const adminAccess = [authenticate, adminOr()];
```

---

## 2. API Endpoints Specification

### Endpoint 1: `GET /api/employees`
- **Purpose**: Fetch paginated, searchable, and filtered list of hospital employees.
- **Middleware Stack**: `authenticate`, `adminOr()`
- **HTTP Method**: `GET`
- **Query Parameters**:
  | Parameter | Type | Default | Description |
  |-----------|------|---------|-------------|
  | `search`  | string | `""` | Substring match on First_Name, Last_Name, Email, Phone, Full_Name, or Username |
  | `role`    | string | `""` | Filter by role/job title (e.g. `'Receptionist'`, `'Pharmacist'`, `'Lab_Technician'`, `'Accountant'`, `'Doctor'`) |
  | `dept_id` | integer | `null` | Filter by department ID |
  | `page`    | integer | `1` | Page number for pagination |
  | `limit`   | integer | `20` | Items per page |

- **SQL Implementation Details**:
  ```javascript
  router.get('/', authenticate, adminOr(), async (req, res) => {
    const { search = '', role = '', dept_id, page = 1, limit = 20 } = req.query;
    const pageNum  = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.max(1, parseInt(limit) || 20);
    const offset   = (pageNum - 1) * limitNum;
    const like     = `%${search}%`;

    let where = 'e.Is_Active = 1 AND (e.First_Name LIKE ? OR e.Last_Name LIKE ? OR CONCAT(e.First_Name, " ", e.Last_Name) LIKE ? OR e.Email LIKE ? OR e.Phone LIKE ? OR u.Username LIKE ?)';
    const params = [like, like, like, like, like, like];

    if (dept_id) {
      where += ' AND e.Dept_ID = ?';
      params.push(parseInt(dept_id));
    }

    if (role) {
      where += ' AND (r.Role_Name = ? OR e.Job_Title = ?)';
      params.push(role, role);
    }

    try {
      const [rows] = await db.query(`
        SELECT e.Emp_ID, e.User_ID, e.Dept_ID, e.First_Name, e.Last_Name, e.Gender, e.Date_Of_Birth,
               e.Job_Title, e.Phone, e.Email, e.Salary, e.Hire_Date, e.Is_Active, e.Created_At,
               dept.Dept_Name,
               u.Username,
               r.Role_ID, r.Role_Name
        FROM Employee e
        LEFT JOIN Department dept ON e.Dept_ID = dept.Dept_ID
        LEFT JOIN App_User   u    ON e.User_ID = u.User_ID
        LEFT JOIN Role       r    ON u.Role_ID = r.Role_ID
        WHERE ${where}
        ORDER BY e.Last_Name, e.First_Name
        LIMIT ? OFFSET ?`, [...params, limitNum, offset]);

      const [[{ total }]] = await db.query(
        `SELECT COUNT(*) AS total
         FROM Employee e
         LEFT JOIN Department dept ON e.Dept_ID = dept.Dept_ID
         LEFT JOIN App_User   u    ON e.User_ID = u.User_ID
         LEFT JOIN Role       r    ON u.Role_ID = r.Role_ID
         WHERE ${where}`, params);

      res.json({
        success: true,
        data: rows,
        total,
        page: pageNum,
        limit: limitNum
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });
  ```

---

### Endpoint 2: `GET /api/employees/:id`
- **Purpose**: Fetch details of a single employee by Employee ID (`Emp_ID`).
- **Middleware Stack**: `authenticate`, `adminOr()`
- **HTTP Method**: `GET`
- **SQL Implementation Details**:
  ```javascript
  router.get('/:id', authenticate, adminOr(), async (req, res) => {
    try {
      const [rows] = await db.query(`
        SELECT e.Emp_ID, e.User_ID, e.Dept_ID, e.First_Name, e.Last_Name, e.Gender, e.Date_Of_Birth,
               e.Job_Title, e.Phone, e.Email, e.Salary, e.Hire_Date, e.Is_Active, e.Created_At,
               dept.Dept_Name,
               u.Username,
               r.Role_ID, r.Role_Name
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
  ```

---

### Endpoint 3: `POST /api/employees` (Employee Creation & User Auto-Provisioning)
- **Purpose**: Create a new staff record in `Employee` table while atomically auto-provisioning an `App_User` login account (`firstname.lastname` with password `admin123`).
- **Middleware Stack**: `authenticate`, `adminOr()`
- **HTTP Method**: `POST`
- **Input Validation**:
  - Required fields: `first_name`, `last_name`, `dept_id`, `job_title`, `phone`, `email`
  - Inline validation check & `express-validator` specification:
    ```javascript
    // Option A: express-validator middleware chain
    const { body, validationResult } = require('express-validator');

    const validateEmployeeCreate = [
      body('first_name').trim().notEmpty().withMessage('first_name is required'),
      body('last_name').trim().notEmpty().withMessage('last_name is required'),
      body('dept_id').isInt({ min: 1 }).withMessage('dept_id must be a valid integer'),
      body('job_title').trim().notEmpty().withMessage('job_title is required'),
      body('phone').trim().notEmpty().withMessage('phone is required'),
      body('email').isEmail().withMessage('Valid email is required'),
      (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ success: false, message: errors.array()[0].msg, errors: errors.array() });
        }
        next();
      }
    ];

    // Option B: project-consistent inline validation check
    if (!first_name || !last_name || !dept_id || !job_title || !phone || !email) {
      return res.status(400).json({
        success: false,
        message: 'Required fields missing: first_name, last_name, dept_id, job_title, phone, email'
      });
    }
    ```

- **Atomic Transaction & Username Auto-Provisioning Logic**:
  ```javascript
  router.post('/', authenticate, adminOr(), async (req, res) => {
    const {
      first_name, last_name, gender = 'Male', date_of_birth = '1990-01-01',
      job_title, phone, email, dept_id, salary = 0.00, hire_date
    } = req.body;

    if (!first_name || !last_name || !dept_id || !job_title || !phone || !email) {
      return res.status(400).json({
        success: false,
        message: 'Required fields: first_name, last_name, dept_id, job_title, phone, email'
      });
    }

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      // 1. Map job_title to Role_Name in DB
      let roleName = 'Receptionist'; // Default fallback
      const normalizedTitle = job_title.trim();

      if (/doctor/i.test(normalizedTitle)) roleName = ROLES.DOCTOR;
      else if (/reception/i.test(normalizedTitle)) roleName = ROLES.RECEPTIONIST;
      else if (/lab/i.test(normalizedTitle)) roleName = ROLES.LAB_TECH;
      else if (/pharm/i.test(normalizedTitle)) roleName = ROLES.PHARMACIST;
      else if (/account/i.test(normalizedTitle)) roleName = ROLES.ACCOUNTANT;

      const [roleRows] = await conn.query(
        'SELECT Role_ID FROM Role WHERE Role_Name = ? OR Role_Name = ?',
        [roleName, normalizedTitle]
      );

      const roleId = roleRows.length ? roleRows[0].Role_ID : 2; // Fallback to Receptionist Role_ID (2)

      // 2. Auto-generate unique username: firstname.lastname
      let baseUsername = `${first_name.toLowerCase()}.${last_name.toLowerCase()}`.replace(/[^a-z0-9.]/g, '');
      let username = baseUsername;
      let userSuffix = 1;

      while (true) {
        const [existing] = await conn.query('SELECT User_ID FROM App_User WHERE Username = ?', [username]);
        if (!existing.length) break;
        username = `${baseUsername}${userSuffix}`;
        userSuffix++;
      }

      // 3. Hash default password 'admin123'
      const passwordHash = bcrypt.hashSync('admin123', 10);
      const fullName = `${first_name} ${last_name}`;

      // 4. Insert into App_User
      const [userResult] = await conn.query(`
        INSERT INTO App_User (Role_ID, Username, Password_Hash, Full_Name, Email, Phone)
        VALUES (?, ?, ?, ?, ?, ?)`,
        [roleId, username, passwordHash, fullName, email, phone]
      );
      const userId = userResult.insertId;

      // 5. Insert into Employee table
      const formattedHireDate = hire_date || new Date().toISOString().split('T')[0];
      const [empResult] = await conn.query(`
        INSERT INTO Employee (User_ID, Dept_ID, First_Name, Last_Name, Gender, Date_Of_Birth,
                              Job_Title, Phone, Email, Salary, Hire_Date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, parseInt(dept_id), first_name, last_name, gender, date_of_birth,
         job_title, phone, email, parseFloat(salary) || 0.00, formattedHireDate]
      );
      const empId = empResult.insertId;

      await conn.commit();

      res.status(201).json({
        success: true,
        emp_id: empId,
        user_id: userId,
        username: username,
        message: 'Employee added successfully and login account provisioned',
        credentials: {
          username: username,
          password: 'admin123'
        }
      });
    } catch (err) {
      await conn.rollback();
      res.status(500).json({ success: false, message: err.message });
    } finally {
      conn.release();
    }
  });
  ```

---

### Endpoint 4: `PUT /api/employees/:id`
- **Purpose**: Update an existing employee record and synchronization with `App_User`.
- **Middleware Stack**: `authenticate`, `adminOr()`
- **HTTP Method**: `PUT`
- **SQL Implementation Details**:
  ```javascript
  router.put('/:id', authenticate, adminOr(), async (req, res) => {
    const {
      first_name, last_name, gender, date_of_birth, job_title,
      phone, email, dept_id, salary, is_active
    } = req.body;

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      // Check existence
      const [empRows] = await conn.query('SELECT User_ID FROM Employee WHERE Emp_ID = ?', [req.params.id]);
      if (!empRows.length) {
        await conn.rollback();
        return res.status(404).json({ success: false, message: 'Employee not found' });
      }

      const userId = empRows[0].User_ID;

      // Update Employee record
      await conn.query(`
        UPDATE Employee SET
          First_Name = ?, Last_Name = ?, Gender = ?, Date_Of_Birth = ?,
          Job_Title = ?, Phone = ?, Email = ?, Dept_ID = ?,
          Salary = ?, Is_Active = ?
        WHERE Emp_ID = ?`,
        [first_name, last_name, gender, date_of_birth,
         job_title, phone, email, parseInt(dept_id),
         parseFloat(salary) || 0.00, is_active !== undefined ? is_active : 1,
         req.params.id]
      );

      // Synchronize with App_User if linked
      if (userId) {
        await conn.query(`
          UPDATE App_User SET
            Full_Name = ?, Email = ?, Phone = ?, Is_Active = ?
          WHERE User_ID = ?`,
          [`${first_name} ${last_name}`, email, phone, is_active !== undefined ? is_active : 1, userId]
        );
      }

      await conn.commit();
      res.json({ success: true, message: 'Employee updated successfully' });
    } catch (err) {
      await conn.rollback();
      res.status(500).json({ success: false, message: err.message });
    } finally {
      conn.release();
    }
  });
  ```

---

### Endpoint 5: `DELETE /api/employees/:id`
- **Purpose**: Soft-delete (deactivate) or remove employee record and associated user account.
- **Middleware Stack**: `authenticate`, `adminOr()`
- **HTTP Method**: `DELETE`
- **SQL Implementation Details**:
  ```javascript
  router.delete('/:id', authenticate, adminOr(), async (req, res) => {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const [empRows] = await conn.query('SELECT User_ID FROM Employee WHERE Emp_ID = ?', [req.params.id]);
      if (!empRows.length) {
        await conn.rollback();
        return res.status(404).json({ success: false, message: 'Employee not found' });
      }

      const userId = empRows[0].User_ID;

      // Soft delete: Deactivate Employee and associated App_User
      await conn.query('UPDATE Employee SET Is_Active = 0 WHERE Emp_ID = ?', [req.params.id]);
      if (userId) {
        await conn.query('UPDATE App_User SET Is_Active = 0 WHERE User_ID = ?', [userId]);
      }

      await conn.commit();
      res.json({ success: true, message: 'Employee deactivated successfully' });
    } catch (err) {
      await conn.rollback();
      res.status(500).json({ success: false, message: err.message });
    } finally {
      conn.release();
    }
  });
  ```

---

### Endpoint 6: `GET /api/employees/meta/roles` & `GET /api/employees/meta/departments`
- **Purpose**: Metadata helpers for frontend modal dropdowns.
- **Middleware Stack**: `authenticate`, `adminOr()`
- **SQL Implementation Details**:
  ```javascript
  // GET /api/employees/meta/roles
  router.get('/meta/roles', authenticate, adminOr(), async (req, res) => {
    try {
      const [rows] = await db.query('SELECT Role_ID, Role_Name, Description FROM Role WHERE Is_Active = 1 ORDER BY Role_Name');
      res.json({ success: true, data: rows });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // GET /api/employees/meta/departments
  router.get('/meta/departments', authenticate, adminOr(), async (req, res) => {
    try {
      const [rows] = await db.query('SELECT Dept_ID, Dept_Name FROM Department WHERE Is_Active = 1 ORDER BY Dept_Name');
      res.json({ success: true, data: rows });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });
  ```

---

## 3. Server Route Registration (`backend/server.js`)

To expose the `/api/employees` route hierarchy, add the route module registration in `backend/server.js`:

### Insertion Location in `backend/server.js`:
```javascript
// Line 20+: API Routes
app.use('/api/auth',        require('./routes/auth'));
app.use('/api/dashboard',   require('./routes/dashboard'));
app.use('/api/patients',    require('./routes/patients'));
app.use('/api/doctors',     require('./routes/doctors'));
app.use('/api/employees',   require('./routes/employees'));  // <--- NEW ROUTE REGISTRATION
app.use('/api/appointments',require('./routes/appointments'));
app.use('/api/billing',     require('./routes/billing'));
app.use('/api/pharmacy',    require('./routes/pharmacy'));
app.use('/api/lab',         require('./routes/laboratory'));
app.use('/api/medical',     require('./routes/medical'));
app.use('/api/reports',       require('./routes/reports'));
app.use('/api/notifications', require('./routes/notifications'));
```

---

## 4. Contract Matrix Summary

| Route Path | Method | Access Level | Description | Key Request Body / Query | Expected Status |
|------------|--------|--------------|-------------|--------------------------|-----------------|
| `/api/employees` | `GET` | Admin | List staff with filters & pagination | `search`, `role`, `dept_id`, `page`, `limit` | `200 OK` |
| `/api/employees/:id` | `GET` | Admin | Get single employee details | `id` in URL params | `200 OK` / `404 Not Found` |
| `/api/employees` | `POST` | Admin | Create employee & auto-provision login | `first_name`, `last_name`, `dept_id`, `job_title`, `phone`, `email` | `201 Created` / `400 Bad Request` |
| `/api/employees/:id` | `PUT` | Admin | Update employee & user details | `first_name`, `last_name`, `phone`, `email`, etc. | `200 OK` / `404 Not Found` |
| `/api/employees/:id` | `DELETE` | Admin | Soft delete/deactivate staff | `id` in URL params | `200 OK` / `404 Not Found` |
| `/api/employees/meta/roles` | `GET` | Admin | Get system roles list | none | `200 OK` |
| `/api/employees/meta/departments` | `GET` | Admin | Get active departments list | none | `200 OK` |
