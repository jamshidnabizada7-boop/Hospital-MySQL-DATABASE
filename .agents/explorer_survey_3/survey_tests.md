# Survey Report: Test Suite & Security Verification Analysis

**Project**: Hospital Management System — Staff Management & Auto-Provisioning  
**Explorer Agent**: Survey Explorer 3  
**Date**: 2026-08-12  
**Target Root**: `d:\Hospital MYSQL Databse`  

---

## 1. Executive Summary

This report presents a thorough investigation of the existing test suite and security verification framework for the Hospital Management System (HMS), specifically examining how to extend the test coverage to validate **R1 (Backend Auto-Provisioning for Employees)** and **R2 (Centralized Staff UI)** as mandated by `ORIGINAL_REQUEST.md`.

Currently, the test suite consists of two core PowerShell scripts:
1. `test_roles.ps1`: Role-Based Access Control (RBAC) security matrix suite (41 assertions passing).
2. `test_api.ps1`: Functional API endpoint and CRUD integration suite (44 assertions passing).

Both suites execute synchronously against the live Node.js / Express backend at `http://localhost:5000/api`. To meet the project's acceptance criteria, both scripts must be updated to validate `/api/employees`, verify Admin-only access restrictions across all 6 roles, test employee creation with automatic `App_User` account provisioning, test auto-provisioned login, and test employee deletion/cleanup. In addition, end-to-end (E2E) browser automation requirements have been specified for UI validation.

---

## 2. Analysis of Existing Test Infrastructure

### 2.1 Test Environment & Architecture
- **Server**: Express.js on Node.js running at `http://localhost:5000`.
- **Database**: MySQL 8.0 (`Hospital_Management_System.sql`).
- **Auth System**: JWT tokens signed with `JWT_SECRET`, transmitted via HTTP `Authorization: Bearer <token>` header.
- **Roles in System**:
  1. `Hospital_Admin` (Role_ID 1, e.g. `admin`)
  2. `Receptionist` (Role_ID 2, e.g. `receptionist1`)
  3. `Doctor` (Role_ID 3, e.g. `dr_kamal`)
  4. `Lab_Technician` (Role_ID 4, e.g. `labtech1`)
  5. `Pharmacist` (Role_ID 5, e.g. `pharmacist1`)
  6. `Accountant` (Role_ID 6, e.g. `accountant1`)

### 2.2 Documentation Reference
- `TEST_INFRA.md`: Defines 4-Tier testing methodology (Feature Coverage, Boundary & Edge Cases, Pairwise Combinations, Real-World Workloads).
- `TEST_READY.md`: Documents total planned test count (95 assertions across 8 modules).

---

## 3. Detailed Analysis of `test_roles.ps1` (RBAC Security Suite)

### 3.1 Structure & Mechanism
`test_roles.ps1` tests role authorization by issuing HTTP requests using Bearer tokens for each of the 6 roles and asserting whether the endpoint returns `200 OK` (for authorized roles) or `403 Forbidden` (for unauthorized roles).

- **Authentication Helper** (`lines 3-8`):
  ```powershell
  function Login($user) {
      $r = Invoke-RestMethod -Uri "$base/auth/login" -Method POST `
           -Body "{\"username\":\"$user\",\"password\":\"admin123\"}" `
           -ContentType "application/json"
      return @{ h = @{Authorization="Bearer $($r.token)"}; role=$r.user.role; name=$r.user.name; doctorId=$r.user.doctorId }
  }
  ```
- **Assertion Helper** (`lines 10-24`):
  ```powershell
  function Test($label, $method, $url, $h, $body=$null, $expectCode=200) {
      try {
          $opts = @{ Uri=$url; Method=$method; Headers=$h; UseBasicParsing=$true; ErrorAction="Stop" }
          if ($body) { $opts.Body=$body; $opts.ContentType="application/json" }
          $r = Invoke-WebRequest @opts
          $ok = $r.StatusCode -eq $expectCode
          Write-Host "$(if($ok){'PASS'}else{'WARN'})  [$($r.StatusCode)] $label"
          return $r.StatusCode
      } catch {
          $code = $_.Exception.Response.StatusCode.value__
          $expected = $code -eq $expectCode
          Write-Host "$(if($expected){'PASS'}else{'FAIL'})  [$code] $label"
          return $code
      }
  }
  ```

### 3.2 Existing Coverage Matrix
| Role | User Tested | Allowed Endpoints (200) | Denied Endpoints (403) |
|---|---|---|---|
| Admin | `admin` | patients, doctors, appointments, billing, pharmacy/inv, lab/orders, reports/revenue | None |
| Doctor | `dr_kamal` | own appts, patients (read), medicines, lab orders, billing | reports, add patient, book appt, process pay, add medicine, add lab result |
| Receptionist | `receptionist1` | patients, appointments, doctors | reports, process pay, add medicine, lab result |
| Lab Technician | `labtech1` | lab orders, patients | add patient, book appt, billing, medicines write, reports |
| Pharmacist | `pharmacist1` | medicines, inventory, locations | patients, appointments, billing, lab orders, reports |
| Accountant | `accountant1` | billing, patients (read), reports | add patient, book appt, medicines, lab result |

