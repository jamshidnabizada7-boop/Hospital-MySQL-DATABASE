$base = "http://localhost:5000/api"
$lr = Invoke-RestMethod -Uri "$base/auth/login" -Method POST -Body '{"username":"admin","password":"admin123"}' -ContentType "application/json"
$h = @{ Authorization = "Bearer $($lr.token)" }

$res = Invoke-RestMethod -Uri "$base/employees?limit=200" -Method GET -Headers $h

Write-Host "Total Employees Count: $($res.total)"
Write-Host "Returned Rows Count: $($res.data.Count)"
Write-Host ""
Write-Host "Employees List:"
$res.data | ForEach-Object {
    Write-Host "Emp_ID=$($_.Emp_ID) | User_ID=$($_.User_ID) | Name=$($_.First_Name) $($_.Last_Name) | Job=$($_.Job_Title) | Username=$($_.Username) | Dept=$($_.Dept_Name)"
}

Write-Host ""
# Check for any test leftover rows
$testRows = $res.data | Where-Object {
    $_.First_Name -like "*Test*" -or $_.Last_Name -like "*Test*" -or
    $_.First_Name -like "*SelfDel*" -or $_.First_Name -like "*PassMod*" -or
    $_.First_Name -like "*Provision*" -or $_.First_Name -like "*Pharmacist*"
}

if ($testRows) {
    Write-Host "WARNING: Leftover test records found:"
    $testRows | ForEach-Object { Write-Host "  Emp_ID=$($_.Emp_ID) Username=$($_.Username)" }
} else {
    Write-Host "CLEANUP VERIFIED: No leftover test records found in Employee table!"
}
