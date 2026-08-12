# Milestone 1 Verification Procedures & Test Suite Specifications

## Executive Summary
This document provides complete, step-by-step verification procedures and test commands (PowerShell script updates, cURL/PowerShell command-line snippets, and a standalone Node.js automated test script) for validating Milestone 1 (`/api/employees` backend endpoints and `App_User` auto-provisioning) against a running server at `http://localhost:5000`.

---

## 1. Verification Strategy & Scope

### Target Endpoints
- `GET /api/employees` (List employees with search, dept, role filters & pagination)
- `GET /api/employees/:id` (Fetch single employee details)
- `POST /api/employees` (Create employee + atomic auto-provisioning of `App_User` login)
- `PUT /api/employees/:id` (Update employee details & sync linked `App_User` profile)
- `DELETE /api/employees/:id` (Atomic deletion of employee and linked `App_User` account)

### Core Test Conditions
1. **Security & Authorization**:
   - Requests without token return `401 Unauthorized`.
   - Non-Admin roles (`Doctor`, `Receptionist`, `Lab_Technician`, `Pharmacist`, `Accountant`) return `403 Forbidden` for all employee endpoints.
   - `Hospital_Admin` role receives `200 OK` / `201 Created`.
2. **Auto-Provisioning & Credential Integrity**:
   - `POST /api/employees` generates username format `firstname.lastname` (or handles numerical collision incrementing `firstname.lastname1`).
   - Default password `admin123` is bcrypt hashed.
   - Newly created user can immediately authenticate via `POST /api/auth/login`.
   - The returned JWT grants appropriate role privileges corresponding to their job title.
3. **Cascade Deletion & Cleanup**:
   - `DELETE /api/employees/:id` removes both the `Employee` record and the linked `App_User` record.
   - Subsequent `GET /api/employees/:id` returns `404 Not Found`.
   - Subsequent `POST /api/auth/login` using the auto-provisioned username returns `401 Unauthorized`, confirming complete removal.

---

## 2. Step-by-Step PowerShell Verification Script Updates

### 2.1 Updating `test_roles.ps1` (Role-Based Access Control Verification)

In corporate environments and automated CI checks, `test_roles.ps1` checks role boundary enforcement. Add the following lines to `test_roles.ps1`:

```powershell
# Add to ADMIN section (Line ~40):
Test "Admin: GET employees"         GET  "$base/employees?limit=3"               $admin.h
Test "Admin: POST employee sample"  POST "$base/employees" $admin.h '{"first_name":"RoleCheck","last_name":"Test","gender":"Male","date_of_birth":"1995-01-01","job_title":"Receptionist","phone":"0770001111","email":"rolecheck.test@hospital.com","dept_id":1,"salary":25000}' 201

# Clean up temporary employee created during role check
$cleanupSearch = Invoke-RestMethod -Uri "$base/employees?search=rolecheck.test@hospital.com" -Headers $admin.h
if ($cleanupSearch.data.Count -gt 0) {
    $empIdToDelete = $cleanupSearch.data[0].Emp_ID
    Invoke-RestMethod -Uri "$base/employees/$empIdToDelete" -Method DELETE -Headers $admin.h | Out-Null
}

# Add to DOCTOR section (Line ~55):
Test "Doctor: DENIED employees"     GET  "$base/employees"                     $doctor.h $null 403

# Add to RECEPTIONIST section (Line ~66):
Test "Recep: DENIED employees"      GET  "$base/employees"                     $recep.h $null 403

# Add to LAB TECHNICIAN section (Line ~77):
Test "LabTech: DENIED employees"    GET  "$base/employees"                     $lab.h $null 403

# Add to PHARMACIST section (Line ~89):
Test "Pharm: DENIED employees"      GET  "$base/employees"                     $pharm.h $null 403

# Add to ACCOUNTANT section (Line ~100):
Test "Acct: DENIED employees"       GET  "$base/employees"                     $acct.h $null 403
```

---

### 2.2 Updating `test_api.ps1` (Functional Employee CRUD & Login Flow)

Add the `/api/employees` list endpoint into the `$eps` array in `test_api.ps1`:

```powershell
# Add under Core / Management endpoints:
@{n="EMPLOYEES_LIST"; u="employees?limit=5"}
```

Add the following end-to-end employee lifecycle & auto-provisioning login test block to `test_api.ps1` (under the `POST / PUT / DELETE tests` section):

