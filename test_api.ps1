$base = "http://localhost:5000/api"
$lr = Invoke-RestMethod -Uri "$base/auth/login" -Method POST -Body '{"username":"admin","password":"admin123"}' -ContentType "application/json"
$h = @{ Authorization = "Bearer $($lr.token)" }
Write-Host "=== HMS API TEST SUITE v2 ==="
Write-Host "User: $($lr.user.name) [$($lr.user.role)]"
Write-Host ""

$eps = @(
  # Core
  @{n="HEALTH";              u="health"},
  @{n="DASHBOARD";           u="dashboard/stats"},
  @{n="AUTH_ME";             u="auth/me"},
  # Patients
  @{n="PATIENTS_LIST";       u="patients?limit=3"},
  @{n="PATIENT_1";           u="patients/1"},
  @{n="PATIENT_HISTORY";     u="patients/1/history"},
  @{n="PATIENT_APPTS";       u="patients/1/appointments"},
  # Doctors
  @{n="DOCTORS_LIST";        u="doctors?limit=3"},
  @{n="DOCTOR_1";            u="doctors/1"},
  @{n="DOCTOR_DEPTS";        u="doctors/meta/departments"},
  @{n="DOCTOR_SPECS";        u="doctors/meta/specializations"},
  @{n="DOCTOR_SCHEDULE";     u="doctors/1/schedule?from=2026-01-01&to=2026-12-31"},
  # Appointments
  @{n="APPTS_ALL";           u="appointments?limit=5"},
  @{n="APPTS_SCHEDULED";     u="appointments?status=Scheduled&limit=3"},
  @{n="APPTS_COMPLETED";     u="appointments?status=Completed&limit=3"},
  @{n="SLOTS_AVAIL";         u="appointments/slots/available?doctor_id=1&date=2026-10-01"},
  @{n="APPT_1";              u="appointments/1"},
  # Billing
  @{n="BILLING_LIST";        u="billing?limit=3"},
  @{n="BILLING_PENDING";     u="billing?status=Pending"},
  @{n="BILLING_DETAIL_1";    u="billing/1"},
  # Pharmacy
  @{n="MEDICINES_LIST";      u="pharmacy/medicines?limit=5"},
  @{n="MEDICINE_1";          u="pharmacy/medicines/1"},
  @{n="INVENTORY_ALL";       u="pharmacy/inventory?limit=5"},
  @{n="INVENTORY_LOW";       u="pharmacy/inventory?status=low"},
  @{n="INVENTORY_EXPIRING";  u="pharmacy/inventory?status=expiring"},
  @{n="CATEGORIES";          u="pharmacy/categories"},
  @{n="LOCATIONS";           u="pharmacy/locations"},
  # Laboratory
  @{n="LAB_ORDERS";          u="lab/orders?limit=5"},
  @{n="LAB_PENDING";         u="lab/orders?status=Pending"},
  @{n="LAB_ORDER_1";         u="lab/orders/1"},
  @{n="LAB_TESTS";           u="lab/tests"},
  # Medical
  @{n="MED_RECORD";          u="medical/records/1"},
  @{n="PRESCRIPTIONS";       u="medical/prescriptions/1"},
  @{n="MED_HISTORY";         u="medical/history/1"},
  # Reports
  @{n="RPT_REVENUE";         u="reports/revenue?from=2026-01-01&to=2026-12-31"},
  @{n="RPT_APPOINTMENTS";    u="reports/appointments?from=2026-01-01&to=2026-12-31"},
  @{n="RPT_INVENTORY";       u="reports/inventory"},
  @{n="RPT_LAB";             u="reports/lab"},
  # Employees
  @{n="EMPLOYEES_LIST";       u="employees?limit=3"},
  @{n="EMPLOYEE_DEPTS";       u="employees/meta/departments"},
  @{n="EMPLOYEE_ROLES";       u="employees/meta/roles"},
  # Frontend
  @{n="FRONTEND";            u="http://localhost:5000"}
)

$pass=0; $fail=0; $failures=@()

