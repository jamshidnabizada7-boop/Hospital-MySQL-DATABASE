$base = "http://localhost:5000/api"
$lr = Invoke-RestMethod -Uri "$base/auth/login" -Method POST -Body '{"username":"admin","password":"x"}' -ContentType "application/json"
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
  # Frontend
  @{n="FRONTEND";            u="http://localhost:5000"}
)

$pass=0; $fail=0; $failures=@()

foreach ($ep in $eps) {
  $url = if ($ep.u.StartsWith("http")) { $ep.u } else { "$base/$($ep.u)" }
  try {
    $r = Invoke-WebRequest -Uri $url -Headers $h -UseBasicParsing -ErrorAction Stop
    $j = $r.Content | ConvertFrom-Json -ErrorAction SilentlyContinue
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
  if ($r.success) { Write-Host "PASS  POST_CATEGORY            id=$($r.category_id)"; $pass++ }
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

Write-Host ""
Write-Host "==========================================="
Write-Host " RESULTS: $pass PASS  |  $fail FAIL  |  $($pass+$fail) TOTAL"
if ($failures.Count -gt 0) { Write-Host " FAILED: $($failures -join ', ')" }
Write-Host "==========================================="