```powershell
# ==============================================================================
# Test POST / PUT / DELETE /api/employees & Auto-Provisioned Login Verification
# ==============================================================================
try {
  $timestamp = Get-Date -Format "HHmmss"
  $testEmail = "verify.user$timestamp@hospital.com"
  $body = @{
    first_name    = "Verify"
    last_name     = "Staff$timestamp"
    gender        = "Female"
    date_of_birth = "1994-08-12"
    job_title     = "Receptionist"
    phone         = "0778889999"
    email         = $testEmail
    dept_id       = 1
    salary        = 27500.00
    hire_date     = "2026-08-12"
  } | ConvertTo-Json

  # 1. POST /api/employees (Create Employee + Auto-Provision App_User)
  $r = Invoke-RestMethod -Uri "$base/employees" -Method POST -Body $body -ContentType "application/json" -Headers $h
  if ($r.success -and $r.emp_id -and $r.credentials.username) {
    Write-Host "PASS  POST_EMPLOYEE            id=$($r.emp_id) user_id=$($r.user_id) username=$($r.credentials.username)"
    $pass++

    $newEmpId    = $r.emp_id
    $newUserId   = $r.user_id
    $newUsername = $r.credentials.username

    # 2. Login with Newly Auto-Provisioned User (username / admin123)
    try {
      $loginBody = @{ username = $newUsername; password = "admin123" } | ConvertTo-Json
      $lrNew = Invoke-RestMethod -Uri "$base/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
      if ($lrNew.success -and $lrNew.token) {
        Write-Host "PASS  LOGIN_PROVISIONED_USER  user=$($lrNew.user.username) role=$($lrNew.user.role)"
        $pass++
      } else {
        Write-Host "FAIL  LOGIN_PROVISIONED_USER  Failed to authenticate generated credentials"
        $fail++; $failures += "LOGIN_PROVISIONED_USER"
      }
    } catch {
      Write-Host "FAIL  LOGIN_PROVISIONED_USER  $($_.Exception.Message)"
      $fail++; $failures += "LOGIN_PROVISIONED_USER"
    }

    # 3. PUT /api/employees/:id (Update Salary & Phone)
    try {
      $updateBody = @{
        first_name    = "Verify"
        last_name     = "Staff$timestamp"
        gender        = "Female"
        date_of_birth = "1994-08-12"
        job_title     = "Receptionist"
        phone         = "0778880000"
        email         = $testEmail
        dept_id       = 1
        salary        = 31000.00
        hire_date     = "2026-08-12"
        is_active     = $true
      } | ConvertTo-Json
      $rPut = Invoke-RestMethod -Uri "$base/employees/$newEmpId" -Method PUT -Body $updateBody -ContentType "application/json" -Headers $h
      if ($rPut.success) {
        Write-Host "PASS  PUT_EMPLOYEE             id=$newEmpId updated salary=31000"
        $pass++
      } else {
        Write-Host "FAIL  PUT_EMPLOYEE             $($rPut.message)"
        $fail++; $failures += "PUT_EMPLOYEE"
      }
    } catch {
      Write-Host "FAIL  PUT_EMPLOYEE             $($_.Exception.Message)"
      $fail++; $failures += "PUT_EMPLOYEE"
    }

    # 4. DELETE /api/employees/:id (Clean Deletion of Employee and Linked App_User)
    try {
      $rDel = Invoke-RestMethod -Uri "$base/employees/$newEmpId" -Method DELETE -Headers $h
      if ($rDel.success) {
        Write-Host "PASS  DELETE_EMPLOYEE          id=$newEmpId (Employee + App_User purged)"
        $pass++

        # 5. Verify Deletion & Login Invalidation
        try {
          $loginFailTest = Invoke-RestMethod -Uri "$base/auth/login" -Method POST -Body $loginBody -ContentType "application/json" -ErrorAction Stop
          Write-Host "FAIL  VERIFY_CASCADE_CLEANUP   Login still succeeded after deletion!"
          $fail++; $failures += "VERIFY_CASCADE_CLEANUP"
        } catch {
          # HTTP 401 is expected here
          Write-Host "PASS  VERIFY_CASCADE_CLEANUP   User login rejected after employee deletion (401 OK)"
          $pass++
        }
      } else {
        Write-Host "FAIL  DELETE_EMPLOYEE          $($rDel.message)"
        $fail++; $failures += "DELETE_EMPLOYEE"
      }
    } catch {
      Write-Host "FAIL  DELETE_EMPLOYEE          $($_.Exception.Message)"
      $fail++; $failures += "DELETE_EMPLOYEE"
    }

  } else {
    Write-Host "FAIL  POST_EMPLOYEE            $($r.message)"
    $fail++; $failures += "POST_EMPLOYEE"
  }
} catch {
  Write-Host "FAIL  POST_EMPLOYEE            $($_.Exception.Message)"
  $fail++; $failures += "POST_EMPLOYEE"
}
```

---

## 3. Command-Line Verification Snippets (PowerShell & cURL)

