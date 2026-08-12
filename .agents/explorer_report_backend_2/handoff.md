# Technical Findings Report: Node.js / Express Backend Architecture

## 1. Observation

### Codebase Structure & File Inventory
The backend is implemented as a Node.js Express application located in `backend/` (`d:\Hospital MYSQL Databse\backend`).

Key entry points and source files:
- **Core App & Entry Point**: `backend/server.js` (76 lines) — Express app initialization, global middleware, static file serving, route mounting, health check, SPA fallback, global error handler.
- **Database Connection Pool**: `backend/db.js` (31 lines) — `mysql2/promise` connection pool setup.
- **Environment Configuration**: `backend/.env` (10 lines) — Database credentials, JWT secret, server port.
- **Authentication & Security Middleware**: `backend/middleware/auth.js` (43 lines) — JWT verification, role authorization guards (`authorize`, `adminOr`), role definition constants (`ROLES`).
- **Dependency Specification**: `backend/package.json` (24 lines) — Express 5.2.1, mysql2 3.23.2, jsonwebtoken 9.0.3, bcryptjs 3.0.3, cors 2.8.6, dotenv 17.4.2, express-validator 7.3.2.
- **Route Handlers** (`backend/routes/`):
  1. `auth.js` (107 lines) — Authentication routes (`/login`, `/me`).
  2. `dashboard.js` (77 lines) — Summary analytics & dashboard metrics (`/stats`).
  3. `patients.js` (134 lines) — Patient registration, directory, update, deactivation, medical history.
  4. `doctors.js` (277 lines) — Doctor profile management, auto-user provisioning, schedule creation, slot generation, availability checks.
  5. `employees.js` (424 lines) — Staff management, transactional user account auto-provisioning, role mapping, account lockout protection.
  6. `appointments.js` (185 lines) — Slot reservation, booking, cancellation, completion, pessimistic locking (`FOR UPDATE`).
  7. `billing.js` (155 lines) — Invoice generation, payment processing, partial/full status recalculations.
  8. `pharmacy.js` (218 lines) — Medicine catalog, inventory stock tracking, pharmacy locations, stock adjustments, medicine categories.
  9. `laboratory.js` (193 lines) — Lab test ordering, status tracking, test result entry/updating, lab test catalog.
  10. `medical.js` (123 lines) — Medical record updates, multi-item prescription creation, patient history listing.
  11. `reports.js` (157 lines) — Revenue analytics, department breakdown, appointment completion rates, low stock/expiring inventory, lab test performance.
  12. `notifications.js` (101 lines) — Parallel aggregation (`Promise.all`) of pending bills, abnormal lab results, low stock alerts, and upcoming follow-ups.

---

## 2. Logic Chain

### A. Architectural Topology & Server Lifecycle
1. **Module System**: The backend uses CommonJS (`"type": "commonjs"` in `package.json`).
2. **Environment Hydration**: Environment variables are loaded via `dotenv.config({ path: path.join(__dirname, '.env') })` at the top of `server.js`.
3. **HTTP Server Initialization**: Express initializes on `process.env.PORT || 5000`.
4. **Middleware Execution Order**:
   - `cors({ origin: '*', methods: ['GET','POST','PUT','DELETE','OPTIONS'] })` enables cross-origin requests.
   - `express.json({ limit: '5mb' })` parses JSON payloads up to 5MB.
   - `express.urlencoded({ extended: true })` handles form-encoded payloads.
   - `express.static(path.join(__dirname, '..', 'frontend'))` serves static web assets.
   - `/api/*` routes are mounted on dedicated sub-routers.
   - SPA route catch-all `app.get('/{*path}', ...)` delegates non-API routes to `frontend/index.html`.
   - Centralized error-handling middleware intercepts uncaught route errors.

### B. Database Integration Patterns
1. **Connection Pool Management** (`db.js`):
   - Built on `mysql2/promise` with pool configuration: `connectionLimit: 20`, `waitForConnections: true`, `queueLimit: 0`, `timezone: '+00:00'`, `decimalNumbers: true`.
   - `decimalNumbers: true` ensures MySQL `DECIMAL` types (such as `Consultation_Fee`, `Total_Amount`, `Salary`, `Unit_Price`) are parsed directly into JS floats instead of strings.
2. **SQL Injection Defense**:
   - All database queries utilize parameterized SQL statements (`?` placeholders), completely insulating queries from SQL injection attacks.
3. **Transaction Control & Concurrency**:
   - Explicit transactions (`conn.beginTransaction()`, `conn.commit()`, `conn.rollback()`, `conn.release()`) are implemented across multi-step mutations:
     - `POST /api/doctors`: Synchronously creates an `App_User` credentials account and links it to a new `Doctor` record.
     - `POST /api/employees`: Synchronously maps job titles to system roles, generates unique usernames (`firstname.lastname` with incremental integer suffixing), hashes passwords, creates an `App_User` account, and inserts the `Employee` record.
     - `PUT /api/employees/:id`: Synchronously updates `Employee` and linked `App_User` data and handles optional password updates.
     - `DELETE /api/employees/:id`: Atomic deletion of `Employee` and associated `App_User` account.
     - `POST /api/appointments`: Implements pessimistic concurrency control via `SELECT Status FROM Appointment_Slot WHERE Slot_ID=? FOR UPDATE` to lock slot rows and prevent race conditions during double-booking.
     - `PUT /api/appointments/:id/cancel` & `PUT /api/appointments/:id/complete`: Row-level locking (`FOR UPDATE`) during state transition between appointment and appointment slot.
     - `POST /api/billing/generate` & `POST /api/billing/:id/payment`: Row-level locking on bill records to calculate accurate cumulative payment balances and auto-update `Bill_Status` (`Pending` -> `Partial` -> `Paid`).
     - `POST /api/doctors/:id/schedule`: Atomic creation of schedule records and bulk slot insertion (`INSERT INTO Appointment_Slot(...) VALUES ?`).
     - `POST /api/medical/prescriptions`: Transactional creation of master `Prescription` record and child `Prescription_Item` records.
     - `PUT /api/pharmacy/inventory/:id/stock`: Pessimistic locking (`FOR UPDATE`) for atomic stock balance increment/decrement with non-negative stock safety checks (`newQty < 0` rollback).