foreach ($ep in $eps) {
  $url = if ($ep.u.StartsWith("http")) { $ep.u } else { "$base/$($ep.u)" }
  try {
    $r = Invoke-WebRequest -Uri $url -Headers $h -UseBasicParsing -ErrorAction Stop
    $j = try { $r.Content | ConvertFrom-Json -ErrorAction Stop } catch { $null }
    $info = if ($j.total -ne $null) { "total=$($j.total)" }
            elseif ($j.stats)       { "pts=$($j.stats.total_patients)" }
            elseif ($j.data -is [array]) { "rows=$($j.data.Count)" }
            elseif ($j.status -eq "ok")  { $j.time }
            else { "len=$($r.Content.Length)" }
    Write-Host "PASS  $($ep.n.PadRight(22)) $info"
    $pass++
  } catch {
    $code = try{$_.Exception.Response.StatusCode.value__}catch{0}
    Write-Host "FAIL  $($ep.n.PadRight(22)) HTTP $code"
    $fail++
    $failures += $ep.n
  }
}

# POST tests
Write-Host ""
Write-Host "--- POST / PUT / DELETE tests ---"

# Test POST /patients (create)
try {
  $body = '{"first_name":"Test","last_name":"Patient","gender":"Male","date_of_birth":"2000-01-01","blood_group":"O+","phone":"0799999999","emergency_name":"Em","emergency_phone":"0799999998"}'
  $r = Invoke-RestMethod -Uri "$base/patients" -Method POST -Body $body -ContentType "application/json" -Headers $h
  if ($r.success) { Write-Host "PASS  POST_PATIENT             id=$($r.id)"; $pass++ }
  else            { Write-Host "FAIL  POST_PATIENT             $($r.message)"; $fail++; $failures+="POST_PATIENT" }
  # cleanup
  if ($r.id) { Invoke-RestMethod -Uri "$base/patients/$($r.id)" -Method DELETE -Headers $h | Out-Null }
} catch { Write-Host "FAIL  POST_PATIENT             $($_.Exception.Message)"; $fail++; $failures+="POST_PATIENT" }

# Test POST /pharmacy/categories
try {
  $body = '{"category_name":"TestCat_Delete","description":"test"}'
  $r = Invoke-RestMethod -Uri "$base/pharmacy/categories" -Method POST -Body $body -ContentType "application/json" -Headers $h
  if ($r.success) {
    Write-Host "PASS  POST_CATEGORY            id=$($r.category_id)"
    $pass++
    if ($r.category_id) { Invoke-RestMethod -Uri "$base/pharmacy/categories/$($r.category_id)" -Method DELETE -Headers $h | Out-Null }
  }
  else            { Write-Host "FAIL  POST_CATEGORY            $($r.message)"; $fail++; $failures+="POST_CATEGORY" }
} catch { Write-Host "FAIL  POST_CATEGORY            $($_.Exception.Message)"; $fail++; $failures+="POST_CATEGORY" }

# Test PUT /pharmacy/inventory/:id/stock
try {
  $body = '{"qty_change":10}'
  $r = Invoke-RestMethod -Uri "$base/pharmacy/inventory/1/stock" -Method PUT -Body $body -ContentType "application/json" -Headers $h
  if ($r.success) { Write-Host "PASS  PUT_STOCK                qty=$($r.new_quantity)"; $pass++ }
  else            { Write-Host "FAIL  PUT_STOCK                $($r.message)"; $fail++; $failures+="PUT_STOCK" }
  # undo
  $body2 = '{"qty_change":-10}'
  Invoke-RestMethod -Uri "$base/pharmacy/inventory/1/stock" -Method PUT -Body $body2 -ContentType "application/json" -Headers $h | Out-Null
} catch { Write-Host "FAIL  PUT_STOCK                $($_.Exception.Message)"; $fail++; $failures+="PUT_STOCK" }

# Test POST /lab/orders (use existing appt)
try {
  $body = '{"appointment_id":22,"doctor_id":1,"priority":"Routine","notes":"API test order"}'
  $r = Invoke-RestMethod -Uri "$base/lab/orders" -Method POST -Body $body -ContentType "application/json" -Headers $h
  if ($r.success) {
    Write-Host "PASS  POST_LAB_ORDER           id=$($r.order_id)"
    $pass++
    # Test add result
    $body2 = "{`"test_id`":1,`"result`":`"Normal CBC`",`"is_abnormal`":0,`"remarks`":`"API test`"}"
    $r2 = Invoke-RestMethod -Uri "$base/lab/orders/$($r.order_id)/results" -Method POST -Body $body2 -ContentType "application/json" -Headers $h
    if ($r2.success) { Write-Host "PASS  POST_LAB_RESULT          id=$($r2.result_id)"; $pass++ }
    else             { Write-Host "FAIL  POST_LAB_RESULT          $($r2.message)"; $fail++; $failures+="POST_LAB_RESULT" }
  } else {
    Write-Host "FAIL  POST_LAB_ORDER           $($r.message)"; $fail++; $failures+="POST_LAB_ORDER"
  }
} catch { Write-Host "FAIL  POST_LAB_ORDER           $($_.Exception.Message)"; $fail++; $failures+="POST_LAB_ORDER" }