Reviewers or QA engineers can run individual test commands directly in PowerShell or Terminal.

### 3.1 Unauthenticated & Non-Admin Access Denial Tests

```powershell
# 1. No Token (Expect 401 Unauthorized)
Invoke-WebRequest -Uri "http://localhost:5000/api/employees" -Method GET -SkipHttpErrorCheck | Select-Object StatusCode

# 2. Non-Admin (Doctor Login & Request -> Expect 403 Forbidden)
$docLogin = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method POST -Body '{"username":"dr_kamal","password":"admin123"}' -ContentType "application/json"
$docHeader = @{ Authorization = "Bearer $($docLogin.token)" }
Invoke-WebRequest -Uri "http://localhost:5000/api/employees" -Method GET -Headers $docHeader -SkipHttpErrorCheck | Select-Object StatusCode
```

### 3.2 Admin Employee Creation & Auto-Provisioning Verification

```powershell
# 1. Admin Login
$adminLogin = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method POST -Body '{"username":"admin","password":"admin123"}' -ContentType "application/json"
$adminHeader = @{ Authorization = "Bearer $($adminLogin.token)" }

# 2. Create Employee
$newEmpPayload = @{
    first_name    = "Alice"
    last_name     = "Smith"
    gender        = "Female"
    date_of_birth = "1992-04-10"
    job_title     = "Pharmacist"
    phone         = "0788112233"
    email         = "alice.smith@hospital.com"
    dept_id       = 1
    salary        = 35000.00
    hire_date     = "2026-08-12"
} | ConvertTo-Json

$createdEmp = Invoke-RestMethod -Uri "http://localhost:5000/api/employees" -Method POST -Body $newEmpPayload -ContentType "application/json" -Headers $adminHeader
$createdEmp | Format-List

# 3. Test Auto-Provisioned User Login
$provUserLogin = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method POST -Body "{`"username`":`"$($createdEmp.username)`",`"password`":`"admin123`"}" -ContentType "application/json"
$provUserLogin.user | Format-List

# 4. Clean Delete Created Employee
Invoke-RestMethod -Uri "http://localhost:5000/api/employees/$($createdEmp.emp_id)" -Method DELETE -Headers $adminHeader
```

---

## 4. Standalone Automated Node.js Verification Runner (`test_m1_employees.js`)

Below is a self-contained Node.js script that can be executed directly using `node test_m1_employees.js`. It runs complete, assertions-based verification for Milestone 1.

```javascript
/**
 * test_m1_employees.js — Standalone Milestone 1 Verification Test Suite
 * Execution: node test_m1_employees.js
 */

const BASE_URL = 'http://localhost:5000/api';

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  const config = { method: options.method || 'GET', headers };
  if (options.body) config.body = JSON.stringify(options.body);

  const res = await fetch(url, config);
  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, ok: res.ok, data };
}

