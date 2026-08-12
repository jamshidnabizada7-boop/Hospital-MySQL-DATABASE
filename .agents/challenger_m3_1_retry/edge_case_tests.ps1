Write-Host "=== EMPIRICAL EDGE CASE & SECURITY CHALLENGE ==="

$base = "http://localhost:5000/api"
$lr = Invoke-RestMethod -Uri "$base/auth/login" -Method POST -Body '{"username":"admin","password":"admin123"}' -ContentType "application/json"
$adminH = @{ Authorization = "Bearer $($lr.token)" }

$edgePass = 0
$edgeFail = 0

# Test Edge Case 1: Creating a Doctor without dept_id should fail with 400
try {
    $doctorNoDept = @{
        first_name    = "NoDept"
        last_name     = "Doctor"
        gender        = "Male"
        date_of_birth = "1980-01-01"
        job_title     = "Doctor"
        phone         = "0711111111"
        email         = "nodept.doctor@hospital.com"
        salary        = 90000.00
    } | ConvertTo-Json

    $res = Invoke-RestMethod -Uri "$base/employees" -Method POST -Body $doctorNoDept -ContentType "application/json" -Headers $adminH -ErrorAction Stop
    Write-Host "FAIL  Doctor without Dept_ID was allowed"
    $edgeFail++
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    if ($code -eq 400) {
        Write-Host "PASS  Doctor without Dept_ID blocked with HTTP 400 Bad Request"
        $edgePass++
    } else {
        Write-Host "FAIL  Doctor without Dept_ID returned HTTP $code instead of 400"
        $edgeFail++
    }
}

# Test Edge Case 2: Creating employee with missing required fields (e.g. no last_name) should fail with 400
try {
    $invalidEmp = @{
        first_name    = "NoLastName"
        gender        = "Male"
        job_title     = "Receptionist"
        phone         = "0722222222"
        email         = "nolast@hospital.com"
    } | ConvertTo-Json

    $res = Invoke-RestMethod -Uri "$base/employees" -Method POST -Body $invalidEmp -ContentType "application/json" -Headers $adminH -ErrorAction Stop
    Write-Host "FAIL  Employee without last_name was allowed"
    $edgeFail++
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    if ($code -eq 400) {
        Write-Host "PASS  Missing required field blocked with HTTP 400 Bad Request"
        $edgePass++
    } else {
        Write-Host "FAIL  Missing required field returned HTTP $code instead of 400"
        $edgeFail++
    }
}

# Test Edge Case 3: Username deduplication logic (creating 2 employees with exact same First & Last Name)
try {
    $emp1Body = @{
        first_name    = "Same"
        last_name     = "Name"
        gender        = "Male"
        job_title     = "Receptionist"
        phone         = "0733333331"
        email         = "same.name1@hospital.com"
    } | ConvertTo-Json

    $emp2Body = @{
        first_name    = "Same"
        last_name     = "Name"
        gender        = "Female"
        job_title     = "Receptionist"
        phone         = "0733333332"
        email         = "same.name2@hospital.com"
    } | ConvertTo-Json

    $r1 = Invoke-RestMethod -Uri "$base/employees" -Method POST -Body $emp1Body -ContentType "application/json" -Headers $adminH
    $r2 = Invoke-RestMethod -Uri "$base/employees" -Method POST -Body $emp2Body -ContentType "application/json" -Headers $adminH

    if ($r1.username -eq "same.name" -and $r2.username -eq "same.name1") {
        Write-Host "PASS  Username deduplication generated 'same.name' and 'same.name1'"
        $edgePass++
    } else {
        Write-Host "FAIL  Username deduplication mismatch: r1=$($r1.username), r2=$($r2.username)"
        $edgeFail++
    }

    # Cleanup
    if ($r1.emp_id) { Invoke-RestMethod -Uri "$base/employees/$($r1.emp_id)" -Method DELETE -Headers $adminH | Out-Null }
    if ($r2.emp_id) { Invoke-RestMethod -Uri "$base/employees/$($r2.emp_id)" -Method DELETE -Headers $adminH | Out-Null }
} catch {
    Write-Host "FAIL  Username deduplication error: $($_.Exception.Message)"
    $edgeFail++
}

# Test Edge Case 4: Non-existent employee GET /api/employees/99999 should return 404
try {
    $res = Invoke-RestMethod -Uri "$base/employees/99999" -Method GET -Headers $adminH -ErrorAction Stop
    Write-Host "FAIL  Non-existent GET returned 200"
    $edgeFail++
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    if ($code -eq 404) {
        Write-Host "PASS  Non-existent GET returned HTTP 404 Not Found"
        $edgePass++
    } else {
        Write-Host "FAIL  Non-existent GET returned HTTP $code"
        $edgeFail++
    }
}

# Test Edge Case 5: Non-existent employee DELETE /api/employees/99999 should return 404
try {
    $res = Invoke-RestMethod -Uri "$base/employees/99999" -Method DELETE -Headers $adminH -ErrorAction Stop
    Write-Host "FAIL  Non-existent DELETE returned 200"
    $edgeFail++
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    if ($code -eq 404) {
        Write-Host "PASS  Non-existent DELETE returned HTTP 404 Not Found"
        $edgePass++
    } else {
        Write-Host "FAIL  Non-existent DELETE returned HTTP $code"
        $edgeFail++
    }
}

Write-Host ""
Write-Host "Edge Case Results: $edgePass PASS | $edgeFail FAIL"