# Test Employee CRUD & Auto-Provisioned Account Login / Deletion Rejection
try {
  $randNum = Get-Random -Minimum 1000 -Maximum 9999
  $empFn   = "Test"
  $empLn   = "Staff$randNum"
  $empMail = "test.staff$randNum@hospital.com"
  $empPh   = "0700$randNum"

  $createBody = @{
    first_name    = $empFn
    last_name     = $empLn
    gender        = "Female"
    date_of_birth = "1995-04-12"
    job_title     = "Receptionist"
    phone         = $empPh
    email         = $empMail
    dept_id       = 1
    salary        = 30000.00
    hire_date     = "2026-08-12"
  } | ConvertTo-Json

  # a) POST /api/employees creation
  $empRes = Invoke-RestMethod -Uri "$base/employees" -Method POST -Body $createBody -ContentType "application/json" -Headers $h
  if ($empRes.success -and $empRes.emp_id) {
    $empId = $empRes.emp_id
    $empUsername = $empRes.username
    Write-Host "PASS  POST_EMPLOYEE            id=$empId username=$empUsername"
    $pass++

    # b) Instant login verification using auto-provisioned App_User credentials
    try {
      $loginBody = @{ username = $empUsername; password = "admin123" } | ConvertTo-Json
      $loginRes  = Invoke-RestMethod -Uri "$base/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
      if ($loginRes.token) {
        Write-Host "PASS  EMPLOYEE_LOGIN_SUCCESS   token=$($loginRes.token.Substring(0, 15))..."
        $pass++
      } else {
        Write-Host "FAIL  EMPLOYEE_LOGIN_SUCCESS   No token returned"
        $fail++; $failures += "EMPLOYEE_LOGIN_SUCCESS"
      }
    } catch {
      Write-Host "FAIL  EMPLOYEE_LOGIN_SUCCESS   $($_.Exception.Message)"
      $fail++; $failures += "EMPLOYEE_LOGIN_SUCCESS"
    }

    # c) GET /api/employees/:id verification
    try {
      $getRes = Invoke-RestMethod -Uri "$base/employees/$empId" -Method GET -Headers $h
      if ($getRes.success -and $getRes.data.Emp_ID -eq $empId) {
        Write-Host "PASS  GET_EMPLOYEE_BY_ID       Emp_ID=$($getRes.data.Emp_ID)"
        $pass++
      } else {
        Write-Host "FAIL  GET_EMPLOYEE_BY_ID       Failed to retrieve employee"
        $fail++; $failures += "GET_EMPLOYEE_BY_ID"
      }
    } catch {
      Write-Host "FAIL  GET_EMPLOYEE_BY_ID       $($_.Exception.Message)"
      $fail++; $failures += "GET_EMPLOYEE_BY_ID"
    }

    # d) PUT /api/employees/:id update verification
    try {
      $updateBody = @{
        first_name    = $empFn
        last_name     = "$empLn-Updated"
        gender        = "Female"
        date_of_birth = "1995-04-12"
        job_title     = "Receptionist"
        phone         = $empPh
        email         = $empMail
        dept_id       = 1
        salary        = 32000.00
        hire_date     = "2026-08-12"
      } | ConvertTo-Json
      $putRes = Invoke-RestMethod -Uri "$base/employees/$empId" -Method PUT -Body $updateBody -ContentType "application/json" -Headers $h
      if ($putRes.success) {
        Write-Host "PASS  PUT_EMPLOYEE             Updated successfully"
        $pass++
      } else {
        Write-Host "FAIL  PUT_EMPLOYEE             $($putRes.message)"
        $fail++; $failures += "PUT_EMPLOYEE"
      }
    } catch {
      Write-Host "FAIL  PUT_EMPLOYEE             $($_.Exception.Message)"
      $fail++; $failures += "PUT_EMPLOYEE"
    }

    # e) DELETE /api/employees/:id cleanup verification
    try {
      $delRes = Invoke-RestMethod -Uri "$base/employees/$empId" -Method DELETE -Headers $h
      if ($delRes.success) {
        Write-Host "PASS  DELETE_EMPLOYEE          Deleted successfully"
        $pass++
      } else {
        Write-Host "FAIL  DELETE_EMPLOYEE          $($delRes.message)"
        $fail++; $failures += "DELETE_EMPLOYEE"
      }
    } catch {
      Write-Host "FAIL  DELETE_EMPLOYEE          $($_.Exception.Message)"
      $fail++; $failures += "DELETE_EMPLOYEE"
    }

    # f) Post-deletion login rejection test: Verify login with deleted employee's credentials returns 401 Unauthorized
    try {
      $delLoginBody = @{ username = $empUsername; password = "admin123" } | ConvertTo-Json
      $delLoginRes = Invoke-RestMethod -Uri "$base/auth/login" -Method POST -Body $delLoginBody -ContentType "application/json" -ErrorAction Stop
      Write-Host "FAIL  POST_DELETE_LOGIN_REJECT Login succeeded after employee deletion"
      $fail++; $failures += "POST_DELETE_LOGIN_REJECT"
    } catch {
      $code = try { $_.Exception.Response.StatusCode.value__ } catch { 0 }
      if ($code -eq 401) {
        Write-Host "PASS  POST_DELETE_LOGIN_REJECT HTTP 401 Unauthorized"
        $pass++
      } else {
        Write-Host "FAIL  POST_DELETE_LOGIN_REJECT Expected HTTP 401 but got HTTP $code"
        $fail++; $failures += "POST_DELETE_LOGIN_REJECT"
      }
    }

  } else {
    Write-Host "FAIL  POST_EMPLOYEE            $($empRes.message)"
    $fail++; $failures += "POST_EMPLOYEE"
  }
} catch {
  Write-Host "FAIL  POST_EMPLOYEE            $($_.Exception.Message)"
  $fail++; $failures += "POST_EMPLOYEE"
}

