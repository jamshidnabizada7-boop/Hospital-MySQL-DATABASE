# Milestone 3 (API & RBAC Test Suite Expansion) Handoff Report

## Observation
- Modified `test_api.ps1` (lines 268-477) to incorporate explicit assertions for:
  1. `ADMIN_ROLE_PROVISION`: Creating employee with `job_title: "Admin"`, verifying account auto-provisioning and authenticating to confirm role is `Hospital_Admin`.
  2. `NON_DOCTOR_NULL_DEPT`: Creating non-doctor employee (`job_title: "Pharmacist"`) without `dept_id` (`dept_id = null`), verifying `GET /api/employees/:id` returns `Dept_ID` as `null`.
  3. `PUT_CUSTOM_PASSWORD_AUTH`: Updating employee via `PUT /api/employees/:id` with `new_password`, verifying old password (`admin123`) is rejected with `HTTP 401 Unauthorized`, and verifying new password authenticates with `HTTP 200 OK` returning a valid JWT token.
  4. `PREVENT_ADMIN_SELF_DELETE`: Authenticating as a logged-in Admin and attempting `DELETE /api/employees/:id` targeting the active Admin's own account, verifying `HTTP 400 Bad Request` lockout prevention response.
- Modified `test_roles.ps1` (lines 104-144) to add:
  - `NEWLY PROVISIONED ADMIN`: Provisioning a new Admin staff member, logging in with auto-provisioned credentials, and verifying HTTP 200 access to protected endpoints (`/api/employees`, `/api/patients`, `/api/reports/revenue`).
- Executed PowerShell test commands:
  - Command: `powershell -ExecutionPolicy Bypass -File test_api.ps1`
    Output:
    ```
    === HMS API TEST SUITE v2 ===
    User: System Admin [Hospital_Admin]

    PASS  HEALTH                 2026-08-12T13:15:32.330Z
    PASS  DASHBOARD              pts=27
    PASS  AUTH_ME                len=220
    PASS  PATIENTS_LIST          total=27
    PASS  PATIENT_1              len=431
    PASS  PATIENT_HISTORY        rows=3
    PASS  PATIENT_APPTS          rows=3
    PASS  DOCTORS_LIST           total=16
    PASS  DOCTOR_1               len=532
    PASS  DOCTOR_DEPTS           rows=10
    PASS  DOCTOR_SPECS           rows=10
    PASS  DOCTOR_SCHEDULE        rows=27
    PASS  APPTS_ALL              total=55
    PASS  APPTS_SCHEDULED        total=23
    PASS  APPTS_COMPLETED        total=25
    PASS  SLOTS_AVAIL            rows=2
    PASS  APPT_1                 len=458
    PASS  BILLING_LIST           total=23
    PASS  BILLING_PENDING        total=4
    PASS  BILLING_DETAIL_1       len=850
    PASS  MEDICINES_LIST         total=22
    PASS  MEDICINE_1             len=291
    PASS  INVENTORY_ALL          total=21
    PASS  INVENTORY_LOW          total=0
    PASS  INVENTORY_EXPIRING     total=0
    PASS  CATEGORIES             rows=10
    PASS  LOCATIONS              rows=3
    PASS  LAB_ORDERS             total=63
    PASS  LAB_PENDING            total=5
    PASS  LAB_ORDER_1            len=738
    PASS  LAB_TESTS              rows=10
    PASS  MED_RECORD             len=288
    PASS  PRESCRIPTIONS          rows=1
    PASS  MED_HISTORY            rows=3
    PASS  RPT_REVENUE            len=1264
    PASS  RPT_APPOINTMENTS       len=1713
    PASS  RPT_INVENTORY          len=265
    PASS  RPT_LAB                len=3557
    PASS  EMPLOYEES_LIST         total=18
    PASS  EMPLOYEE_DEPTS         rows=10
    PASS  EMPLOYEE_ROLES         rows=6
    PASS  FRONTEND               len=54786

    --- POST / PUT / DELETE tests ---
    PASS  POST_PATIENT             id=69
    PASS  POST_CATEGORY            id=53
    PASS  PUT_STOCK                qty=310
    PASS  POST_LAB_ORDER           id=75
    PASS  POST_LAB_RESULT          id=76
    PASS  POST_EMPLOYEE            id=91 username=test.staff4356
    PASS  EMPLOYEE_LOGIN_SUCCESS   token=eyJhbGciOiJIUzI...
    PASS  GET_EMPLOYEE_BY_ID       Emp_ID=91
    PASS  PUT_EMPLOYEE             Updated successfully
    PASS  DELETE_EMPLOYEE          Deleted successfully
    PASS  POST_DELETE_LOGIN_REJECT HTTP 401 Unauthorized
    PASS  ADMIN_ROLE_PROVISION     role=Hospital_Admin username=admin.provision8080
    PASS  NON_DOCTOR_NULL_DEPT     Emp_ID=93 Dept_ID=null
    PASS  PUT_CUSTOM_PASSWORD_AUTH Old pass 401, New pass auth successful
    PASS  PREVENT_ADMIN_SELF_DELETE HTTP 400 Bad Request on self-delete attempt

    ===========================================
     RESULTS: 57 PASS  |  0 FAIL  |  57 TOTAL
    ===========================================
    ```

  - Command: `powershell -ExecutionPolicy Bypass -File test_roles.ps1`
    Output:
    ```
    =========================================
      HMS ROLE-BASED ACCESS CONTROL TESTS   
    =========================================

    --- ADMIN (Hospital_Admin) ---
    PASS  [200] Admin: GET patients
    PASS  [200] Admin: GET doctors
    PASS  [200] Admin: GET appointments
    PASS  [200] Admin: GET billing
    PASS  [200] Admin: GET pharmacy/inv
    PASS  [200] Admin: GET lab/orders
    PASS  [200] Admin: GET reports/revenue
    PASS  [200] Admin: GET employees

    --- DOCTOR (Doctor) doctorId=1 ---
    PASS  [200] Doctor: GET own appointments
    PASS  [200] Doctor: GET patients (read)
    PASS  [200] Doctor: GET medicines
    PASS  [200] Doctor: GET lab orders
    PASS  [200] Doctor: GET billing
    PASS  [403] Doctor: DENIED reports
    PASS  [403] Doctor: DENIED employees
    PASS  [403] Doctor: DENIED add patient
    PASS  [403] Doctor: DENIED book appt
    PASS  [403] Doctor: DENIED process pay
    PASS  [403] Doctor: DENIED add medicine
    PASS  [403] Doctor: DENIED add lab result

    --- RECEPTIONIST (Receptionist) ---
    PASS  [200] Recep: GET patients
    PASS  [200] Recep: GET appointments
    PASS  [200] Recep: GET doctors
    PASS  [403] Recep: DENIED reports
    PASS  [403] Recep: DENIED employees
    PASS  [403] Recep: DENIED process pay
    PASS  [403] Recep: DENIED add medicine
    PASS  [403] Recep: DENIED lab result

    --- LAB TECHNICIAN (Lab_Technician) ---
    PASS  [200] LabTech: GET lab orders
    PASS  [200] LabTech: GET patients
    PASS  [403] LabTech: DENIED employees
    PASS  [403] LabTech: DENIED add patient
    PASS  [403] LabTech: DENIED book appt
    PASS  [403] LabTech: DENIED billing
    PASS  [403] LabTech: DENIED medicines w
    PASS  [403] LabTech: DENIED reports

    --- PHARMACIST (Pharmacist) ---
    PASS  [200] Pharm: GET medicines
    PASS  [200] Pharm: GET inventory
    PASS  [200] Pharm: GET locations
    PASS  [403] Pharm: DENIED employees
    PASS  [403] Pharm: DENIED patients
    PASS  [403] Pharm: DENIED appointments
    PASS  [403] Pharm: DENIED billing
    PASS  [403] Pharm: DENIED lab orders
    PASS  [403] Pharm: DENIED reports

    --- ACCOUNTANT (Accountant) ---
    PASS  [200] Acct: GET billing
    PASS  [200] Acct: GET patients (read)
    PASS  [200] Acct: GET reports
    PASS  [403] Acct: DENIED employees
    PASS  [403] Acct: DENIED add patient
    PASS  [403] Acct: DENIED book appt
    PASS  [403] Acct: DENIED medicines
    PASS  [403] Acct: DENIED lab result

    --- NEWLY PROVISIONED ADMIN ---
    New Admin authenticated: NewAdmin Test5224 [Hospital_Admin]
    PASS  [200] New Admin: GET employees
    PASS  [200] New Admin: GET patients
    PASS  [200] New Admin: GET reports/revenue

    =========================================
     RESULTS: 56 PASS  |  0 FAIL  |  56 TOTAL
    =========================================
    ```

