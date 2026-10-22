param(
    [string]$BaseUrl = "http://127.0.0.1:5001"
)

Write-Host "Testing Smart Blood Bank Network backend at $BaseUrl" -ForegroundColor Cyan

Write-Host "`n1) Health" -ForegroundColor Yellow
Invoke-RestMethod "$BaseUrl/health" | ConvertTo-Json

Write-Host "`n2) Admin login" -ForegroundColor Yellow
$loginBody = @{
    email = "admina@smartblood.local"
    password = "Admin@123"
} | ConvertTo-Json
$login = Invoke-RestMethod -Uri "$BaseUrl/auth/login" -Method Post -ContentType "application/json" -Body $loginBody
$token = $login.token
$headers = @{ Authorization = "Bearer $token" }
$login.user | ConvertTo-Json

Write-Host "`n3) Blood search" -ForegroundColor Yellow
Invoke-RestMethod "$BaseUrl/blood/search?group=O%2B&city=Karachi" | ConvertTo-Json -Depth 8

Write-Host "`n4) Current inventory" -ForegroundColor Yellow
Invoke-RestMethod -Uri "$BaseUrl/blood/inventory" -Headers $headers | ConvertTo-Json -Depth 8

Write-Host "`n5) Admin hospitals" -ForegroundColor Yellow
Invoke-RestMethod -Uri "$BaseUrl/admin/hospitals" -Headers $headers | ConvertTo-Json -Depth 8

Write-Host "`n6) Admin report" -ForegroundColor Yellow
Invoke-RestMethod -Uri "$BaseUrl/admin/reports" -Headers $headers | ConvertTo-Json -Depth 8

Write-Host "`nSmoke test completed." -ForegroundColor Green
