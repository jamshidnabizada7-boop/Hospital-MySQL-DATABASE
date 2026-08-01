$base = "http://localhost:5000/api"
$lr = Invoke-RestMethod -Uri "$base/auth/login" -Method POST -Body '{"username":"admin","password":"x"}' -ContentType "application/json"
$h = @{ Authorization = "Bearer $($lr.token)" }
Write-Host "=== HMS API TEST SUITE ==="
Write-Host "User: $($lr.user.name) [$($lr.user.role)]"
Write-Host ""

$eps = @(
    @{name="DASHBOARD";         url="dashboard/stats"},
    @{name="PATIENTS_LIST";     url="patients?limit=3"},
    @{name="PATIENT_HISTORY";   url="patients/1/history"},
    @{name="PATIENT_APPTS";     url="patients/1/appointments"},
    @{name="DOCTORS_LIST";      url="doctors?limit=3"},
    @{name="DOCTOR_DEPTS";      url="doctors/meta/departments"},
    @{name="DOCTOR_SPECS";      url="doctors/meta/specializations"},
    @{name="DOCTOR_SCHEDULE";   url="doctors/1/schedule?from=2026-08-01&to=2026-12-31"},
    @{name="APPTS_ALL";         url="appointments?limit=3"},
    @{name="APPTS_SCHEDULED";   url="appointments?status=Scheduled&limit=5"},
    @{name="APPTS_COMPLETED";   url="appointments?status=Completed&limit=5"},
    @{name="SLOTS_AVAIL";       url="appointments/slots/available?doctor_id=1&date=2026-09-15"},
    @{name="BILLING_LIST";      url="billing?limit=3"},
    @{name="BILLING_PENDING";   url="billing?status=Pending"},
    @{name="BILLING_DETAIL";    url="billing/1"},
    @{name="MEDICINES_LIST";    url="pharmacy/medicines?limit=5"},
    @{name="INVENTORY_ALL";     url="pharmacy/inventory?limit=5"},
    @{name="INVENTORY_LOW";     url="pharmacy/inventory?status=low"},
    @{name="INVENTORY_EXPIRING";url="pharmacy/inventory?status=expiring"},
    @{name="MED_CATEGORIES";    url="pharmacy/categories"},
    @{name="LAB_ORDERS";        url="lab/orders?limit=5"},
    @{name="LAB_PENDING";       url="lab/orders?status=Pending"},
    @{name="LAB_ORDER_DETAIL";  url="lab/orders/1"},
    @{name="LAB_TESTS";         url="lab/tests"},
    @{name="MED_RECORD";        url="medical/records/1"},
    @{name="PRESCRIPTIONS";     url="medical/prescriptions/1"},
    @{name="MED_HISTORY";       url="medical/history/1"},
    @{name="RPT_REVENUE";       url="reports/revenue?from=2026-01-01&to=2026-12-31"},
    @{name="RPT_APPOINTMENTS";  url="reports/appointments?from=2026-01-01&to=2026-12-31"},
    @{name="RPT_INVENTORY";     url="reports/inventory"},
    @{name="RPT_LAB";           url="reports/lab"},
    @{name="AUTH_ME";           url="auth/me"},
    @{name="HEALTH";            url="health"}
)

$pass=0; $fail=0; $failures=@()

foreach ($ep in $eps) {
    try {
        $r = Invoke-WebRequest -Uri "$base/$($ep.url)" -Headers $h -UseBasicParsing -ErrorAction Stop
        $j = $r.Content | ConvertFrom-Json -ErrorAction SilentlyContinue
        $info = ""
        if ($j.total -ne $null)         { $info = "total=$($j.total)" }
        elseif ($j.stats)               { $info = "pts=$($j.stats.total_patients) drs=$($j.stats.active_doctors)" }
        elseif ($j.data -is [array])    { $info = "rows=$($j.data.Count)" }
        elseif ($j.summary)             { $info = "collected=$($j.summary.total_collected)" }
        elseif ($j.low_stock -is [array]){ $info = "low=$($j.low_stock.Count) exp=$($j.expiring.Count)" }
        elseif ($j.status -eq "ok")     { $info = $j.time }
        else                            { $info = "len=$($r.Content.Length)" }
        Write-Host "PASS  $($ep.name.PadRight(22)) [$info]"
        $pass++
    } catch {
        $code = ""
        try { $code = $_.Exception.Response.StatusCode.value__ } catch {}
        Write-Host "FAIL  $($ep.name.PadRight(22)) HTTP=$code $($_.Exception.Message.Split('(')[-1].TrimEnd(')'))"
        $fail++
        $failures += $ep.name
    }
}

# Test frontend HTML
try {
    $fw = Invoke-WebRequest -Uri "http://localhost:5000" -UseBasicParsing -ErrorAction Stop
    Write-Host "PASS  FRONTEND                 [HTML len=$($fw.Content.Length) bytes]"
    $pass++
} catch {
    Write-Host "FAIL  FRONTEND"
    $fail++
    $failures += "FRONTEND"
}

Write-Host ""
Write-Host "==========================================="
Write-Host " RESULTS: $pass PASS  |  $fail FAIL  |  $($pass+$fail) TOTAL"
if ($failures.Count -gt 0) {
    Write-Host " FAILED: $($failures -join ', ')"
}
Write-Host "==========================================="