# -------------------------------------------------------------
# R1-R4 Explicit Enhancements for Employee Management API
# -------------------------------------------------------------

# R3 Test: Admin role provisioning (job_title: "Admin") and login verification
try {
  $randA = Get-Random -Minimum 1000 -Maximum 9999
  $adminBody = @{
    first_name    = "Admin"
    last_name     = "Provision$randA"
    gender        = "Male"
    date_of_birth = "1988-03-15"
    job_title     = "Admin"
    phone         = "0788$randA"
    email         = "admin.prov$randA@hospital.com"
    salary        = 75000.00
  } | ConvertTo-Json

  $adminRes = Invoke-RestMethod -Uri "$base/employees" -Method POST -Body $adminBody -ContentType "application/json" -Headers $h
  if ($adminRes.success -and $adminRes.emp_id) {
    $aEmpId = $adminRes.emp_id
    $aUsername = $adminRes.username
    
    # Login verification
    $aLoginBody = @{ username = $aUsername; password = "admin123" } | ConvertTo-Json
    $aLoginRes  = Invoke-RestMethod -Uri "$base/auth/login" -Method POST -Body $aLoginBody -ContentType "application/json"
    if ($aLoginRes.token -and $aLoginRes.user.role -eq "Hospital_Admin") {
      Write-Host "PASS  ADMIN_ROLE_PROVISION     role=$($aLoginRes.user.role) username=$aUsername"
      $pass++
    } else {
      Write-Host "FAIL  ADMIN_ROLE_PROVISION     Expected role Hospital_Admin but got '$($aLoginRes.user.role)'"
      $fail++; $failures += "ADMIN_ROLE_PROVISION"
    }

    # Clean up provisioned admin test user
    Invoke-RestMethod -Uri "$base/employees/$aEmpId" -Method DELETE -Headers $h | Out-Null
  } else {
    Write-Host "FAIL  ADMIN_ROLE_PROVISION     $($adminRes.message)"
    $fail++; $failures += "ADMIN_ROLE_PROVISION"
  }
} catch {
  Write-Host "FAIL  ADMIN_ROLE_PROVISION     $($_.Exception.Message)"
  $fail++; $failures += "ADMIN_ROLE_PROVISION"
}

