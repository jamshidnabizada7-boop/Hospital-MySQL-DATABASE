$base = "http://localhost:5000/api"

$script:pass = 0
$script:fail = 0

function Login($user) {
    $r = Invoke-RestMethod -Uri "$base/auth/login" -Method POST `
         -Body "{`"username`":`"$user`",`"password`":`"admin123`"}" `
         -ContentType "application/json"
    return @{ h = @{Authorization="Bearer $($r.token)"}; role=$r.user.role; name=$r.user.name; doctorId=$r.user.doctorId }
}

function Test($label, $method, $url, $h, $body=$null, $expectCode=200) {
    try {
        $opts = @{ Uri=$url; Method=$method; Headers=$h; UseBasicParsing=$true; ErrorAction="Stop" }
        if ($body) { $opts.Body=$body; $opts.ContentType="application/json" }
        $r = Invoke-WebRequest @opts
        $ok = $r.StatusCode -eq $expectCode
        if ($ok) { $script:pass++ } else { $script:fail++ }
        Write-Host "$(if($ok){'PASS'}else{'WARN'})  [$($r.StatusCode)] $label"
        return $r.StatusCode
    } catch {
        $code = $_.Exception.Response.StatusCode.value__
        $expected = $code -eq $expectCode
        if ($expected) { $script:pass++ } else { $script:fail++ }
        Write-Host "$(if($expected){'PASS'}else{'FAIL'})  [$code] $label"
        return $code
    }
}

Write-Host "========================================="
Write-Host "  HMS ROLE-BASED ACCESS CONTROL TESTS   "
Write-Host "========================================="

# ── ADMIN ─────────────────────────────────────────────────
$admin = Login "admin"
Write-Host "`n--- ADMIN ($($admin.role)) ---"
Test "Admin: GET patients"         GET  "$base/patients?limit=3"               $admin.h
Test "Admin: GET doctors"          GET  "$base/doctors?limit=3"                $admin.h
Test "Admin: GET appointments"     GET  "$base/appointments?limit=3"           $admin.h
Test "Admin: GET billing"          GET  "$base/billing?limit=3"                $admin.h
Test "Admin: GET pharmacy/inv"     GET  "$base/pharmacy/inventory?limit=3"     $admin.h
Test "Admin: GET lab/orders"       GET  "$base/lab/orders?limit=3"             $admin.h
Test "Admin: GET reports/revenue"  GET  "$base/reports/revenue?from=2026-01-01&to=2026-12-31" $admin.h
Test "Admin: GET employees"        GET  "$base/employees?limit=3"              $admin.h

# ── DOCTOR ────────────────────────────────────────────────
$doctor = Login "dr_kamal"
Write-Host "`n--- DOCTOR ($($doctor.role)) doctorId=$($doctor.doctorId) ---"
Test "Doctor: GET own appointments" GET  "$base/appointments?limit=5"          $doctor.h
Test "Doctor: GET patients (read)"  GET  "$base/patients?limit=3"              $doctor.h
Test "Doctor: GET medicines"        GET  "$base/pharmacy/medicines?limit=3"    $doctor.h
Test "Doctor: GET lab orders"       GET  "$base/lab/orders?limit=3"            $doctor.h
Test "Doctor: GET billing"          GET  "$base/billing?limit=3"               $doctor.h
Test "Doctor: DENIED reports"       GET  "$base/reports/revenue?from=2026-01-01&to=2026-12-31" $doctor.h $null 403
Test "Doctor: DENIED employees"     GET  "$base/employees?limit=3"              $doctor.h $null 403
Test "Doctor: DENIED add patient"   POST "$base/patients" $doctor.h '{"first_name":"X","last_name":"Y","gender":"Male","date_of_birth":"2000-01-01","phone":"0799999999"}' 403
Test "Doctor: DENIED book appt"     POST "$base/appointments" $doctor.h '{"patient_id":1,"slot_id":999,"reason":"test"}' 403
Test "Doctor: DENIED process pay"   POST "$base/billing/1/payment" $doctor.h '{"amount":100,"method":"Cash"}' 403
Test "Doctor: DENIED add medicine"  POST "$base/pharmacy/medicines" $doctor.h '{"medicine_name":"X","strength":"1mg","category_id":1}' 403
Test "Doctor: DENIED add lab result" POST "$base/lab/orders/1/results" $doctor.h '{"test_id":1,"result":"test"}' 403

# ── RECEPTIONIST ──────────────────────────────────────────
$recep = Login "receptionist1"
Write-Host "`n--- RECEPTIONIST ($($recep.role)) ---"
Test "Recep: GET patients"          GET  "$base/patients?limit=3"              $recep.h
Test "Recep: GET appointments"      GET  "$base/appointments?limit=3"          $recep.h
Test "Recep: GET doctors"           GET  "$base/doctors?limit=3"               $recep.h
Test "Recep: DENIED reports"        GET  "$base/reports/revenue?from=2026-01-01&to=2026-12-31" $recep.h $null 403
Test "Recep: DENIED employees"      GET  "$base/employees?limit=3"              $recep.h $null 403
Test "Recep: DENIED process pay"    POST "$base/billing/1/payment" $recep.h '{"amount":100}' 403
Test "Recep: DENIED add medicine"   POST "$base/pharmacy/medicines" $recep.h '{"medicine_name":"X","strength":"1mg","category_id":1}' 403
Test "Recep: DENIED lab result"     POST "$base/lab/orders/1/results" $recep.h '{"test_id":1,"result":"test"}' 403

