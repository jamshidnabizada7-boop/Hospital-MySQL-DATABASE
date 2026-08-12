Write-Host "=== EMPIRICAL STRESS TEST SUITE ==="

$base = "http://localhost:5000/api"
$lr = Invoke-RestMethod -Uri "$base/auth/login" -Method POST -Body '{"username":"admin","password":"admin123"}' -ContentType "application/json"
$h = @{ Authorization = "Bearer $($lr.token)" }

$initialRes = Invoke-RestMethod -Uri "$base/employees?limit=200" -Method GET -Headers $h
$initialCount = $initialRes.total
Write-Host "Initial Employee Count: $initialCount"

# Run 1: test_api.ps1
Write-Host "`n--- Execution 1: test_api.ps1 ---"
$apiOut1 = powershell -ExecutionPolicy Bypass -File test_api.ps1
$apiPass1 = ($apiOut1 | Select-String "RESULTS: (\d+) PASS").Matches.Groups[1].Value
Write-Host "test_api.ps1 Run 1 Result: $apiPass1 PASS"

$resAfterApi1 = Invoke-RestMethod -Uri "$base/employees?limit=200" -Method GET -Headers $h
Write-Host "Employee Count after test_api Run 1: $($resAfterApi1.total)"

# Run 2: test_roles.ps1
Write-Host "`n--- Execution 2: test_roles.ps1 ---"
$rolesOut1 = powershell -ExecutionPolicy Bypass -File test_roles.ps1
$rolesPass1 = ($rolesOut1 | Select-String "RESULTS: (\d+) PASS").Matches.Groups[1].Value
Write-Host "test_roles.ps1 Run 1 Result: $rolesPass1 PASS"

$resAfterRoles1 = Invoke-RestMethod -Uri "$base/employees?limit=200" -Method GET -Headers $h
Write-Host "Employee Count after test_roles Run 1: $($resAfterRoles1.total)"

# Run 3: test_api.ps1 again
Write-Host "`n--- Execution 3: test_api.ps1 (2nd run) ---"
$apiOut2 = powershell -ExecutionPolicy Bypass -File test_api.ps1
$apiPass2 = ($apiOut2 | Select-String "RESULTS: (\d+) PASS").Matches.Groups[1].Value
Write-Host "test_api.ps1 Run 2 Result: $apiPass2 PASS"

$resAfterApi2 = Invoke-RestMethod -Uri "$base/employees?limit=200" -Method GET -Headers $h
Write-Host "Employee Count after test_api Run 2: $($resAfterApi2.total)"

# Run 4: test_roles.ps1 again
Write-Host "`n--- Execution 4: test_roles.ps1 (2nd run) ---"
$rolesOut2 = powershell -ExecutionPolicy Bypass -File test_roles.ps1
$rolesPass2 = ($rolesOut2 | Select-String "RESULTS: (\d+) PASS").Matches.Groups[1].Value
Write-Host "test_roles.ps1 Run 2 Result: $rolesPass2 PASS"

$finalRes = Invoke-RestMethod -Uri "$base/employees?limit=200" -Method GET -Headers $h
Write-Host "Final Employee Count: $($finalRes.total)"

if ($initialCount -eq $finalRes.total) {
    Write-Host "`n✅  CLEANUP STRESS TEST PASSED: No net employee records added during 4 consecutive script executions."
} else {
    Write-Host "`n❌  CLEANUP STRESS TEST FAILED: Initial count ($initialCount) != Final count ($($finalRes.total))"
}
