# Backend Architecture & Database Schema Survey Report

**Project**: Hospital Management System — Staff Management & Auto-Provisioning  
**Author**: Survey Explorer 1  
**Date**: 2026-08-12  
**Target Working Directory**: `d:\Hospital MYSQL Databse\.agents\explorer_survey_1`  
**Project Root**: `d:\Hospital MYSQL Databse`  

---

## 1. Executive Summary

This report presents a complete investigation of the backend architecture, database schema, transaction mechanisms, authentication/authorization layer, and API design for the Hospital Management System (HMS). The objective is to establish a solid foundation for implementing **Requirement R1** (Backend Auto-Provisioning for Employees via `/api/employees`).

The codebase is built on **Node.js + Express (v5.2.1)** with a **MySQL 8.0** relational database managed via `mysql2/promise` connection pooling. Authentication uses JWT Bearer tokens, while authorization is strictly role-based. Currently, auto-provisioning is only implemented for doctors (`/api/doctors`). A dedicated `/api/employees` endpoint is missing and must be added with atomic SQL transactions to auto-create matching `App_User` accounts with credentials `firstname.lastname` / `admin123`.

---

## 2. Backend Tech Stack & Infrastructure

- **Runtime & Module System**: Node.js (CommonJS, `type: "commonjs"` in `backend/package.json`).
- **Web Framework**: Express `v5.2.1` (`backend/server.js`).
- **Database Driver**: `mysql2` `v3.23.2` with promise interface (`mysql2/promise`).
- **Database Connection Management**:
  - Managed in `backend/db.js`.
  - Configured with `mysql.createPool(...)` (20 connections, `waitForConnections: true`, `timezone: '+00:00'`, `decimalNumbers: true`).
- **Authentication**: `jsonwebtoken` (`v9.0.3`) Bearer tokens. Token payload stores `{ id, username, role, name, doctorId, employeeId }`.
- **Password Hashing**: `bcryptjs` (`v3.0.3`), using cost factor 10.
- **Input Validation & Utilities**: `express-validator` (`v7.3.2`), `dotenv` (`v17.4.2`), `cors` (`v2.8.6`).

---

## 3. Database Schema & System Roles Analysis

The database schema is defined in `Hospital_Management_System.sql`.

### 3.1 Role Table (`Role`)
```sql
CREATE TABLE Role (
    Role_ID     INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    Role_Name   VARCHAR(50)     NOT NULL UNIQUE,
    Description VARCHAR(255)    NOT NULL DEFAULT '',
    Is_Active   TINYINT(1)      NOT NULL DEFAULT 1,
    Created_At  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    Updated_At  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT pk_role PRIMARY KEY (Role_ID)
);
```

**Database Seeded Roles & Role ID Mapping**:
| Role_ID | Role_Name | System Description | Application Constant (`auth.js`) |
|---|---|---|---|
| 1 | `Hospital_Admin` | Full system access | `ROLES.ADMIN` |
| 2 | `Receptionist` | Appointment & patient registration | `ROLES.RECEPTIONIST` |
| 3 | `Doctor` | Patient care, records, prescriptions | `ROLES.DOCTOR` |
| 4 | `Lab_Technician` | Lab orders & results | `ROLES.LAB_TECH` |
| 5 | `Pharmacist` | Inventory & dispensing | `ROLES.PHARMACIST` |
| 6 | `Accountant` | Billing & payments | `ROLES.ACCOUNTANT` |

### 3.2 App_User Table (`App_User`)
```sql
CREATE TABLE App_User (
    User_ID        INT UNSIGNED  NOT NULL AUTO_INCREMENT,
    Role_ID        INT UNSIGNED  NOT NULL,
    Username       VARCHAR(50)   NOT NULL UNIQUE,
    Password_Hash  VARCHAR(255)  NOT NULL,
    Full_Name      VARCHAR(100)  NOT NULL,
    Email          VARCHAR(100)  NOT NULL UNIQUE,
    Phone          VARCHAR(20)       NULL,
    Is_Active      TINYINT(1)    NOT NULL DEFAULT 1,
    Last_Login     DATETIME          NULL,
    Created_At     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    Updated_At     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT pk_app_user PRIMARY KEY (User_ID),
    CONSTRAINT fk_user_role FOREIGN KEY (Role_ID) REFERENCES Role(Role_ID)
);
```

