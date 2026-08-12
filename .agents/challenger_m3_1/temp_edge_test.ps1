$base = "http://localhost:5000/api"

Write-Host "--- EDGE CASE STRESS TESTS ---"

# Test 1: Missing JWT token on GET /api/employees
try {
    $r = Invoke-WebRequest -Uri "$base/employees" -Method GET -ErrorAction Stop
    Write-Host "UNAUTH_NO_TOKEN: FAIL (Allowed without token!)"
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    Write-Host "UNAUTH_NO_TOKEN: PASS (HTTP $code)"
}

# Test 2: Invalid JWT token on GET /api/employees
try {
    $h = @{ Authorization = "Bearer invalid_token_12345" }
    $r = Invoke-WebRequest -Uri "$base/employees" -Method GET -Headers $h -ErrorAction Stop
    Write-Host "UNAUTH_INVALID_TOKEN: FAIL (Allowed with invalid token!)"
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    Write-Host "UNAUTH_INVALID_TOKEN: PASS (HTTP $code)"
}

# Test 3: Missing parameters in POST /api/employees
try {
    $adminRes = Invoke-RestMethod -Uri "$base/auth/login" -Method POST -Body '{"username":"admin","password":"admin123"}' -ContentType "application/json"
    $adminH = @{ Authorization = "Bearer $($adminRes.token)" }
    
    $badBody = '{"first_name":"TestOnly"}'
    $r = Invoke-RestMethod -Uri "$base/employees" -Method POST -Body $badBody -ContentType "application/json" -Headers $adminH -ErrorAction Stop
    Write-Host "MISSING_PARAMS: FAIL (Allowed incomplete payload!)"
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    Write-Host "MISSING_PARAMS: PASS (HTTP $code)"
}

# Test 4: Duplicate username creation handling
try {
    $adminRes = Invoke-RestMethod -Uri "$base/auth/login" -Method POST -Body '{"username":"admin","password":"admin123"}' -ContentType "application/json"
    $adminH = @{ Authorization = "Bearer $($adminRes.token)" }

    $dupBody = @{
        first_name    = "System"
        last_name     = "Admin"
        gender        = "Male"
        date_of_birth = "1990-01-01"
        job_title     = "Receptionist"
        phone         = "0790000000"
        email         = "admin.dup@hospital.com"
        dept_id       = 1
        salary        = 30000.00
        hire_date     = "2026-08-12"
    } | ConvertTo-Json

    $r = Invoke-RestMethod -Uri "$base/employees" -Method POST -Body $dupBody -ContentType "application/json" -Headers $adminH -ErrorAction Stop
    # If first_name=System last_name=Admin -> username = system.admin or admin
    Write-Host "DUPLICATE_USERNAME: Result username=$($r.username)"
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    Write-Host "DUPLICATE_USERNAME: Caught error (HTTP $code)"
}
