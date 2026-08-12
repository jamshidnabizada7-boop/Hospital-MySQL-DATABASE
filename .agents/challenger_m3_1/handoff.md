# Adversarial Challenge & Verification Report — Milestone 3

**Agent Identity**: `challenger_m3_1` (Empirical Challenger)  
**Roles**: critic, specialist  
**Target Artifacts**: `test_roles.ps1`, `test_api.ps1`  
**Milestone**: M3 — Security & API Test Suite  
**Verdict**: **APPROVE**

---

## 1. Observation

### Test Execution Commands & Results
- Command 1: `powershell -ExecutionPolicy Bypass -File .\test_roles.ps1`
  - Output: 44 role-based checks executed across 6 system roles (`Hospital_Admin`, `Doctor`, `Receptionist`, `Lab_Technician`, `Pharmacist`, `Accountant`).
  - All endpoints passed as expected (200 OK for authorized routes, 403 Forbidden for restricted routes).
  - Explicit `/api/employees` access restriction verified: Admin gets 200 OK; Doctor, Receptionist, Lab Technician, Pharmacist, Accountant all receive 403 Forbidden.
  - Result: **100% PASS** (0 failures).

- Command 2: `powershell -ExecutionPolicy Bypass -File .\test_api.ps1`
  - Output: 53 test assertions executed (42 GET endpoints + 11 POST/PUT/DELETE lifecycle operations).
  - Employee endpoints tested: `EMPLOYEES_LIST`, `EMPLOYEE_DEPTS`, `EMPLOYEE_ROLES`.
  - Employee full lifecycle verified:
    1. POST `/api/employees` -> 201/200 Created with `emp_id` and dynamic `username`.
    2. POST `/api/auth/login` -> 200 OK using provisioned credentials (`username` + `admin123`), returning JWT Bearer token.
    3. GET `/api/employees/:id` -> 200 OK matching `Emp_ID`.
    4. PUT `/api/employees/:id` -> 200 OK updating employee record.
    5. DELETE `/api/employees/:id` -> 200 OK deleting employee record.
    6. POST `/api/auth/login` (post-deletion) -> 401 Unauthorized proving account revocation upon employee deletion.
  - Result: **53 PASS | 0 FAIL | 53 TOTAL**.

### Edge Case Stress-Testing Observations
- Unauthenticated Request (`GET /api/employees` without JWT token): Returns `401 Unauthorized`.
- Malformed/Invalid Token (`GET /api/employees` with `Bearer invalid_token_12345`): Returns `401 Unauthorized`.
- Missing Payload Parameters (`POST /api/employees` with incomplete JSON): Returns `400 Bad Request`.
- Idempotency & Clean-up: Creation test uses `Get-Random -Minimum 1000 -Maximum 9999` to avoid collisions and cleans up the created employee after test completion.

---

## 2. Logic Chain

1. **RBAC Isolation Verification**: `test_roles.ps1` authenticates each role independently and asserts exact expected HTTP status codes. `GET /api/employees` is explicitly guarded by `authorize(ROLES.ADMIN)`. The script tests Admin (expects 200) and all 5 non-Admin roles (expects 403). Because all 5 non-Admin roles receive 403, RBAC enforcement on `/api/employees` is empirically proven strict and effective.
2. **Employee Lifecycle & Auto-Provisioning Assertion**: `test_api.ps1` tests the entire lifecycle from creation to post-deletion login rejection. The test does not merely check HTTP 200; it validates JSON field structures (`.success`, `.emp_id`, `.username`, `.token`), attempts authentication using the provisioned credentials, validates record lookup by ID, tests updates, tests deletion, and verifies that the revoked credentials can no longer authenticate.
3. **Flakiness & Collision Prevention**: By utilizing randomized test data (`Test Staff<randNum>`) and explicit teardown steps (`DELETE /api/employees/$empId`), the test suite avoids state pollution, leftover test records, and dependency on hardcoded IDs, ensuring deterministic and non-flaky execution across repeated runs.
4. **Security Alignment**: Edge case probes confirm that unauthenticated access, invalid JWT tokens, missing payload fields, and deleted accounts behave strictly in accordance with security specifications (401/400 HTTP errors).

---

## 3. Caveats

- **Load / High Concurrency**: The test scripts run requests sequentially. High-concurrency race condition testing (e.g., simultaneous employee creation under heavy traffic) is outside the scope of `test_roles.ps1` and `test_api.ps1`.
- **Database Dependency**: Tests require MySQL database service and Express backend server (`http://localhost:5000`) to be running.

---

## 4. Adversarial Stress-Test Summary

### Overall Risk Assessment: LOW

| Challenge Dimension | Stress Scenario | Expected Behavior | Actual Behavior | Result |
|---------------------|-----------------|-------------------|-----------------|--------|
| Authorization Guard | Non-Admin role accessing `/api/employees` | HTTP 403 Forbidden | HTTP 403 Forbidden | PASS |
| Provisioned Auth | Login with provisioned `firstname.lastname` / `admin123` | HTTP 200 + JWT Token | HTTP 200 + JWT Token | PASS |
| Account Revocation | Login after `DELETE /api/employees/:id` | HTTP 401 Unauthorized | HTTP 401 Unauthorized | PASS |
| Token Security | Request with invalid JWT Bearer token | HTTP 401 Unauthorized | HTTP 401 Unauthorized | PASS |
| Input Validation | Incomplete POST body to `/api/employees` | HTTP 400 Bad Request | HTTP 400 Bad Request | PASS |
| Test Non-flakiness | Re-running test suite multiple times | 100% PASS without data collision | 100% PASS without data collision | PASS |

---

## 5. Verification Method

To independently reproduce and verify this assessment:

1. Open PowerShell in project root `d:\Hospital MYSQL Databse`.
2. Run `powershell -ExecutionPolicy Bypass -File .\test_roles.ps1`
   - Observe 100% PASS with 403 Forbidden assertions on non-admin `/api/employees` access.
3. Run `powershell -ExecutionPolicy Bypass -File .\test_api.ps1`
   - Observe `RESULTS: 53 PASS | 0 FAIL | 53 TOTAL`.
4. Inspect `test_roles.ps1` lines 40, 51, 65, 75, 88, 101.
5. Inspect `test_api.ps1` lines 140–266.

---

## 6. Conclusion & Explicit Verdict

**Verdict**: **APPROVE**

Milestone 3 criteria are fully met:
- `test_roles.ps1` strictly validates Admin-only RBAC protection for `/api/employees` across all 6 system roles.
- `test_api.ps1` comprehensively verifies Employee CRUD operations, automatic account provisioning, instant authentication, and post-deletion credential revocation.
- Test assertions are strict, non-flaky, reproducible, and executed with 100% pass rates.
