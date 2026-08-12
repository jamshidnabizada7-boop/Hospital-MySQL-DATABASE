# Project Specification: Hospital Management System — Staff & Employee Management Enhancement

## Architecture
- **Backend Stack**: Node.js (Express 5.2.1), MySQL 8.0 (`mysql2/promise` pool), `bcryptjs`, JWT authentication middleware.
- **Frontend Stack**: Native JavaScript single-page application (`frontend/index.html`, `frontend/js/staff.js`, `frontend/js/app.js`, `frontend/js/auth.js`, `frontend/js/api.js`).
- **Data Model**:
  - `App_User`: `User_ID`, `Role_ID` (FK -> `Role`), `Username`, `Password_Hash`, `Full_Name`, `Email`, `Phone`.
  - `Employee`: `Emp_ID`, `User_ID` (FK -> `App_User`), `Dept_ID` (FK -> `Department`, MUST BE NULLABLE), `First_Name`, `Last_Name`, `Gender`, `Date_Of_Birth`, `Job_Title`, `Phone`, `Email`, `Salary`.
  - `Role`: `Role_ID = 1` (`Hospital_Admin`), `Role_ID = 2` (`Receptionist`), `Role_ID = 3` (`Doctor`), `Role_ID = 4` (`Lab_Technician`), `Role_ID = 5` (`Pharmacist`), `Role_ID = 6` (`Accountant`).

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | DB Schema Nullability | Run `ALTER TABLE Employee MODIFY Dept_ID INT UNSIGNED NULL;` and update `Hospital_Management_System.sql` | M1 | R4 / DB Survey |
| 2 | Backend Custom Password Update | Update `PUT /api/employees/:id` to hash and save optional custom password in `App_User` | M1 | R2 / Backend Survey |
| 3 | Backend Admin Provisioning | Update `POST /api/employees` to map "Admin" / "Hospital_Admin" role to `Role_ID = 1` | M1 | R3 / Backend Survey |
| 4 | Backend Lockout Protection & Delete | Add check in `DELETE /api/employees/:id` blocking self-deletion of active logged-in admin | M1 | R1 / Backend Survey |
| 5 | UI Edit & Delete Permission Flags | Update `frontend/js/app.js` `window.CAN` to include `editStaff` and `deleteStaff` for Admins | M2 | R1 / Frontend Survey |
| 6 | UI Role Dropdown Admin Option | Add `<option value="Hospital_Admin">Admin</option>` to `#staff-role-select` in `index.html` | M2 | R3 / Frontend Survey |
| 7 | UI Edit Password Field | Add optional "New Password" text input field to `#staff-form` modal in `index.html` | M2 | R2 / Frontend Survey |
| 8 | UI Department Dynamic Display | Show and require Department dropdown ONLY for Doctor role; hide and set `null` for non-doctors | M2 | R4 / Frontend Survey |
| 9 | UI Lockout & Dispatch Logic | Hide Delete button on active logged-in admin row; wire `PUT` & `DELETE` API dispatches in `staff.js` | M2 | R1 / Frontend Survey |
| 10| REST API & Role Tests | Update `test_api.ps1` and `test_roles.ps1` to cover R1-R4 requirement endpoints and RBAC | M3 | Testing Survey |
| 11| E2E Browser Automation | Update `test_e2e.js` to automate complete end-to-end admin staff management lifecycle | M4 | Testing Survey |

## Code Layout
- `backend/routes/employees.js`: Backend REST endpoints for `/api/employees` (POST, PUT, DELETE, GET).
- `Hospital_Management_System.sql`: Database schema definition file.
- `frontend/index.html`: Main HTML template containing `#staff-modal` and form elements.
- `frontend/js/app.js`: Global application configuration and permission definitions (`window.CAN`).
- `frontend/js/staff.js`: Staff management UI controller (`Staff` object methods: `render`, `onRoleChange`, `openEdit`, `save`, `delete`).
- `test_api.ps1`: PowerShell API test suite.
- `test_roles.ps1`: PowerShell RBAC test suite.
- `test_e2e.js`: Puppeteer E2E test script.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | DB Migration & Backend Core | DB schema alteration, `POST`, `PUT`, `DELETE /api/employees/:id` endpoints | none | DONE |
| M2 | Frontend UI & Modal Enhancements | UI permissions, Admin role option, Edit password input, dynamic Department visibility, self-delete guard | M1 | DONE |
| M3 | API & RBAC Test Expansion | Update `test_api.ps1` and `test_roles.ps1` for R1-R4 verification | M1, M2 | DONE |
| M4 | E2E Browser Test & Final Verification | Update `test_e2e.js` and execute full suite validation | M1, M2, M3 | PLANNED |

## Interface Contracts

### 1. `POST /api/employees`
- **Request Body**:
  `{ first_name, last_name, gender, date_of_birth, job_title, phone, email, dept_id, salary }`
- **Behavior**:
  - If `job_title` contains `"Admin"` or `"Hospital_Admin"`, resolve `Role_ID = 1`.
  - If `job_title !== 'Doctor'`, `dept_id` can be `null` or omitted (inserted as `NULL` in `Employee.Dept_ID`).
  - Automatically provisions `App_User` with username `firstname.lastname` and default password `admin123` (bcrypt hashed).

### 2. `PUT /api/employees/:id`
- **Request Body**:
  `{ first_name, last_name, gender, date_of_birth, job_title, phone, email, dept_id, salary, password (optional) }`
- **Behavior**:
  - Updates `Employee` row fields.
  - If `password` is provided and non-empty, updates `App_User.Password_Hash` with `bcrypt.hashSync(password, 10)`.
  - If `job_title !== 'Doctor'`, sets `Dept_ID = null`.

### 3. `DELETE /api/employees/:id`
- **Behavior**:
  - Checks if target `Employee.User_ID` matches logged-in user `req.user.user_id` (or `req.user.id`). If match, rejects with `400 Bad Request`.
  - Deletes `Employee` and linked `App_User` in a database transaction.
