# Milestone 3 (API & RBAC Test Suite Expansion) Review Report

## Review Summary

**Verdict**: **APPROVE**

## Observation

1. **File Inspection — `test_api.ps1`**:
   - `ADMIN_ROLE_PROVISION` (lines 272–311): Provisions an employee with `job_title = "Admin"`, performs authentication via `POST /api/auth/login`, asserts that `token` is returned and `user.role` equals `"Hospital_Admin"`, then deletes test user.
   - `NON_DOCTOR_NULL_DEPT` (lines 313–348): Provisions non-doctor employee (`job_title = "Pharmacist"`) with `dept_id` omitted/null, fetches `GET /api/employees/:id`, asserts that `$getNd.data.Dept_ID` is `$null`, then cleans up.
   - `PUT_CUSTOM_PASSWORD_AUTH` (lines 350–425): Updates employee record via `PUT /api/employees/:id` with `new_password = "CustomSecretPass99!"`, asserts that old password (`admin123`) fails with `HTTP 401 Unauthorized`, and asserts that new password authenticates with `HTTP 200 OK` returning a valid JWT token, then cleans up.
   - `PREVENT_ADMIN_SELF_DELETE` (lines 427–477): Provisions an Admin account, logs in as that admin to obtain token `$sLoginRes.token`, sends `DELETE /api/employees/:id` targeting the active admin's own ID using that token, asserts that server returns `HTTP 400 Bad Request`, then cleans up using primary admin credentials.

2. **File Inspection — `test_roles.ps1`**:
   - `NEWLY PROVISIONED ADMIN` (lines 112–150): Provisions a new Admin account via `POST /api/employees`, authenticates using auto-generated credentials, verifies `HTTP 200 OK` access to protected endpoints (`/api/employees`, `/api/patients`, `/api/reports/revenue`), and cleans up test employee.

3. **Backend Implementation Verification — `backend/routes/employees.js`**:
   - Lines 172-184 & 203-208: Correctly maps `"Admin"` or `"Hospital_Admin"` job titles to `Role_ID = 1` (`Hospital_Admin`).
   - Lines 214-224: Stores `dept_id` as `NULL` when omitted or falsy for non-doctors.
   - Lines 307-343: Hashes `new_password` with `bcrypt` when provided and updates `App_User.Password_Hash`.
   - Lines 383-394: Validates active logged-in admin identity against target employee `User_ID` / `Emp_ID` and returns `HTTP 400 Bad Request` prohibiting self-deletion.

4. **Empirical Command Execution Results**:
   - `powershell -ExecutionPolicy Bypass -File test_api.ps1`
     Output:
     ```
     ===========================================
      RESULTS: 57 PASS  |  0 FAIL  |  57 TOTAL
     ===========================================
     ```
   - `powershell -ExecutionPolicy Bypass -File test_roles.ps1`
     Output:
     ```
     =========================================
      RESULTS: 56 PASS  |  0 FAIL  |  56 TOTAL
     =========================================
     ```

## Logic Chain

1. **Requirement R1 (Staff Modification & Deletion Lockout)**: `PREVENT_ADMIN_SELF_DELETE` in `test_api.ps1` tests the lockout protection mechanism by authenticating as the target Admin and issuing a `DELETE` request against their own ID. The backend handles this in `backend/routes/employees.js` lines 383–394 by returning `400 Bad Request` ("Cannot delete the currently logged-in administrator account"). The test assertion verifies this status code explicitly.
2. **Requirement R2 (Custom Password Management)**: `PUT_CUSTOM_PASSWORD_AUTH` in `test_api.ps1` sends `new_password` in the `PUT /api/employees/:id` request payload. It verifies both failure of the original password (`HTTP 401`) and success of the custom password (`HTTP 200` + JWT token).
3. **Requirement R3 (Admin Role Provisioning)**: `ADMIN_ROLE_PROVISION` in `test_api.ps1` creates an employee with `job_title = "Admin"` and verifies `user.role === "Hospital_Admin"`. `NEWLY PROVISIONED ADMIN` in `test_roles.ps1` verifies that this newly provisioned admin can log in and access Admin-only endpoints (`/api/employees`, `/api/patients`, `/api/reports/revenue`).
4. **Requirement R4 (Role-Specific Department Field)**: `NON_DOCTOR_NULL_DEPT` in `test_api.ps1` creates a non-doctor employee without a department ID and asserts that `Dept_ID` is stored as `null` in the database and returned as `null` over the GET REST endpoint.
5. **Integrity & Code Quality**: Code analysis confirms zero integrity violations. No hardcoded test results, facade logic, or artificial pass shortcuts exist. All test blocks perform live HTTP API calls and validate real JSON response data and HTTP status codes.

## Verified Claims

- `test_api.ps1` Admin role provisioning test → Verified via execution (`ADMIN_ROLE_PROVISION`) → PASS
- `test_api.ps1` Non-doctor null department test → Verified via execution (`NON_DOCTOR_NULL_DEPT`) → PASS
- `test_api.ps1` Custom password update & auth test → Verified via execution (`PUT_CUSTOM_PASSWORD_AUTH`) → PASS
- `test_api.ps1` Admin self-deletion lockout guard → Verified via execution (`PREVENT_ADMIN_SELF_DELETE`) → PASS
- `test_roles.ps1` Newly provisioned admin RBAC permissions → Verified via execution (`NEWLY PROVISIONED ADMIN`) → PASS
- Empirical execution of `test_api.ps1` (57/57 PASS) → Verified via PowerShell command → PASS
- Empirical execution of `test_roles.ps1` (56/56 PASS) → Verified via PowerShell command → PASS

## Caveats

- The Express backend server must be running on `http://localhost:5000` with database connectivity to MySQL.
- All test scripts automatically clean up their generated test data via `DELETE /api/employees/:id` calls upon assertion completion.

## Stress Test Results

| Scenario | Attack / Stress Path | Expected Behavior | Actual Behavior | Result |
|---|---|---|---|---|
| Admin Self-Deletion | Admin user calls `DELETE /api/employees/{own_id}` | HTTP 400 Bad Request | HTTP 400 Bad Request | PASS |
| Old Password Auth after PUT | Login using `admin123` after setting custom password | HTTP 401 Unauthorized | HTTP 401 Unauthorized | PASS |
| New Password Auth after PUT | Login using custom password | HTTP 200 OK + Token | HTTP 200 OK + Token | PASS |
| Provisioned Admin RBAC | Provisioned admin accesses `/api/employees` | HTTP 200 OK | HTTP 200 OK | PASS |

## Conclusion

The Milestone 3 updates in `test_api.ps1` and `test_roles.ps1` fully satisfy all acceptance criteria and requirements R1 through R4. All tests run against the live Express backend server with 100% pass rates. No integrity violations or shortcuts were found.

**Final Verdict**: **APPROVE**

## Verification Method

To re-verify independently:
1. Ensure Node.js server is active: `http://localhost:5000/api/health`
2. Run API test suite: `powershell -ExecutionPolicy Bypass -File test_api.ps1` (Expected: 57 PASS, 0 FAIL)
3. Run RBAC test suite: `powershell -ExecutionPolicy Bypass -File test_roles.ps1` (Expected: 56 PASS, 0 FAIL)
