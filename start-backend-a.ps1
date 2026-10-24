# Starts Hospital A backend on port 5001
Set-Location "$PSScriptRoot\backend"
$pw = Read-Host "Postgres password"
$enc = [uri]::EscapeDataString($pw)
$env:HOSPITAL_ID = "A"
$env:DATABASE_URL = "postgresql://postgres:$enc@127.0.0.1:5432/blood_bank_hospital_a"
$env:SYNC_SHARED_SECRET = "smart-blood-bank-demo-secret"
$env:JWT_SECRET_KEY = "smart-blood-bank-demo-jwt-secret"
flask --app app run --host=127.0.0.1 --port=5001 --no-debugger --no-reload