async function runTests() {
  console.log('====================================================');
  console.log('   MILESTONE 1: EMPLOYEE CRUD & AUTO-PROVISIONING   ');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(label, condition, details = '') {
    if (condition) {
      console.log(`[PASS] ${label} ${details}`);
      passed++;
    } else {
      console.error(`[FAIL] ${label} ${details}`);
      failed++;
    }
  }

  // 1. Unauthenticated Check
  const unauthRes = await request('/employees');
  assert('Unauthenticated access denied', unauthRes.status === 401, `(HTTP ${unauthRes.status})`);

  // 2. Obtain Tokens
  const adminAuth = await request('/auth/login', {
    method: 'POST',
    body: { username: 'admin', password: 'admin123' }
  });
  assert('Admin login successful', adminAuth.status === 200 && adminAuth.data.token);
  const adminToken = adminAuth.data.token;
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };

  const doctorAuth = await request('/auth/login', {
    method: 'POST',
    body: { username: 'dr_kamal', password: 'admin123' }
  });
  const doctorHeaders = { Authorization: `Bearer ${doctorAuth.data.token}` };

  const recepAuth = await request('/auth/login', {
    method: 'POST',
    body: { username: 'receptionist1', password: 'admin123' }
  });
  const recepHeaders = { Authorization: `Bearer ${recepAuth.data.token}` };

  // 3. Non-Admin Denial Checks (403 Forbidden)
  const docGetRes = await request('/employees', { headers: doctorHeaders });
  assert('Doctor GET /employees denied (403)', docGetRes.status === 403);

  const recepGetRes = await request('/employees', { headers: recepHeaders });
  assert('Receptionist GET /employees denied (403)', recepGetRes.status === 403);

  // 4. Admin List Employees (200 OK)
  const adminGetRes = await request('/employees?limit=5', { headers: adminHeaders });
  assert('Admin GET /employees allowed (200)', adminGetRes.status === 200 && Array.isArray(adminGetRes.data.data));

  // 5. Create New Employee (POST /api/employees)
  const timestamp = Date.now();
  const testEmail = `test.staff${timestamp}@hospital.com`;
  const empPayload = {
    first_name: 'AutoTest',
    last_name: `Worker${timestamp}`,
    gender: 'Male',
    date_of_birth: '1993-06-20',
    job_title: 'Lab Technician',
    phone: '0799112233',
    email: testEmail,
    dept_id: 1,
    salary: 30000.00,
    hire_date: '2026-08-12'
  };

  const createRes = await request('/employees', {
    method: 'POST',
    headers: adminHeaders,
    body: empPayload
  });

  assert('POST /employees creates record (201)', createRes.status === 201 && createRes.data.success);
  const { emp_id, user_id, credentials } = createRes.data || {};
  assert('Returns emp_id & user_id', Boolean(emp_id && user_id), `(Emp_ID: ${emp_id}, User_ID: ${user_id})`);
  assert('Returns generated username', Boolean(credentials && credentials.username), `(Username: ${credentials?.username})`);

  // 6. Test Auto-Provisioned User Login
  if (credentials?.username) {
    const provLoginRes = await request('/auth/login', {
      method: 'POST',
      body: { username: credentials.username, password: 'admin123' }
    });
    assert('Auto-provisioned user login successful (200)', provLoginRes.status === 200 && provLoginRes.data.token);
    assert('Role set to Lab_Technician', provLoginRes.data?.user?.role === 'Lab_Technician');
  }

  // 7. GET Single Employee Details
  if (emp_id) {
    const detailRes = await request(`/employees/${emp_id}`, { headers: adminHeaders });
    assert('GET /employees/:id returns details (200)', detailRes.status === 200 && detailRes.data?.data?.Emp_ID === emp_id);
  }

  // 8. Update Employee Details (PUT /api/employees/:id)
  if (emp_id) {
    const updatePayload = {
      ...empPayload,
      salary: 38000.00,
      phone: '0799998877'
    };
    const updateRes = await request(`/employees/${emp_id}`, {
      method: 'PUT',
      headers: adminHeaders,
      body: updatePayload
    });
    assert('PUT /employees/:id updates record (200)', updateRes.status === 200 && updateRes.data.success);
  }

  // 9. Delete Employee & Verify Cascade Cleanup
  if (emp_id) {
    const deleteRes = await request(`/employees/${emp_id}`, {
      method: 'DELETE',
      headers: adminHeaders
    });
    assert('DELETE /employees/:id deletes employee & App_User (200)', deleteRes.status === 200 && deleteRes.data.success);

    // Verify GET returns 404
    const getAfterDel = await request(`/employees/${emp_id}`, { headers: adminHeaders });
    assert('GET deleted employee returns 404', getAfterDel.status === 404);

    // Verify User Login Fails (401)
    if (credentials?.username) {
      const loginAfterDel = await request('/auth/login', {
        method: 'POST',
        body: { username: credentials.username, password: 'admin123' }
      });
      assert('Login rejected for deleted auto-provisioned user (401)', loginAfterDel.status === 401);
    }
  }

  console.log('\n====================================================');
  console.log(` RESULTS: ${passed} PASSED  |  ${failed} FAILED`);
  console.log('====================================================');

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
```

---

## 5. Verification Matrix Summary

| Requirement / Test Case | Method / Route | Expected Code | Key Assertions / Verification Criteria |
|---|---|---|---|
| Security: Unauthenticated | GET `/api/employees` | 401 Unauthorized | `{ success: false, message: "No token provided" }` |
| Security: Non-Admin Role | GET `/api/employees` | 403 Forbidden | Denies Doctor, Receptionist, Lab Tech, Pharmacist, Accountant |
| Security: Admin Allowed | GET `/api/employees` | 200 OK | Returns employee array, total count, pagination metadata |
| Functional: Search / Filter | GET `/api/employees?search=...` | 200 OK | Filters by name, email, department ID, and role |
| Functional: Auto-Provisioning | POST `/api/employees` | 201 Created | Atomically creates `App_User` (`firstname.lastname`), returns credentials |
| Functional: Provisioned Login | POST `/api/auth/login` | 200 OK | User logs in with `admin123`, receives JWT with mapped role |
| Functional: Update Details | PUT `/api/employees/:id` | 200 OK | Updates `Employee` table and syncs `App_User` (fullname, email, role) |
| Security: Cascade Cleanup | DELETE `/api/employees/:id` | 200 OK | Deletes `Employee` and linked `App_User`. User login fails with 401. |