### 3.3 Required Updates for `/api/employees`
`/api/employees` is strictly an **Admin-only** route (only users with role `Hospital_Admin` are permitted to view or manage staff records).

To update `test_roles.ps1`:
1. **Admin Section** (around line 40):
   ```powershell
   Test "Admin: GET employees" GET "$base/employees?limit=3" $admin.h
   ```
2. **Doctor Section** (around line 55):
   ```powershell
   Test "Doctor: DENIED employees" GET "$base/employees?limit=3" $doctor.h $null 403
   Test "Doctor: DENIED add employee" POST "$base/employees" $doctor.h '{"first_name":"Test","last_name":"Emp","job_title":"Receptionist"}' 403
   ```
3. **Receptionist Section** (around line 66):
   ```powershell
   Test "Recep: DENIED employees" GET "$base/employees?limit=3" $recep.h $null 403
   Test "Recep: DENIED add employee" POST "$base/employees" $recep.h '{"first_name":"Test","last_name":"Emp","job_title":"Receptionist"}' 403
   ```
4. **Lab Technician Section** (around line 77):
   ```powershell
   Test "LabTech: DENIED employees" GET "$base/employees?limit=3" $lab.h $null 403
   ```
5. **Pharmacist Section** (around line 89):
   ```powershell
   Test "Pharm: DENIED employees" GET "$base/employees?limit=3" $pharm.h $null 403
   ```
6. **Accountant Section** (around line 100):
   ```powershell
   Test "Acct: DENIED employees" GET "$base/employees?limit=3" $acct.h $null 403
   ```

---

## 4. Detailed Analysis of `test_api.ps1` (Functional & Integration Suite)

### 4.1 Structure & Mechanism
`test_api.ps1` authenticates as `admin`, loops through an endpoint registry array `$eps`, and executes `Invoke-WebRequest` for read operations. It then executes state-modifying POST/PUT/DELETE operations, checking returned JSON fields (e.g. `success`, `id`) and performing immediate cleanup.

### 4.2 Current Test Execution Flow
1. Authenticate `admin` -> receive JWT Bearer token.
2. 39 GET endpoints + 1 frontend HTML endpoint check (HTTP 200, valid payload format).
3. `POST /patients` -> verifies patient ID returned, calls `DELETE /patients/:id`.
4. `POST /pharmacy/categories` -> verifies category ID returned, calls `DELETE /pharmacy/categories/:id`.
5. `PUT /pharmacy/inventory/1/stock` -> verifies stock update, reverts quantity change.
6. `POST /lab/orders` & `POST /lab/orders/:id/results` -> verifies order creation and result attachment.

### 4.3 Required Updates for `/api/employees`
To fulfill Acceptance Criteria #2:
1. **Endpoint List Addition**:
   Add `@{n="EMPLOYEES_LIST"; u="employees?limit=5"}` to `$eps` array.

2. **POST / PUT / DELETE CRUD Block Addition**:
   Add a complete, robust test block in `test_api.ps1` that performs:
   - **Step A: Create Employee & Auto-Provision User (`POST /api/employees`)**
     ```powershell
     # Test POST /employees (create employee + auto-provision user)
     try {
       $empBody = '{"first_name":"AutoTest","last_name":"Receptionist","gender":"Female","date_of_birth":"1995-03-20","job_title":"Receptionist","phone":"0771234567","email":"autotest.receptionist@hospital.com","dept_id":1,"salary":25000.00}'
       $rEmp = Invoke-RestMethod -Uri "$base/employees" -Method POST -Body $empBody -ContentType "application/json" -Headers $h
       if ($rEmp.success -and $rEmp.emp_id) {
         Write-Host "PASS  POST_EMPLOYEE           id=$($rEmp.emp_id) user=$($rEmp.username)"
         $pass++

         # Step B: Verify Auto-Provisioned User Login
         try {
           $loginBody = "{`"username`":`"$($rEmp.username)`",`"password`":`"admin123`"}"
           $rLogin = Invoke-RestMethod -Uri "$base/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
           if ($rLogin.token -and $rLogin.user.role -eq "Receptionist") {
             Write-Host "PASS  LOGIN_PROVISIONED_USER  user=$($rLogin.user.username) role=$($rLogin.user.role)"
             $pass++
           } else {
             Write-Host "FAIL  LOGIN_PROVISIONED_USER  invalid role or missing token"
             $fail++; $failures += "LOGIN_PROVISIONED_USER"
           }
         } catch {
           Write-Host "FAIL  LOGIN_PROVISIONED_USER  $($_.Exception.Message)"
           $fail++; $failures += "LOGIN_PROVISIONED_USER"
         }

         # Step C: Delete Employee & Clean Up (DELETE /employees/:id)
         try {
           $rDel = Invoke-RestMethod -Uri "$base/employees/$($rEmp.emp_id)" -Method DELETE -Headers $h
           if ($rDel.success) {
             Write-Host "PASS  DELETE_EMPLOYEE         id=$($rEmp.emp_id)"
             $pass++
           } else {
             Write-Host "FAIL  DELETE_EMPLOYEE         $($rDel.message)"
             $fail++; $failures += "DELETE_EMPLOYEE"
           }
         } catch {
           Write-Host "FAIL  DELETE_EMPLOYEE         $($_.Exception.Message)"
           $fail++; $failures += "DELETE_EMPLOYEE"
         }
       } else {
         Write-Host "FAIL  POST_EMPLOYEE           $($rEmp.message)"
         $fail++; $failures += "POST_EMPLOYEE"
       }
     } catch {
       Write-Host "FAIL  POST_EMPLOYEE           $($_.Exception.Message)"
       $fail++; $failures += "POST_EMPLOYEE"
     }
     ```

---

## 5. E2E Browser Automation Requirements

### 5.1 Verification Workflow
The autonomous browser agent (or Playwright/Puppeteer script) must execute the following sequence:

1. **Initial Admin Session**:
   - Navigate to `http://localhost:5000/`.
   - Confirm login screen (`#auth-screen`) is displayed.
   - Enter `#login-username` = `admin`, `#login-password` = `admin123`.
   - Click submit ("Sign In").
   - Confirm `#app` becomes visible and `#auth-screen` is hidden.

