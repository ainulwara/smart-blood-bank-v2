param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("A", "B", "C")]
    [string]$Node
)

$ports = @{ A = 5001; B = 5002; C = 5003 }
$dbs = @{
    A = "blood_bank_hospital_a"
    B = "blood_bank_hospital_b"
    C = "blood_bank_hospital_c"
}

$secure = Read-Host "PostgreSQL password" -AsSecureString
$pw = [System.Net.NetworkCredential]::new("", $secure).Password
$enc = [uri]::EscapeDataString($pw)

$env:HOSPITAL_ID = $Node
$env:DATABASE_URL = "postgresql://postgres:$enc@127.0.0.1:5432/$($dbs[$Node])"
$env:SYNC_SHARED_SECRET = "smart-blood-bank-demo-secret"
$env:JWT_SECRET_KEY = "smart-blood-bank-demo-jwt-secret"

Set-Location "$PSScriptRoot\backend"
$venvPython = Join-Path $PSScriptRoot "backend\.venv\Scripts\python.exe"
$py = if (Test-Path $venvPython) { $venvPython } else { "python" }

Write-Host "Starting Hospital $Node on http://127.0.0.1:$($ports[$Node])..." -ForegroundColor Green
& $py -m flask --app app run --host=127.0.0.1 --port=$($ports[$Node]) --no-debugger --no-reload