# R4 Test: Creating non-doctor staff with dept_id = null
try {
  $randN = Get-Random -Minimum 1000 -Maximum 9999
  $noDeptBody = @{
    first_name    = "Pharmacist"
    last_name     = "NoDept$randN"
    gender        = "Female"
    date_of_birth = "1994-07-20"
    job_title     = "Pharmacist"
    phone         = "0777$randN"
    email         = "pharm.nodept$randN@hospital.com"
    salary        = 42000.00
  } | ConvertTo-Json

  $noDeptRes = Invoke-RestMethod -Uri "$base/employees" -Method POST -Body $noDeptBody -ContentType "application/json" -Headers $h
  if ($noDeptRes.success -and $noDeptRes.emp_id) {
    $ndEmpId = $noDeptRes.emp_id
    $getNd = Invoke-RestMethod -Uri "$base/employees/$ndEmpId" -Method GET -Headers $h
    if ($getNd.success -and ($null -eq $getNd.data.Dept_ID -or $getNd.data.Dept_ID -eq "")) {
      Write-Host "PASS  NON_DOCTOR_NULL_DEPT     Emp_ID=$ndEmpId Dept_ID=null"
      $pass++
    } else {
      Write-Host "FAIL  NON_DOCTOR_NULL_DEPT     Expected null Dept_ID but got '$($getNd.data.Dept_ID)'"
      $fail++; $failures += "NON_DOCTOR_NULL_DEPT"
    }

    # Clean up
    Invoke-RestMethod -Uri "$base/employees/$ndEmpId" -Method DELETE -Headers $h | Out-Null
  } else {
    Write-Host "FAIL  NON_DOCTOR_NULL_DEPT     $($noDeptRes.message)"
    $fail++; $failures += "NON_DOCTOR_NULL_DEPT"
  }
} catch {
  Write-Host "FAIL  NON_DOCTOR_NULL_DEPT     $($_.Exception.Message)"
  $fail++; $failures += "NON_DOCTOR_NULL_DEPT"
}

# R2 Test: Updating employee password via PUT /api/employees/:id with custom password and verifying authentication
try {
  $randP = Get-Random -Minimum 1000 -Maximum 9999
  $pFn = "PassMod"
  $pLn = "Staff$randP"
  $pMail = "pass.mod$randP@hospital.com"
  $pPh = "0766$randP"

  $createPBody = @{
    first_name    = $pFn
    last_name     = $pLn
    gender        = "Male"
    date_of_birth = "1991-11-11"
    job_title     = "Receptionist"
    phone         = $pPh
    email         = $pMail
    salary        = 31000.00
  } | ConvertTo-Json

  $pRes = Invoke-RestMethod -Uri "$base/employees" -Method POST -Body $createPBody -ContentType "application/json" -Headers $h
  if ($pRes.success -and $pRes.emp_id) {
    $pEmpId = $pRes.emp_id
    $pUser  = $pRes.username
    $newPass = "CustomSecretPass99!"

    # Update employee with custom new_password
    $putPBody = @{
      first_name   = $pFn
      last_name    = $pLn
      gender       = "Male"
      date_of_birth= "1991-11-11"
      job_title    = "Receptionist"
      phone        = $pPh
      email        = $pMail
      salary       = 31000.00
      new_password = $newPass
    } | ConvertTo-Json

    $putPRes = Invoke-RestMethod -Uri "$base/employees/$pEmpId" -Method PUT -Body $putPBody -ContentType "application/json" -Headers $h
    if ($putPRes.success) {
      # 1. Verify old password (admin123) is rejected (401)
      $oldPassFailed = $false
      try {
        $oldLBody = @{ username = $pUser; password = "admin123" } | ConvertTo-Json
        Invoke-RestMethod -Uri "$base/auth/login" -Method POST -Body $oldLBody -ContentType "application/json" -ErrorAction Stop | Out-Null
      } catch {
        $code = try { $_.Exception.Response.StatusCode.value__ } catch { 0 }
        if ($code -eq 401) { $oldPassFailed = $true }
      }

      # 2. Verify new password authenticates successfully (200 + token)
      $newLBody = @{ username = $pUser; password = $newPass } | ConvertTo-Json
      $newLRes  = Invoke-RestMethod -Uri "$base/auth/login" -Method POST -Body $newLBody -ContentType "application/json"

      if ($oldPassFailed -and $newLRes.token) {
        Write-Host "PASS  PUT_CUSTOM_PASSWORD_AUTH Old pass 401, New pass auth successful"
        $pass++
      } else {
        Write-Host "FAIL  PUT_CUSTOM_PASSWORD_AUTH Old pass rejected=$oldPassFailed, New pass token=$($newLRes.token -ne $null)"
        $fail++; $failures += "PUT_CUSTOM_PASSWORD_AUTH"
      }
    } else {
      Write-Host "FAIL  PUT_CUSTOM_PASSWORD_AUTH $($putPRes.message)"
      $fail++; $failures += "PUT_CUSTOM_PASSWORD_AUTH"
    }

    # Clean up
    Invoke-RestMethod -Uri "$base/employees/$pEmpId" -Method DELETE -Headers $h | Out-Null
  } else {
    Write-Host "FAIL  PUT_CUSTOM_PASSWORD_AUTH $($pRes.message)"
    $fail++; $failures += "PUT_CUSTOM_PASSWORD_AUTH"
  }
} catch {
  Write-Host "FAIL  PUT_CUSTOM_PASSWORD_AUTH $($_.Exception.Message)"
  $fail++; $failures += "PUT_CUSTOM_PASSWORD_AUTH"
}

