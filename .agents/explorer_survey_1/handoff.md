# Staff & Employee Management — Backend Survey & Implementation Mapping

## 1. Observation

### Backend Codebase Architecture & File Locations
- **Server Entry Point**: `backend/server.js`
  - Express server running on port `5000` (line 68).
  - Routes mounted at `/api/employees` -> `./routes/employees.js` (line 25), `/api/auth` -> `./routes/auth.js` (line 21), `/api/doctors` -> `./routes/doctors.js` (line 24).
  - Global error handler catches MySQL errors (`ER_DUP_ENTRY`, `ER_ROW_IS_REFERENCED_2`, `ER_BAD_NULL_ERROR`) on lines 48–65.
- **Database Connection**: `backend/db.js`
  - MySQL 8.0 connection pool using `mysql2/promise` (lines 7–18) targeting database `Hospital_Management_System`.
- **Authentication & Authorization Middleware**: `backend/middleware/auth.js`
  - Defines `ROLES` object (lines 6–13):
    ```javascript
    const ROLES = {
      ADMIN:        'Hospital_Admin',
      DOCTOR:       'Doctor',
      RECEPTIONIST: 'Receptionist',
      LAB_TECH:     'Lab_Technician',
      PHARMACIST:   'Pharmacist',
      ACCOUNTANT:   'Accountant',
    };
    ```
  - `authenticate` middleware verifies JWT bearer tokens (lines 16–26).
  - `adminOr(...roles)` middleware enforces Admin (`Hospital_Admin`) or specified role access (lines 36–40).
- **Employee Route Handler**: `backend/routes/employees.js`
  - Enforces `authenticate` and `adminOr()` on all endpoints (`router.use(authenticate, adminOr())` on line 25).
  - Helper `mapJobTitleToRoleName(jobTitle)` (lines 13–22):
    ```javascript
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
    ```
  - `GET /api/employees` (lines 57–118): Lists employees with JOINs on `Department`, `App_User`, and `Role`.
  - `GET /api/employees/:id` (lines 124–147): Fetches employee details by `Emp_ID`.
  - `POST /api/employees` (lines 153–249): Runs transaction (`conn.beginTransaction()`), maps `Role_ID`, generates username (`firstname.lastname`), hashes default password `'admin123'` using `bcrypt.hashSync('admin123', 10)`, inserts into `App_User` and `Employee`.
  - `PUT /api/employees/:id` (lines 255–333): Updates `Employee` table and syncs `App_User` (Full_Name, Email, Phone, Role_ID, Is_Active). Does **not** currently handle password updates.
  - `DELETE /api/employees/:id` (lines 339–377): Deletes `Employee` row first, then linked `App_User` row inside a transaction.

### Database Schema & Foreign Keys (`Hospital_Management_System.sql`)
- **`Role` Table** (lines 28–38):
  - Primary Key: `Role_ID`
  - Unique Constraint: `Role_Name`
  - Seed values (lines 1145–1151):
    - `1`: `Hospital_Admin`
    - `2`: `Receptionist`
    - `3`: `Doctor`
    - `4`: `Lab_Technician`
    - `5`: `Pharmacist`
    - `6`: `Accountant`
- **`App_User` Table** (lines 44–62):
  - Primary Key: `User_ID`
  - Foreign Key: `fk_user_role` -> `Role(Role_ID)` (`ON DELETE RESTRICT ON UPDATE CASCADE`)
  - Columns: `User_ID`, `Role_ID`, `Username`, `Password_Hash`, `Full_Name`, `Email`, `Phone`, `Is_Active`
- **`Employee` Table** (lines 140–163):
  - Primary Key: `Emp_ID`
  - Foreign Key: `fk_emp_dept` -> `Department(Dept_ID)` (`ON DELETE RESTRICT ON UPDATE CASCADE`)
  - Foreign Key: `fk_emp_user` -> `App_User(User_ID)` (`ON DELETE SET NULL ON UPDATE CASCADE`)
  - Columns: `Emp_ID`, `User_ID`, `Dept_ID` (`NOT NULL`), `First_Name`, `Last_Name`, `Gender`, `Date_Of_Birth`, `Job_Title`, `Phone`, `Email`, `Salary`, `Hire_Date`, `Is_Active`
- **Other Foreign Key Dependencies on `Employee(Emp_ID)`**:
  - `Lab_Result.Performed_By` -> `Employee(Emp_ID)` (`ON DELETE SET NULL ON UPDATE CASCADE`, line 448)
  - `Payment.Received_By` -> `Employee(Emp_ID)` (`ON DELETE SET NULL ON UPDATE CASCADE`, line 500)
- **Other Foreign Key Dependencies on `App_User(User_ID)`**:
  - `Employee.User_ID` -> `App_User(User_ID)` (`ON DELETE SET NULL ON UPDATE CASCADE`, line 159)
  - `Doctor.User_ID` -> `App_User(User_ID)` (`ON DELETE SET NULL ON UPDATE CASCADE`, line 125)
  - `Patient.User_ID` -> `App_User(User_ID)` (`ON DELETE SET NULL ON UPDATE CASCADE`, line 189)

---

## 2. Logic Chain