### C. Security & Access Control Mechanics
1. **Authentication Paradigm** (`middleware/auth.js`):
   - Stateless JWT authentication using standard HTTP headers: `Authorization: Bearer <token>`.
   - Secret key defined via `process.env.JWT_SECRET` (default: `HMS_SuperSecret_Key_2026_Change_In_Production`).
   - Token expiration set to `8h` via `process.env.JWT_EXPIRES_IN`.
   - Decoded JWT payload is attached to `req.user`, carrying: `{ id, username, role, name, doctorId, employeeId }`.
2. **Password Hashing**:
   - `bcryptjs` with salt round cost factor `10` (`bcrypt.hashSync(password, 10)`).
   - Password verification via `bcrypt.compare(password, user.Password_Hash)`.
3. **Role-Based Access Control (RBAC)**:
   - System roles defined in `ROLES`: `Hospital_Admin`, `Doctor`, `Receptionist`, `Lab_Technician`, `Pharmacist`, `Accountant`.
   - Helper guards:
     - `authorize(...roles)`: Restricts endpoints to explicit matching roles.
     - `adminOr(...roles)`: Bypasses check if `req.user.role === ROLES.ADMIN`, otherwise checks matching roles.
4. **Data Ownership & Granular Authorization Guards**:
   - **Doctor Data Isolation**:
     - `routes/appointments.js`: Doctor can only see, detail, and complete appointments where `ds.Doctor_ID === req.user.doctorId`.
     - `routes/medical.js`: `doctorOwnsAppointment` helper verifies doctor ownership of appointment before allowing prescription creation or medical record updates.
     - `routes/laboratory.js`: Doctor can only order lab tests or cancel pending lab orders for their own patients.
     - `routes/doctors.js`: Doctor can view schedule and update profile info for their own `Doctor_ID` only.
     - `routes/billing.js`: Doctor can view bills only for their own patients.
   - **Account Lockout & Self-Deletion Protection**:
     - `routes/employees.js` (`DELETE /api/employees/:id`): Compares `req.user.id` / `req.user.employeeId` against target record, blocking administrators from accidentally deleting their active logged-in account.

### D. Error Handling & Exception Management
1. **Global Error Handler** (`server.js` lines 48–65):
   - Intercepts unhandled synchronous and asynchronous middleware errors passed to `next(err)`.
   - Maps raw MySQL database error codes into user-friendly diagnostic messages:
     - `ER_DUP_ENTRY` -> "A record with this value already exists."
     - `ER_NO_REFERENCED_ROW_2` -> "Referenced record not found. Check the ID you entered."
     - `ER_ROW_IS_REFERENCED_2` -> "Cannot delete — this record is used by other data."
     - `ER_DATA_TOO_LONG` -> "One of the values you entered is too long."
     - `ER_BAD_NULL_ERROR` -> "A required field is missing."
     - `ER_TRUNCATED_WRONG_VALUE` -> "Invalid value entered in one of the fields."
   - Unrecognized errors fall back to HTTP status `500` with generic text `"An unexpected error occurred. Please try again."`.
2. **Route-Level Try/Catch Blocks**:
   - Every async route handler is wrapped in `try/catch` blocks returning standard JSON error response signatures `{ success: false, message: err.message }`.

---

## 3. Caveats

- **No Active Code Changes Made**: This analysis is strictly read-only; no code files in `backend/` were altered.
- **ORM / Query Builder**: The backend uses raw SQL strings with `mysql2/promise` rather than an ORM (like Prisma or Sequelize). SQL query syntax must strictly adhere to MySQL 8.0 dialects.
- **Password Migration Utility**: `backend/fix_passwords.js` exists in the backend root directory as a maintenance script for resetting test user passwords.

---

## 4. Conclusion

The Node.js / Express backend provides a robust RESTful API featuring:
- **Clean modular structure** separating routing, authentication middleware, and database connectivity.
- **High-security RBAC model** combining JWT authentication, bcrypt password hashing, role guards, and resource ownership validation.
- **Transactional integrity and concurrency control** using `mysql2` connection pools, explicit SQL transactions, and pessimistic row locking (`FOR UPDATE`).
- **Comprehensive domain coverage** covering Patients, Doctors, Staff Employees, Appointments & Slots, Medical Records, Prescriptions, Laboratory Tests & Results, Pharmacy & Stock Management, Billing & Payments, and Reporting & Notifications.

---

## 5. Verification Method

To independently verify the backend functionality and architecture:
1. **Verify Dependencies & Config**: Inspect `backend/package.json` and `backend/.env`.
2. **Execute Diagnostic Scripts**: Run `powershell -ExecutionPolicy Bypass -File .\test_roles.ps1` or `.\test_api.ps1` from root workspace directory to verify route response formats, authentication tokens, and role enforcement.
3. **Inspect Routes**: Verify route structure in `backend/routes/*.js` against standard Express 5 router specs.