## Logic Chain
1. Requirement R3 specifies Admin role provisioning when `job_title` is `"Admin"`. In `test_api.ps1`, `ADMIN_ROLE_PROVISION` creates a staff member with `job_title: "Admin"`, authenticates as that user, and confirms `role === "Hospital_Admin"`. In `test_roles.ps1`, `NEWLY PROVISIONED ADMIN` verifies the new Admin account can access `/api/employees`, `/api/patients`, and `/api/reports/revenue` with HTTP 200.
2. Requirement R4 specifies nullable `Dept_ID` for non-doctors. `NON_DOCTOR_NULL_DEPT` in `test_api.ps1` creates a non-doctor without `dept_id` and verifies `Dept_ID` is stored as `null`.
3. Requirement R2 specifies custom password updates on `PUT /api/employees/:id`. `PUT_CUSTOM_PASSWORD_AUTH` in `test_api.ps1` updates an employee with `new_password`, confirms old password returns `401 Unauthorized`, and new password authenticates with `200 OK` and a valid JWT token.
4. Requirement R1 specifies self-deletion lockout protection for active logged-in Admins. `PREVENT_ADMIN_SELF_DELETE` in `test_api.ps1` authenticates as an Admin and attempts `DELETE /api/employees/:id` targeting the active Admin's own ID, verifying `HTTP 400 Bad Request`.
5. Both test scripts were executed against the running backend server and achieved a 100% pass rate (57/57 in `test_api.ps1` and 56/56 in `test_roles.ps1`).

## Caveats
- Tests require the Express backend server to be running on `http://localhost:5000`.
- All newly created test employees are cleaned up automatically via `DELETE /api/employees/:id` at the end of each test block.

## Conclusion
Milestone 3 is 100% complete. Both `test_api.ps1` and `test_roles.ps1` have been updated with explicit, robust test coverage for requirements R1-R4, and both test suites pass with 100% success rate.

## Verification Method
To verify independently, execute the following commands in PowerShell from the project root directory (`d:\Hospital MYSQL Databse`):
1. `powershell -ExecutionPolicy Bypass -File test_api.ps1`
2. `powershell -ExecutionPolicy Bypass -File test_roles.ps1`

Expected Result:
- `test_api.ps1` outputs `RESULTS: 57 PASS | 0 FAIL | 57 TOTAL`
- `test_roles.ps1` outputs `RESULTS: 56 PASS | 0 FAIL | 56 TOTAL`
