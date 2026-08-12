# Forensic Audit Handoff Report — Milestone 3 Test Verification

**Work Product**: `test_api.ps1`, `test_roles.ps1`
**Profile**: General Project
**Verdict**: CLEAN

---

## 1. Observation

### Code Analysis of `test_api.ps1`
- **Genuine HTTP Requests**: Uses PowerShell `Invoke-WebRequest` and `Invoke-RestMethod` to execute HTTP calls against Express endpoints (`http://localhost:5000/api`).
- **Dynamic Data Generation**: Uses `Get-Random -Minimum 1000 -Maximum 9999` to construct non-colliding test user fields (`test.staff$randNum@hospital.com`, `0700$randNum`, etc.).
- **R1 Staff Modification & Self-Delete Guard Verification** (Lines 141–266, 427–477):
  - Sends `POST /api/employees` to create a staff record and captures the return JSON (`emp_id`, `username`).
  - Verifies instant login with auto-provisioned credentials via `POST /api/auth/login`.
  - Executes `GET /api/employees/:id`, `PUT /api/employees/:id` (updating last name), and `DELETE /api/employees/:id`.
  - Verifies post-deletion login rejection returns HTTP `401 Unauthorized`.
  - Verifies self-deletion attempt of currently logged-in Admin returns HTTP `400 Bad Request`.
- **R2 Custom Password Management Verification** (Lines 350–425):
  - Sends `PUT /api/employees/:id` with payload containing `new_password = "CustomSecretPass99!"`.
  - Verifies authentication with old password (`admin123`) returns HTTP `401 Unauthorized`.
  - Verifies authentication with `new_password` succeeds with HTTP 200 and valid JWT token.
- **R3 Admin Provisioning Verification** (Lines 272–311):
  - Creates employee with `job_title = "Admin"`.
  - Logs in with auto-provisioned credentials and asserts `$aLoginRes.user.role -eq "Hospital_Admin"`.
- **R4 Role-Specific Null Department Verification** (Lines 313–348):
  - Creates non-doctor employee (`job_title = "Pharmacist"`) with `dept_id = null`.
  - Queries `GET /api/employees/:id` and asserts returned `$getNd.data.Dept_ID` is `$null` / empty string.

### Code Analysis of `test_roles.ps1`
- **Genuine HTTP Requests & Assertion Helper**: Defines `Login($user)` function which posts credentials to `$base/auth/login` and `Test($label, $method, $url, $h, $body, $expectCode)` helper function using `Invoke-WebRequest`.
- **RBAC Matrix Verification**:
  - Tests `Admin` (8 endpoints allowed).
  - Tests `Doctor` (5 allowed, 7 denied with expected HTTP 403).
  - Tests `Receptionist` (3 allowed, 5 denied with expected HTTP 403).
  - Tests `Lab Technician` (2 allowed, 6 denied with expected HTTP 403).
  - Tests `Pharmacist` (3 allowed, 6 denied with expected HTTP 403).
  - Tests `Accountant` (3 allowed, 5 denied with expected HTTP 403).
  - Tests `Newly Provisioned Admin` (Lines 112–150): Dynamically provisions a new Admin user, authenticates as that user, and verifies full administrative access to `/employees`, `/patients`, and `/reports/revenue`.

### Anti-Cheating & Integrity Analysis
- **Hardcoded Outputs**: None found. All test results depend dynamically on response HTTP status codes and returned JSON objects.
- **Facade Implementations**: None found. Real database updates, logins, and API transactions occur during test execution.
- **Short-circuit Logic**: None found. Error conditions (`catch` blocks) correctly log failure and increment `$fail` / append to `$failures`.

---

## 2. Logic Chain

1. **Premise**: Integrity verification requires proving that `test_api.ps1` and `test_roles.ps1` issue genuine REST HTTP requests to backend endpoints, evaluate real response status/data, contain no hardcoded PASS statements or bypass logic, and test all required M3 functionality (R1-R4).
2. **Empirical Evidence**:
   - `test_api.ps1` executed live against `http://localhost:5000/api` and achieved 57 PASS / 0 FAIL across 57 test cases.
   - `test_roles.ps1` executed live against `http://localhost:5000/api` and achieved 56 PASS / 0 FAIL across 56 test cases.
3. **Source Verification**:
   - Both test scripts inspect actual HTTP status codes (200, 400, 401, 403) and body payloads (`success`, `emp_id`, `token`, `role`, `Dept_ID`).
   - Clean-up routines properly issue `DELETE` calls to remove temporary test objects post-assertion.
4. **Deduction**: The test scripts provide authentic, automated validation of the backend endpoints without facade implementations or hardcoded shortcuts.

---

## 3. Caveats

- Tests depend on the backend server running on `http://localhost:5000` connected to the MySQL database.
- E2E browser UI automated testing is scheduled for Milestone 4 (`test_e2e.js`); M3 focus is restricted to API and RBAC PowerShell scripts.

---

## 4. Conclusion

**Verdict: CLEAN**

Both `test_api.ps1` and `test_roles.ps1` perform authentic REST API HTTP requests against server endpoints. They rigorously test staff CRUD operations, custom password updates, Admin account auto-provisioning, role-specific null department handling, self-deletion guardrails, and role-based access control without any fake PASS prints or hardcoded assertions.

---

## 5. Verification Method

To independently verify this audit:

1. **Run `test_api.ps1`**:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\test_api.ps1
   ```
   *Expected Output*: `RESULTS: 57 PASS  |  0 FAIL  |  57 TOTAL`

2. **Run `test_roles.ps1`**:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\test_roles.ps1
   ```
   *Expected Output*: `RESULTS: 56 PASS  |  0 FAIL  |  56 TOTAL`

3. **Inspect Test Code Integrity**:
   Inspect `test_api.ps1` (lines 141-478) and `test_roles.ps1` (lines 1-150) using `view_file` to confirm that all test assertions inspect `$r.StatusCode` or `$r.Content` returned from `Invoke-WebRequest` / `Invoke-RestMethod`.