### 3.3 Employee Table (`Employee`)
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
    CONSTRAINT fk_emp_dept FOREIGN KEY (Dept_ID) REFERENCES Department(Dept_ID),
    CONSTRAINT fk_emp_user FOREIGN KEY (User_ID) REFERENCES App_User(User_ID) ON DELETE SET NULL
);
```

---

## 4. Existing API Routes & Middleware Architecture

### 4.1 Authentication & Authorization Middleware (`backend/middleware/auth.js`)
- `authenticate(req, res, next)`: Extracts JWT token from `Authorization: Bearer <token>`, decodes payload into `req.user`.
- `authorize(...roles)`: Verifies `req.user.role` matches one of the specified allowed roles.
- `adminOr(...roles)`: Always grants access if `req.user.role === 'Hospital_Admin'`; otherwise checks if `req.user.role` is in the allowed roles list.

### 4.2 Login Logic (`backend/routes/auth.js`)
- Authenticates credentials against `App_User` and `Role`.
- For `Doctor` accounts: queries `Doctor` table to attach `doctorId` to token and response.
- For non-doctor staff (`Accountant`, `Receptionist`, `Lab_Technician`, `Pharmacist`): queries `Employee` table by `User_ID` to attach `employeeId` (`Emp_ID`) to token and response.

### 4.3 Reference Auto-Provisioning Implementation (`backend/routes/doctors.js`)
In `POST /api/doctors`, administrative auto-provisioning is already used:
1. Opens explicit connection: `const conn = await db.getConnection(); await conn.beginTransaction();`
2. Resolves `Role_ID` from `Role` table for `Doctor`.
3. Sanitizes base username: `${first_name.toLowerCase()}.${last_name.toLowerCase()}`.replace(/[^a-z0-9.]/g, '').
4. Checks uniqueness in `App_User` table in a loop, suffixing incrementing integers (`1`, `2`, `3`...) if collision occurs.
5. Hashes default password `admin123` with bcrypt.
6. Inserts `App_User` record -> receives `User_ID`.
7. Inserts `Doctor` record using `User_ID`.
8. Commits transaction and releases connection.

---

## 5. Required Implementation for Requirement R1 (`/api/employees`)

### 5.1 Route File Creation: `backend/routes/employees.js`
Must be registered in `backend/server.js`:
```js
app.use('/api/employees', require('./routes/employees'));
```

### 5.2 Endpoint Specifications

#### 1. `GET /api/employees`
- **Access**: Admin (or authenticated staff depending on UI requirement).
- **Query Params**: `search`, `dept_id`, `job_title`, `page` (default 1), `limit` (default 20).
- **SQL Query**:
  ```sql
  SELECT e.Emp_ID, e.First_Name, e.Last_Name, e.Gender, e.Date_Of_Birth,
         e.Job_Title, e.Phone, e.Email, e.Salary, e.Hire_Date, e.Is_Active,
         e.Dept_ID, e.User_ID,
         dept.Dept_Name, u.Username, r.Role_Name
  FROM Employee e
  LEFT JOIN Department dept ON e.Dept_ID = dept.Dept_ID
  LEFT JOIN App_User u ON e.User_ID = u.User_ID
  LEFT JOIN Role r ON u.Role_ID = r.Role_ID
  WHERE e.Is_Active = 1 AND (e.First_Name LIKE ? OR e.Last_Name LIKE ? OR e.Email LIKE ? OR e.Job_Title LIKE ?)
  ORDER BY e.Last_Name, e.First_Name
  LIMIT ? OFFSET ?
  ```

#### 2. `GET /api/employees/:id`
- **Access**: Authenticated users.
- **SQL Query**: Fetches single employee record by `Emp_ID` joined with `Department`, `App_User`, `Role`.

#### 3. `POST /api/employees`
- **Access**: Admin only (`authenticate`, `adminOr()`).
- **Body Params**: `first_name`, `last_name`, `gender`, `date_of_birth`, `job_title`, `phone`, `email`, `dept_id`, `salary`, `hire_date`.
- **Role Mapping Logic**:
  Map incoming `job_title` to system `Role_Name`:
  - `"Receptionist"` -> `"Receptionist"`
  - `"Pharmacist"` -> `"Pharmacist"`
  - `"Accountant"` -> `"Accountant"`
  - `"Lab Technician"` / `"Lab_Technician"` / `"Lab Tech"` -> `"Lab_Technician"`
  - `"Doctor"` -> `"Doctor"`
  - `"Hospital_Admin"` / `"Admin"` / `"IT Administrator"` -> `"Hospital_Admin"`
  - Default/fallback: Lookup `Role_ID` from `Role` WHERE `Role_Name = job_title` or fallback to `"Receptionist"`.
- **Atomic Transaction Workflow**:
  ```js
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Resolve Role_ID
    const [roleRows] = await conn.query('SELECT Role_ID FROM Role WHERE Role_Name = ?', [roleName]);
    const roleId = roleRows[0].Role_ID;

    // 2. Generate unique username (firstname.lastname pattern)
    let baseUsername = `${first_name.toLowerCase()}.${last_name.toLowerCase()}`.replace(/[^a-z0-9.]/g, '');
    let username = baseUsername;
    let suffix = 1;
    while (true) {
      const [existing] = await conn.query('SELECT User_ID FROM App_User WHERE Username = ?', [username]);
      if (!existing.length) break;
      username = `${baseUsername}${suffix++}`;
    }

    // 3. Hash default password
    const passwordHash = bcrypt.hashSync('admin123', 10);

    // 4. Insert App_User
    const [userRes] = await conn.query(
      `INSERT INTO App_User (Role_ID, Username, Password_Hash, Full_Name, Email, Phone) VALUES (?, ?, ?, ?, ?, ?)`,
      [roleId, username, passwordHash, `${first_name} ${last_name}`, email, phone]
    );
    const userId = userRes.insertId;

    // 5. Insert Employee
    const [empRes] = await conn.query(
      `INSERT INTO Employee (User_ID, Dept_ID, First_Name, Last_Name, Gender, Date_Of_Birth, Job_Title, Phone, Email, Salary, Hire_Date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, dept_id, first_name, last_name, gender || 'Male', date_of_birth || '1990-01-01', job_title, phone, email, salary || 0.00, hire_date || new Date().toISOString().split('T')[0]]
    );

    await conn.commit();
    res.status(201).json({
      success: true,
      id: empRes.insertId,
      user_id: userId,
      message: 'Employee added successfully and login account provisioned',
      credentials: { username, password: 'admin123' }
    });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ success: false, message: err.message });
  } finally {
    conn.release();
  }
  ```

#### 4. `PUT /api/employees/:id`
- **Access**: Admin only (`authenticate`, `adminOr()`).
- **Workflow**: Updates `Employee` table. If linked `User_ID` exists, updates `App_User` full name, email, phone as well.

#### 5. `DELETE /api/employees/:id`
- **Access**: Admin only (`authenticate`, `adminOr()`).
- **Workflow**:
  ```js
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [emp] = await conn.query('SELECT User_ID FROM Employee WHERE Emp_ID = ?', [req.params.id]);
    if (!emp.length) {
      await conn.rollback(); conn.release();
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }
    const userId = emp[0].User_ID;
    await conn.query('DELETE FROM Employee WHERE Emp_ID = ?', [req.params.id]);
    if (userId) {
      await conn.query('DELETE FROM App_User WHERE User_ID = ?', [userId]);
    }
    await conn.commit();
    res.json({ success: true, message: 'Employee and login account deleted' });
  } catch (err) {
    await conn.rollback();
    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      res.status(409).json({ success: false, message: 'Cannot delete employee referenced in other records' });
    } else {
      res.status(500).json({ success: false, message: err.message });
    }
  } finally {
    conn.release();
  }
  ```

---

## 6. Verification & Test Suite Plan

1. **Powershell API Test Suite (`test_api.ps1`)**:
   - Add `GET /api/employees` to endpoints test array.
   - Add POST employee creation test and DELETE employee deletion test.
2. **Powershell Role-Based Access Suite (`test_roles.ps1`)**:
   - Add Admin test: `GET $base/employees`.
   - Add non-Admin tests (Doctor, Receptionist, Lab Tech, Pharmacist, Accountant) attempting `POST $base/employees`, verifying `403 Access Denied`.
3. **Execution**: Both scripts must execute and pass with 100% success rate (`RESULTS: XX PASS | 0 FAIL`).

---
