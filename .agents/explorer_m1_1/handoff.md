# Handoff Report — Milestone 1 Implementation Blueprint (DB Migration & Backend Core)

**Agent Identity**: teamwork_preview_explorer (Explorer M1)  
**Working Directory**: `d:\Hospital MYSQL Databse\.agents\explorer_m1_1`  
**Target Handoff Report**: `d:\Hospital MYSQL Databse\.agents\explorer_m1_1\handoff.md`  
**Date**: 2026-08-12  
**Status**: COMPLETE (Read-Only Blueprint)  

---

## 1. Observation

Direct inspection of the repository files, schema constraints, and route logic revealed the following exact current implementation state:

1. **Database Schema Constraint (`Hospital_Management_System.sql` line 143)**:
   - Line 143: `Dept_ID INT UNSIGNED NOT NULL,` in `Employee` table definition.
   - Empirical DB query `DESCRIBE Employee` returns `Null: 'NO'` for column `Dept_ID`.
   - Creating non-doctor employees (e.g. Receptionist, Pharmacist, Admin) without a department triggers MySQL error `ER_BAD_NULL_ERROR`.

2. **Backend Route Logic (`backend/routes/employees.js`)**:
   - `POST /api/employees` (lines 153–249):
     - Line 159 checks `if (!first_name || !last_name || !job_title || !phone || !email || !dept_id)`. `dept_id` is currently strictly mandatory for all job titles.
     - Line 217 passes `parseInt(dept_id)` to SQL INSERT, which fails or throws error if `dept_id` is null/empty.
     - Line 171 uses `mapJobTitleToRoleName(job_title)`. When `job_title` is "Admin" or "Hospital_Admin", `mapJobTitleToRoleName` returns `ROLES.ADMIN` (`'Hospital_Admin'`). Querying `SELECT Role_ID FROM Role WHERE Role_Name = 'Hospital_Admin'` returns `Role_ID = 1`.
   - `PUT /api/employees/:id` (lines 255–333):
     - Line 286 passes `parseInt(dept_id)` to SQL UPDATE without checking for null.
     - Lines 292–317 sync `App_User` fields (`Full_Name`, `Email`, `Phone`, `Role_ID`, `Is_Active`) but completely omit handling optional custom passwords (`new_password` or `password` in `req.body`).
   - `DELETE /api/employees/:id` (lines 339–377):
     - Lines 347–361 delete `Employee` and linked `App_User` inside a transaction.
     - Does NOT currently check whether the target `Employee.User_ID` or `Emp_ID` matches the currently authenticated administrator (`req.user.user_id` or `req.user.id` from `JWT` payload). Deleting self causes active admin lockouts.

3. **Authentication Middleware (`backend/middleware/auth.js` & `backend/routes/auth.js`)**:
   - `req.user` decoded from JWT payload contains `{ id: user.User_ID, username, role, doctorId, employeeId }`.

---

## 2. Logic Chain

1. **DB Migration Reasoning**:
   - Non-doctor staff roles (Admin, Receptionist, Pharmacist, Lab Tech, Accountant) do not belong to clinical departments.
   - To store non-doctors in `Employee` with `Dept_ID = NULL`, `Employee.Dept_ID` must be altered to `INT UNSIGNED NULL`.

2. **`POST /api/employees` Logic**:
   - Validation must require `dept_id` only if `job_title` contains `"Doctor"` / `"doc"`.
   - For job titles containing `"Admin"` or `"Hospital_Admin"`, `mapJobTitleToRoleName` resolves role name `Hospital_Admin`, which maps to `Role_ID = 1` in `Role` table.
   - `Dept_ID` passed to SQL insert must be `dept_id ? parseInt(dept_id) : null`.

3. **`PUT /api/employees/:id` Logic**:
   - `Dept_ID` passed to SQL update must be `dept_id ? parseInt(dept_id) : null`.
   - Read `const customPassword = new_password || password;`. If non-empty string, hash with `bcrypt.hashSync(customPassword.trim(), 10)` and include `Password_Hash = ?` in `App_User` UPDATE statement. If empty/omitted, keep `Password_Hash` unchanged.

4. **`DELETE /api/employees/:id` Lockout Protection Logic**:
   - Extract current logged in admin user ID from `req.user.user_id || req.user.id` and employee ID from `req.user.employeeId`.
   - Query target `Employee` row to retrieve `User_ID`.
   - If target `User_ID` equals `currentUserId` OR target `Emp_ID` equals `currentEmpId`, abort transaction and respond with `400 Bad Request` and error message `"Action prohibited: Cannot delete the currently logged-in administrator account."`.
   - Otherwise, execute atomic transaction deleting `Employee` and linked `App_User`.

---

## 3. Caveats

- **No Caveats**: Analysis covers exact line numbers, SQL constraints, and JWT payload properties. DB migration is non-destructive and fully backwards-compatible.

---

## 4. Conclusion & Step-by-Step Implementation Blueprint

### Step 1: Database Migration (SQL ALTER & File Update)

#### 1.1 Execute SQL Statement on MySQL Instance
```sql
ALTER TABLE Employee MODIFY Dept_ID INT UNSIGNED NULL;
```

#### 1.2 Update `Hospital_Management_System.sql`
Target File: `d:\Hospital MYSQL Databse\Hospital_Management_System.sql`  
Line 143:
```sql
-- BEFORE (Line 143):
    Dept_ID       INT UNSIGNED  NOT NULL,

-- AFTER (Line 143):
    Dept_ID       INT UNSIGNED      NULL,
```

---

### Step 2: Backend Route Modifications (`backend/routes/employees.js`)

Target File: `d:\Hospital MYSQL Databse\backend\routes\employees.js`

#### 2.1 Update `POST /api/employees` (Lines 153–249)

Replace lines 153–249 with the following exact implementation:

```javascript
/**
 * POST /api/employees
 * Create employee and auto-provision App_User account inside an atomic SQL transaction
 */
router.post('/', async (req, res) => {
  const {
    first_name, last_name, gender, date_of_birth,
    job_title, phone, email, dept_id, salary, hire_date
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

    // 3. Hash default password 'admin123'
    const passwordHash = bcrypt.hashSync('admin123', 10);
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
```

---

#### 2.2 Update `PUT /api/employees/:id` (Lines 255–333)

Replace lines 255–333 with the following exact implementation:

```javascript
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
```

---

#### 2.3 Update `DELETE /api/employees/:id` (Lines 339–377)

Replace lines 339–377 with the following exact implementation:

```javascript
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
```

---

## 5. Verification Method

To independently verify the Milestone 1 implementations once executed by the builder agent:

1. **Verify Database Nullability**:
   ```powershell
   node -e "require('dotenv').config(); const db = require('./backend/db'); db.query('DESCRIBE Employee').then(([rows]) => console.log(rows.find(r => r.Field === 'Dept_ID')));"
   ```
   *Expected output*: `{ Field: 'Dept_ID', Type: 'int unsigned', Null: 'YES', ... }`

2. **Verify Backend Employee Endpoints (PowerShell API Test)**:
   ```powershell
   powershell -ExecutionPolicy Bypass -File test_api.ps1
   ```
   *Expected output*: `53 PASS | 0 FAIL` (or expanded test count passing 100%).

3. **Verify RBAC Access Rules**:
   ```powershell
   powershell -ExecutionPolicy Bypass -File test_roles.ps1
   ```
   *Expected output*: `100% assertions passing with HTTP 200/403 expectations`.