1. **Custom Password Management in `PUT /api/employees/:id` (Requirement R2)**:
   - **Observation**: Lines 255–333 of `backend/routes/employees.js` update `Employee` and `App_User`, but `Password_Hash` is not included in the `App_User` update.
   - **Step**: Extract `password` (or `new_password`) from `req.body`.
   - **Step**: Check if `password && password.trim() !== ''`. If true, compute hash using `bcrypt.hashSync(password.trim(), 10)`.
   - **Step**: Conditionally update `App_User`:
     - If password is provided: `UPDATE App_User SET Full_Name = ?, Email = ?, Phone = ?, Role_ID = ?, Is_Active = ?, Password_Hash = ? WHERE User_ID = ?`
     - If password is omitted/empty: keep current UPDATE statement (preserving existing `Password_Hash`).

2. **Self-Deletion Lockout Prevention in `DELETE /api/employees/:id` (Requirement R1)**:
   - **Observation**: `DELETE /api/employees/:id` currently allows deleting any `Emp_ID`. If an Admin deletes their own employee record or logged-in account, they lose access.
   - **Step**: In `DELETE /api/employees/:id`, check if `req.user.employeeId === parseInt(empId)` or `userId === req.user.id`.
   - **Step**: If matching, return HTTP 400 Bad Request with message `"Cannot delete your currently logged-in account"`.

3. **Cascading Deletion Behavior for Employee & App_User**:
   - **Observation**: Database schema defines `ON DELETE SET NULL` for `Lab_Result(Performed_By)`, `Payment(Received_By)`, and `Employee(User_ID)`.
   - **Step**: When deleting an employee, deleting `Employee` first removes `Employee` row (setting `Performed_By` and `Received_By` to `NULL` in child tables).
   - **Step**: Deleting `App_User` second removes the user login row without FK violation.
   - **Conclusion**: The current transaction order (`DELETE FROM Employee` then `DELETE FROM App_User`) is completely safe against foreign key errors.

4. **Role Provisioning for Admin Accounts (Requirement R3)**:
   - **Observation**: Seed data maps `Role_ID = 1` to `Role_Name = 'Hospital_Admin'`. `mapJobTitleToRoleName('Admin')` returns `ROLES.ADMIN` (`'Hospital_Admin'`).
   - **Step**: Verify `POST /api/employees` and `PUT /api/employees/:id` correctly map job titles containing `'Admin'` or `'Hospital_Admin'` to `Role_ID = 1`.
   - **Step**: Ensure newly created Admin users can log in via `/api/auth/login` and obtain full Admin privileges (`req.user.role === 'Hospital_Admin'`).

5. **Department Field Schema Handling for Non-Doctors (Requirement R4)**:
   - **Observation**: `Employee.Dept_ID` in MySQL is defined as `INT UNSIGNED NOT NULL`. In frontend R4, non-doctor roles will hide Department and submit `null` or omit `dept_id`.
   - **Step**: In `POST /api/employees` and `PUT /api/employees/:id`, if `dept_id` is `null`, `undefined`, or empty string, default `dept_id` to department `1` (General / Administration) in backend query parameters (`parseInt(dept_id) || 1`) so MySQL `NOT NULL` constraint is satisfied.

---

## 3. Caveats

- **Frontend Scope**: This survey covers backend API routes (`server.js`, `routes/employees.js`, `auth.js`, `middleware/auth.js`) and database schema (`Hospital_Management_System.sql`). Frontend component changes (in `frontend/js/app.js` or UI templates) are being analyzed separately.
- **`Dept_ID` SQL Constraint**: `Employee.Dept_ID` is `NOT NULL` in the database schema. A fallback default (`dept_id || 1`) is required in backend controller endpoints when frontend sends `null` for non-doctor roles.
- **Admin Lockout Protection**: The logged-in Admin user ID check must compare both `req.user.employeeId` (for Employee record ID) and `req.user.id` (for `App_User` User_ID) to guarantee no accidental Admin self-deletion.

---

## 4. Conclusion

The existing backend architecture cleanly supports the required Staff & Employee Management enhancements. The specific backend modifications required are:

1. **`PUT /api/employees/:id`**:
   - Add bcrypt password hashing logic when `req.body.password` is provided.
   - Fallback `dept_id` to `1` when `null` or omitted for non-doctor roles.
   - Support Admin job title to `Role_ID = 1` mapping.
2. **`DELETE /api/employees/:id`**:
   - Add self-deletion validation check (`empId == req.user.employeeId` or `userId == req.user.id`) returning HTTP 400.
   - Retain two-step transaction (`DELETE FROM Employee` followed by `DELETE FROM App_User`).
3. **`POST /api/employees`**:
   - Fallback `dept_id` to `1` when `null` or omitted for non-doctor roles.
   - Confirm Admin role mapping provisions `App_User` with `Role_ID = 1`.

---

## 5. Verification Method

To verify these backend implementation requirements independently:

1. **API Test Suite Execution**:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\test_api.ps1
   powershell -ExecutionPolicy Bypass -File .\test_roles.ps1
   ```
2. **Custom Password Update & Login Verification**:
   - Send `PUT /api/employees/<id>` with body `{"password": "newsecretpassword123", ...}` using Admin bearer token.
   - Verify response returns `200 OK` with `{ "success": true }`.
   - Send `POST /api/auth/login` with body `{"username": "<employee_username>", "password": "newsecretpassword123"}`.
   - Verify response returns `200 OK` with valid JWT token.
3. **Self-Deletion Prevention Verification**:
   - Send `DELETE /api/employees/<admin_employee_id>` using Admin bearer token.
   - Verify response returns `400 Bad Request` preventing self-deletion.