# R1 Test: Preventing self-deletion of logged-in admin user via DELETE /api/employees/:id (HTTP 400)
try {
  $randS = Get-Random -Minimum 1000 -Maximum 9999
  $sAdminBody = @{
    first_name    = "SelfDel"
    last_name     = "Admin$randS"
    gender        = "Male"
    date_of_birth = "1985-05-05"
    job_title     = "Admin"
    phone         = "0755$randS"
    email         = "selfdel$randS@hospital.com"
    salary        = 80000.00
  } | ConvertTo-Json

  $sAdminRes = Invoke-RestMethod -Uri "$base/employees" -Method POST -Body $sAdminBody -ContentType "application/json" -Headers $h
  if ($sAdminRes.success -and $sAdminRes.emp_id) {
    $sEmpId = $sAdminRes.emp_id
    $sUser  = $sAdminRes.username

    # Login as this newly provisioned admin user
    $sLoginBody = @{ username = $sUser; password = "admin123" } | ConvertTo-Json
    $sLoginRes  = Invoke-RestMethod -Uri "$base/auth/login" -Method POST -Body $sLoginBody -ContentType "application/json"
    $selfHeader = @{ Authorization = "Bearer $($sLoginRes.token)" }

    # Attempt self-deletion using logged-in admin's header
    $selfDelBlocked = $false
    try {
      Invoke-WebRequest -Uri "$base/employees/$sEmpId" -Method DELETE -Headers $selfHeader -UseBasicParsing -ErrorAction Stop | Out-Null
    } catch {
      $code = try { $_.Exception.Response.StatusCode.value__ } catch { 0 }
      if ($code -eq 400) { $selfDelBlocked = $true }
    }

    if ($selfDelBlocked) {
      Write-Host "PASS  PREVENT_ADMIN_SELF_DELETE HTTP 400 Bad Request on self-delete attempt"
      $pass++
    } else {
      Write-Host "FAIL  PREVENT_ADMIN_SELF_DELETE Self deletion was not blocked with HTTP 400"
      $fail++; $failures += "PREVENT_ADMIN_SELF_DELETE"
    }

    # Clean up using primary admin credentials ($h)
    Invoke-RestMethod -Uri "$base/employees/$sEmpId" -Method DELETE -Headers $h | Out-Null
  } else {
    Write-Host "FAIL  PREVENT_ADMIN_SELF_DELETE $($sAdminRes.message)"
    $fail++; $failures += "PREVENT_ADMIN_SELF_DELETE"
  }
} catch {
  Write-Host "FAIL  PREVENT_ADMIN_SELF_DELETE $($_.Exception.Message)"
  $fail++; $failures += "PREVENT_ADMIN_SELF_DELETE"
}

Write-Host ""
Write-Host "==========================================="
Write-Host " RESULTS: $pass PASS  |  $fail FAIL  |  $($pass+$fail) TOTAL"
if ($failures.Count -gt 0) { Write-Host " FAILED: $($failures -join ', ')" }
Write-Host "==========================================="