2. **Staff Tab Navigation & Staff Creation**:
   - Click sidebar nav item `Staff` (`.nav-item[data-page="employees"]` or `data-page="staff"`).
   - Verify topbar page title displays "Staff Management" or "Employees".
   - Click "Add Staff" / "Add Employee" button to open modal.
   - Fill form fields:
     - First Name: `Farhad`
     - Last Name: `Samadi`
     - Job Title / Role: `Receptionist`
     - Department: `Emergency` (or Dept ID 1)
     - Phone: `0799112233`
     - Email: `farhad.samadi@hospital.com`
     - Salary: `22000`
   - Click modal submit button.
   - Confirm success toast notification.
   - Confirm new employee `Farhad Samadi` appears in the staff table list.

3. **Logout**:
   - Click `#logout-btn` in sidebar.
   - Confirm redirected to `#auth-screen`.

4. **Auto-Provisioned User Login Verification**:
   - Enter `#login-username` = `farhad.samadi`
   - Enter `#login-password` = `admin123`
   - Click "Sign In".
   - Confirm login succeeds.
   - Inspect `#user-name` -> displays "Farhad Samadi".
   - Inspect `#user-role` -> displays "Receptionist".
   - Confirm sidebar navigation items are restricted according to Receptionist permissions (Patients, Appointments, Doctors visible; Staff, Reports hidden or absent).

---

## 6. Security, Transaction Integrity & Edge Cases

### 6.1 Transactional Integrity Requirement
When `POST /api/employees` is called:
- MySQL connection must start a transaction (`START TRANSACTION`).
- Step 1: Query `Role` table to find `Role_ID` matching `Job_Title` (e.g. `Receptionist` -> Role_ID 2).
- Step 2: Generate username `firstname.lastname` (lowercase). Check if username exists; if collision occurs, append digit or suffix.
- Step 3: Hash default password `admin123` using bcrypt (`bcrypt.hash("admin123", 10)`).
- Step 4: Insert record into `App_User` (`Role_ID`, `Username`, `Password_Hash`, `Full_Name`, `Email`, `Phone`). Get `insertId` as `user_id`.
- Step 5: Insert record into `Employee` (`User_ID`, `Dept_ID`, `First_Name`, `Last_Name`, `Gender`, `Date_Of_Birth`, `Job_Title`, `Phone`, `Email`, `Salary`, `Hire_Date`).
- Step 6: `COMMIT`.
- Rollback: If any SQL statement fails (e.g., duplicate email constraint `uq_emp_email`), execute `ROLLBACK` so neither `App_User` nor `Employee` record remains.

### 6.2 Security Boundaries
- Backend route handler `backend/routes/employees.js` must use `authenticate` and `authorize(ROLES.ADMIN)` middleware on ALL endpoints (GET, POST, PUT, DELETE).
- Unauthenticated requests must receive HTTP 401.
- Non-Admin authenticated requests must receive HTTP 403.

---

## 7. Action Plan for Implementation & Testing

1. **Backend Route Implementation**: Implement `backend/routes/employees.js` with full CRUD, SQL transactions for auto-provisioning, and Admin authorization. Mount at `/api/employees` in `backend/server.js`.
2. **Frontend UI Implementation**: Update `frontend/index.html` (sidebar tab + staff table section + add staff modal), `frontend/js/app.js` (route mapper + permissions), and add `frontend/js/employees.js`.
3. **PowerShell Test Script Updates**: Update `test_roles.ps1` and `test_api.ps1` as specified in Sections 3.3 and 4.3.
4. **Validation**: Run both scripts with `powershell -ExecutionPolicy Bypass -File test_roles.ps1` and `powershell -ExecutionPolicy Bypass -File test_api.ps1`, ensuring 100% pass rate with exit code 0.
5. **E2E UI Verification**: Execute browser flow to verify UI creation and auto-provisioned login.
