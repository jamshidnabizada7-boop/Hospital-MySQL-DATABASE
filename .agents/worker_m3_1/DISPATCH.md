## 2026-08-12T08:55:50Z
You are worker_m3_1 for the Hospital Management System project.

Working Directory: d:\Hospital MYSQL Databse\.agents\worker_m3_1
Project Root: d:\Hospital MYSQL Databse
Original Request: d:\Hospital MYSQL Databse\ORIGINAL_REQUEST.md
Project Spec: d:\Hospital MYSQL Databse\PROJECT.md

Task Objective: Update the PowerShell test scripts (`test_roles.ps1` and `test_api.ps1`) to incorporate full test coverage for `/api/employees` CRUD endpoints and automatic `App_User` provisioning.

Requirements:
1. READ `d:\Hospital MYSQL Databse\ORIGINAL_REQUEST.md` and `d:\Hospital MYSQL Databse\PROJECT.md`.
2. Inspect `d:\Hospital MYSQL Databse\test_roles.ps1`:
   - Add tests for `/api/employees` verifying Admin role (Role 1) is allowed (200 OK), while all non-Admin roles (Receptionist, Doctor, Lab Technician, Pharmacist, Accountant) are denied (403 Forbidden or 401 Unauthorized).
   - Ensure all 6 roles are tested for `/api/employees` and all existing role checks continue to pass.
3. Inspect `d:\Hospital MYSQL Databse\test_api.ps1`:
   - Add Employee API tests:
     a) POST `/api/employees` creation of a new employee (e.g., Receptionist or Pharmacist) with required fields (First_Name, Last_Name, Job_Title, Phone, Email, Dept_ID, Salary, Hire_Date).
     b) Instant login verification using the auto-provisioned `App_User` credentials (`firstname.lastname` / `admin123`). Ensure authentication succeeds and valid JWT token is returned.
     c) GET `/api/employees` and GET `/api/employees/:id` verification.
     d) PUT `/api/employees/:id` update verification.
     e) DELETE `/api/employees/:id` cleanup verification.
     f) Post-deletion login rejection test: Verify login with the deleted employee's credentials returns 401 Unauthorized.
   - Ensure all test blocks run cleanly and report pass/fail status accurately.
4. Execute both `test_roles.ps1` and `test_api.ps1` using PowerShell. Verify 100% pass rate across all tests with 0 failures.
5. Create folder `d:\Hospital MYSQL Databse\.agents\worker_m3_1` if needed and write `handoff.md` summarizing changes, test execution logs, and verification status.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