# ── LAB TECHNICIAN ────────────────────────────────────────
$lab = Login "labtech1"
Write-Host "`n--- LAB TECHNICIAN ($($lab.role)) ---"
Test "LabTech: GET lab orders"      GET  "$base/lab/orders?limit=3"            $lab.h
Test "LabTech: GET patients"        GET  "$base/patients?limit=3"              $lab.h
Test "LabTech: DENIED employees"    GET  "$base/employees?limit=3"              $lab.h $null 403
Test "LabTech: DENIED add patient"  POST "$base/patients" $lab.h '{"first_name":"X","last_name":"Y","gender":"Male","date_of_birth":"2000-01-01","phone":"0799"}' 403
Test "LabTech: DENIED book appt"    POST "$base/appointments" $lab.h '{"patient_id":1,"slot_id":1}' 403
Test "LabTech: DENIED billing"      GET  "$base/billing?limit=3"               $lab.h $null 403
Test "LabTech: DENIED medicines w"  POST "$base/pharmacy/medicines" $lab.h '{"medicine_name":"X","strength":"1mg","category_id":1}' 403
Test "LabTech: DENIED reports"      GET  "$base/reports/revenue?from=2026-01-01&to=2026-12-31" $lab.h $null 403

# ── PHARMACIST ────────────────────────────────────────────
$pharm = Login "pharmacist1"
Write-Host "`n--- PHARMACIST ($($pharm.role)) ---"
Test "Pharm: GET medicines"         GET  "$base/pharmacy/medicines?limit=3"    $pharm.h
Test "Pharm: GET inventory"         GET  "$base/pharmacy/inventory?limit=3"    $pharm.h
Test "Pharm: GET locations"         GET  "$base/pharmacy/locations"            $pharm.h
Test "Pharm: DENIED employees"      GET  "$base/employees?limit=3"              $pharm.h $null 403
Test "Pharm: DENIED patients"       GET  "$base/patients?limit=3"              $pharm.h $null 403
Test "Pharm: DENIED appointments"   GET  "$base/appointments?limit=3"          $pharm.h $null 403
Test "Pharm: DENIED billing"        GET  "$base/billing?limit=3"               $pharm.h $null 403
Test "Pharm: DENIED lab orders"     GET  "$base/lab/orders?limit=3"            $pharm.h $null 403
Test "Pharm: DENIED reports"        GET  "$base/reports/revenue?from=2026-01-01&to=2026-12-31" $pharm.h $null 403

# ── ACCOUNTANT ────────────────────────────────────────────
$acct = Login "accountant1"
Write-Host "`n--- ACCOUNTANT ($($acct.role)) ---"
Test "Acct: GET billing"            GET  "$base/billing?limit=3"               $acct.h
Test "Acct: GET patients (read)"    GET  "$base/patients?limit=3"              $acct.h
Test "Acct: GET reports"            GET  "$base/reports/revenue?from=2026-01-01&to=2026-12-31" $acct.h
Test "Acct: DENIED employees"       GET  "$base/employees?limit=3"              $acct.h $null 403
Test "Acct: DENIED add patient"     POST "$base/patients" $acct.h '{"first_name":"X","last_name":"Y","gender":"Male","date_of_birth":"2000-01-01","phone":"0799"}' 403
Test "Acct: DENIED book appt"       POST "$base/appointments" $acct.h '{"patient_id":1,"slot_id":1}' 403
Test "Acct: DENIED medicines"       POST "$base/pharmacy/medicines" $acct.h '{"medicine_name":"X","strength":"1mg","category_id":1}' 403
Test "Acct: DENIED lab result"      POST "$base/lab/orders/1/results" $acct.h '{"test_id":1,"result":"test"}' 403

# ── NEWLY PROVISIONED ADMIN ───────────────────────────────
Write-Host "`n--- NEWLY PROVISIONED ADMIN ---"
try {
    $randNum = Get-Random -Minimum 1000 -Maximum 9999
    $createAdminBody = @{
        first_name    = "NewAdmin"
        last_name     = "Test$randNum"
        gender        = "Male"
        date_of_birth = "1990-01-01"
        job_title     = "Admin"
        phone         = "0766$randNum"
        email         = "newadmin.rbac$randNum@hospital.com"
        salary        = 60000.00
    } | ConvertTo-Json

    $createRes = Invoke-RestMethod -Uri "$base/employees" -Method POST -Body $createAdminBody -ContentType "application/json" -Headers $admin.h
    if ($createRes.success -and $createRes.emp_id) {
        $newAdminEmpId = $createRes.emp_id
        $newAdminUser  = $createRes.username

        # Authenticate as newly provisioned Admin
        $newAdminSession = Login $newAdminUser
        Write-Host "New Admin authenticated: $($newAdminSession.name) [$($newAdminSession.role)]"

        # Verify access to protected endpoints
        Test "New Admin: GET employees"        GET  "$base/employees?limit=3"              $newAdminSession.h
        Test "New Admin: GET patients"         GET  "$base/patients?limit=3"               $newAdminSession.h
        Test "New Admin: GET reports/revenue"  GET  "$base/reports/revenue?from=2026-01-01&to=2026-12-31" $newAdminSession.h

        # Cleanup
        Invoke-RestMethod -Uri "$base/employees/$newAdminEmpId" -Method DELETE -Headers $admin.h | Out-Null
    } else {
        Write-Host "FAIL  Could not provision new Admin for RBAC testing"
        $script:fail++
    }
} catch {
    Write-Host "FAIL  New Admin RBAC testing error: $($_.Exception.Message)"
    $script:fail++
}

Write-Host "`n========================================="
Write-Host " RESULTS: $script:pass PASS  |  $script:fail FAIL  |  $($script:pass+$script:fail) TOTAL"
Write-Host "========================================="

