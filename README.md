# Smart Blood Bank Network

A three-node distributed blood bank management system. Each hospital runs its own Flask REST API and its own PostgreSQL database. Blood inventory is synchronized between hospitals over direct REST requests; user accounts, emergency requests, and notifications stay local to each hospital.

> **Status:** Hospital A has been verified end to end: PostgreSQL, schema and seed data, Flask API, JWT login, and the React frontend signing in through the dev proxy. Hospital B/C startup and inventory synchronization between nodes have not been tested yet.

---

## Table of contents

1. [Architecture](#architecture)
2. [Technology](#technology)
3. [Repository structure](#repository-structure)
4. [Prerequisites](#prerequisites)
5. [How to run (step by step)](#how-to-run-step-by-step)
6. [Demo accounts](#demo-accounts)
7. [Frontend pages](#frontend-pages)
8. [API overview](#api-overview)
9. [Environment variables](#environment-variables)
10. [Troubleshooting](#troubleshooting)
11. [Security notes](#security-notes)
12. [Development checklist](#development-checklist)
13. [Contributing](#contributing)

---

## Architecture

| Hospital | City | Flask port | Database |
|---|---|---:|---|
| A | Karachi | 5001 | `blood_bank_hospital_a` |
| B | Lahore | 5002 | `blood_bank_hospital_b` |
| C | Islamabad | 5003 | `blood_bank_hospital_c` |

```
Browser (http://localhost:3000)
   │   axios calls such as /auth/login (relative URLs)
   ▼
React dev server  ──proxy──►  Flask Hospital A (127.0.0.1:5001)  ──►  PostgreSQL (127.0.0.1:5432)
                                     │
                                     └── direct REST sync ──► Hospital B (:5002), Hospital C (:5003)
```

The React dev server forwards API requests to Flask (`"proxy"` in `frontend/package.json`), so the browser never makes a cross-origin request and **no CORS configuration is needed**.

No Kafka, RabbitMQ, or other message broker is used. Failed inventory syncs are retried by an APScheduler background job.

## Technology

**Frontend:** React (Create React App), React Router, Axios, Tailwind CSS, Lucide React, React Hot Toast, Recharts.

**Backend:** Python, Flask, PostgreSQL, psycopg2, requests, PyJWT, APScheduler.

## Repository structure

```text
Blood-Bank/
├── backend/
│   ├── app.py                 # Flask entry point and health endpoint
│   ├── config.py              # Runtime configuration
│   ├── db.py                  # PostgreSQL access
│   ├── requirements.txt
│   ├── common/                # Authentication, HTTP, validation helpers
│   ├── auth/routes.py         # Register, login, current user
│   ├── blood/routes.py        # Search and inventory
│   ├── emergency/routes.py    # Local emergency requests
│   ├── notifications/routes.py
│   ├── admin/routes.py        # Hospital directory and reports
│   └── sync/                  # Internal sync endpoint and sync service
├── database/
│   ├── hospital_a.sql         # Schema + seed data for Hospital A
│   ├── hospital_b.sql         # Schema + seed data for Hospital B
│   └── hospital_c.sql         # Schema + seed data for Hospital C
├── scripts/                   # Helper scripts (smoke_test.ps1)
├── deliverable3/
├── deliverable4/
├── frontend/
│   ├── package.json           # contains the "proxy" setting
│   ├── tailwind.config.js
│   └── src/
│       ├── App.js             # Routes
│       ├── components/        # Navbar, footer, ProtectedRoute, shared UI, charts
│       ├── context/           # AuthContext (JWT + user)
│       ├── hooks/             # useFetch
│       ├── layouts/           # DashboardLayout (role-based sidebar)
│       ├── pages/             # Home, auth, BloodSearch, Notifications,
│       │                      # patient/, staff/, admin/
│       ├── services/          # api.js (Axios client), endpoints.js
│       └── utils/             # Formatting and helper functions
├── start-node.ps1             # Starts one hospital backend (see step 8.6)
├── .gitignore
└── README.md
```

## Prerequisites

Install these first (Windows):

| Software | Notes |
|---|---|
| **Git** | https://git-scm.com |
| **Python 3** | Tick "Add python.exe to PATH" in the installer |
| **Node.js LTS** (includes npm) | https://nodejs.org |
| **PostgreSQL** (server + command-line tools) | Remember the password you set for the `postgres` user. Keep the default port `5432`. |
| **VS Code** | https://code.visualstudio.com |

Docker is **not** required.

Check the installs in the VS Code terminal:

```powershell
git --version
python --version
node --version
npm --version
```

All four must print a version. If one says "not recognized", close and reopen VS Code (or restart Windows) so the PATH refreshes.

---

## How to run (step by step)

All commands below are for the **VS Code integrated terminal using PowerShell**. Open it with **Ctrl + `** (backtick), or **Terminal → New Terminal**. If the terminal shows Git Bash or cmd, use the dropdown next to the **+** button and pick **PowerShell**.

> **Windows tip:** "Run once" steps are only needed the first time you set up the project. "Every time" steps are what you repeat each day.

### 8.1 Clone the repository and open it (run once)

```powershell
git clone https://github.com/aliwaqar04/Blood-Bank.git
cd Blood-Bank
code .
```

`code .` reopens VS Code inside the project folder. Open a new terminal there (Ctrl + `). **Every command below assumes your terminal is at the repository root (`Blood-Bank`) unless it says otherwise.** Check with:

```powershell
Get-Location
```

### 8.2 Allow PowerShell scripts (run once)

This lets you run `start-node.ps1` later:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

Type `Y` if asked to confirm.

### 8.3 Verify PostgreSQL is running (run once, and whenever the database misbehaves)

```powershell
Get-Service *postgres*
Test-NetConnection 127.0.0.1 -Port 5432
```

Expected: the service shows `Running`, and the second command shows `TcpTestSucceeded : True`.

If the service is stopped, start it (PowerShell must be run as administrator for this), replacing the name with the one `Get-Service` showed:

```powershell
Start-Service postgresql-x64-18
```

### 8.4 Make `psql` available in this terminal (run in every new terminal you use for database commands)

`psql` is usually not on the PATH after installing PostgreSQL. Add it for the current terminal only. **Change `18` to your installed PostgreSQL version** (look inside `C:\Program Files\PostgreSQL\` to see the folder name):

```powershell
$env:Path += ";C:\Program Files\PostgreSQL\18\bin"
psql --version
```

Expected: a version such as `psql (PostgreSQL) 18.x`.

To avoid typing the database password repeatedly, set it for this terminal session only (replace `YOUR_POSTGRES_PASSWORD`):

```powershell
$env:PGPASSWORD = "YOUR_POSTGRES_PASSWORD"
```

### 8.5 Create the databases and load the schema + seed data (run once)

Run this from the repository root. It creates the three databases, loads each `database/hospital_x.sql` file into the matching database, and points each hospital's directory entries at `127.0.0.1` so the nodes can reach each other locally:

```powershell
foreach ($n in "a", "b", "c") {
    psql -U postgres -h 127.0.0.1 -c "CREATE DATABASE blood_bank_hospital_$n;"
    psql -U postgres -h 127.0.0.1 -d "blood_bank_hospital_$n" -v ON_ERROR_STOP=1 -f "database\hospital_$n.sql"
    psql -U postgres -h 127.0.0.1 -d "blood_bank_hospital_$n" -c "UPDATE hospitals SET api_url = CASE id WHEN 'A' THEN 'http://127.0.0.1:5001' WHEN 'B' THEN 'http://127.0.0.1:5002' WHEN 'C' THEN 'http://127.0.0.1:5003' END;"
}
```

Notes:

- `ERROR: database "..." already exists` just means that database was created earlier. It is harmless and the loop continues.
- The SQL files begin with `DROP TABLE IF EXISTS ...`. **Running them again wipes and re-seeds that database.**
- If you only need to run Hospital A (enough for frontend work), you can run the loop for `"a"` only: `foreach ($n in "a") { ... }`.

Verify the data loaded (expect 3 users and 24 inventory rows in Hospital A):

```powershell
psql -U postgres -h 127.0.0.1 -d blood_bank_hospital_a -c "SELECT email, role FROM users;" -c "SELECT COUNT(*) FROM blood_inventory;"
```

### 8.6 Install the backend (run once)

Create a virtual environment inside `backend` and install the dependencies. These commands call the virtual environment's Python directly, so you do not need to activate it:

```powershell
python -m venv backend\.venv
.\backend\.venv\Scripts\python.exe -m pip install --upgrade pip
.\backend\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
```

Create the helper script `start-node.ps1` in the **repository root** (skip this if the file already exists in the repo). It asks for your PostgreSQL password, URL-encodes it (so characters such as `@` or `#` are safe), sets the environment variables for the chosen hospital, and starts Flask:

```powershell
@'
# Usage: .\start-node.ps1 -Node A    (or B / C)
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("A", "B", "C")]
    [string]$Node
)

$ports = @{ A = 5001; B = 5002; C = 5003 }
$dbs   = @{ A = "blood_bank_hospital_a"; B = "blood_bank_hospital_b"; C = "blood_bank_hospital_c" }

$secure = Read-Host "PostgreSQL password" -AsSecureString
$pw  = [System.Net.NetworkCredential]::new("", $secure).Password
$enc = [uri]::EscapeDataString($pw)

$env:HOSPITAL_ID        = $Node
$env:DATABASE_URL       = "postgresql://postgres:$enc@127.0.0.1:5432/$($dbs[$Node])"
$env:SYNC_SHARED_SECRET = "smart-blood-bank-demo-secret"   # must be identical on every node
$env:JWT_SECRET_KEY     = "smart-blood-bank-demo-jwt-secret"

Set-Location "$PSScriptRoot\backend"
$venvPython = Join-Path $PSScriptRoot "backend\.venv\Scripts\python.exe"
$py = if (Test-Path $venvPython) { $venvPython } else { "python" }

Write-Host "Starting Hospital $Node on http://127.0.0.1:$($ports[$Node]) ..." -ForegroundColor Green
& $py -m flask --app app run --host=127.0.0.1 --port=$($ports[$Node]) --no-debugger --no-reload
'@ | Set-Content -Path start-node.ps1 -Encoding utf8
```

### 8.7 Install the frontend (run once)

```powershell
cd frontend
npm ci
```

If `npm ci` reports that the lockfile is out of sync, run `npm install` instead.

Create the frontend `.env` file (it is git-ignored, so every machine creates its own). The value must be **empty** so the browser uses the dev proxy:

```powershell
Set-Content -Path .env -Value "REACT_APP_API_URL=" -Encoding ascii
```

> **Important:** if `REACT_APP_API_URL` is set to `http://127.0.0.1:5001`, the browser bypasses the proxy and every request fails with **"Network Error"** (CORS).

Check the proxy and the API client are configured:

```powershell
Select-String -Path package.json -Pattern '"proxy"'
Select-String -Path src\services\api.js -Pattern 'baseURL'
```

Expected output:

```text
"proxy": "http://127.0.0.1:5001",
baseURL: process.env.REACT_APP_API_URL || "",
```

If the `"proxy"` line is missing, add it with:

```powershell
node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync('package.json','utf8'));p.proxy='http://127.0.0.1:5001';fs.writeFileSync('package.json',JSON.stringify(p,null,2)+'\n')"
```

Return to the repository root:

```powershell
cd ..
```

### 8.8 Start the application (every time)

Use **two terminals**: backend first, then frontend. Click the **+** in the VS Code terminal panel to open a second one.

**Terminal 1: backend (Hospital A)**

```powershell
cd Blood-Bank
.\start-node.ps1 -Node A
```

Enter your PostgreSQL password when asked (nothing shows while you type). Wait for:

```text
Running on http://127.0.0.1:5001
```

Leave this terminal open.

**Terminal 2: check the backend, then start the frontend**

```powershell
Invoke-RestMethod http://127.0.0.1:5001/health
```

Expected: `status: ok`. Then:

```powershell
cd Blood-Bank\frontend
npm start
```

The browser opens at **http://localhost:3000**. If it doesn't, open that address yourself.

### 8.9 Sign in and test

1. Go to **http://localhost:3000/login**.
2. Sign in with `admina@smartblood.local` / `Admin@123`.
3. You should land on the Admin dashboard with the network stock chart.

### 8.10 Optional: also run Hospitals B and C (for inventory sync)

Only needed to test synchronization between hospitals. Each hospital needs its own terminal:

```powershell
cd Blood-Bank
.\start-node.ps1 -Node B
```

```powershell
cd Blood-Bank
.\start-node.ps1 -Node C
```

While B and C are not running, Hospital A logs "Sync retry cycle failed" or connection errors for ports 5002/5003. This is expected: A queues the updates and retries. It does not affect normal use.

To point the frontend at a different hospital, change `"proxy"` in `frontend/package.json` to `http://127.0.0.1:5002` (or `5003`) and restart `npm start`. Then sign in with that hospital's accounts. Users are local to each hospital.

### 8.11 Stop everything

Press **Ctrl + C** in each terminal. To close the frontend and backend at once, close the terminals with the trash-can icon.

### 8.12 Quick start (after the first setup)

```powershell
# Terminal 1
cd Blood-Bank
.\start-node.ps1 -Node A

# Terminal 2
cd Blood-Bank\frontend
npm start
```

Open http://localhost:3000.

---

## Demo accounts

The seed scripts create demo accounts in each hospital database. Users are **not** synchronized between hospitals.

| Role | Hospital A account | Password |
|---|---|---|
| Admin | `admina@smartblood.local` | `Admin@123` |
| Staff | `staffa@smartblood.local` | `Admin@123` (seeded with the same password hash as the admin; verify on first login) |
| Patient | `patienta@smartblood.local` | `Admin@123` (same note as above) |

Hospitals B and C follow the same pattern (for example `adminb@smartblood.local`, `patientc@smartblood.local`). You can also create new patient accounts from the **Register** page.

These credentials are for local development only.

## Frontend pages

| Role | Pages |
|---|---|
| Public | Home (`/`), Login (`/login`), Register (`/register`) |
| Any signed-in user | Blood search (`/blood-search`) |
| Patient | Dashboard, Emergency requests (create and track), Notifications |
| Staff | Dashboard, Inventory management (edit own hospital's stock), Emergency requests (accept/reject), Notifications |
| Admin | Dashboard, Network reports (charts, low-stock alerts), Hospital management, Notifications |

Each role is redirected to its own dashboard after login, and the backend enforces role permissions on protected operations.

## API overview

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/auth/register` | Register a local patient |
| POST | `/auth/login` | Login and obtain a JWT (`{ token, user }`) |
| GET | `/auth/me` | Get current authenticated user |
| GET | `/blood/search?group=&city=` | Search inventory |
| GET | `/blood/inventory` | Read inventory for all hospitals |
| PUT | `/blood/inventory` | Update inventory (staff/admin) and synchronize |
| POST | `/emergency` | Create local emergency request |
| GET | `/emergency` | List requests visible to the user/role |
| PUT | `/emergency/<id>/accept` | Accept a pending request |
| PUT | `/emergency/<id>/reject` | Reject a pending request |
| GET | `/notifications` | Read local notifications |
| PUT | `/notifications/<id>/read` | Mark a notification read |
| GET | `/admin/hospitals` | List hospital directory |
| POST | `/admin/hospitals` | Register/update hospital metadata |
| GET | `/admin/reports` | Get admin reports |
| GET | `/health` | Health check |
| POST | `/sync/receive` | Internal: receive an inventory sync event (not for the frontend) |

Protected routes use `Authorization: Bearer <token>`. The token expires after roughly 8 hours; the frontend signs the user out automatically when it expires. The internal sync endpoint is protected by the shared secret.

Quick API test from PowerShell (Hospital A must be running):

```powershell
$body = @{ email = "admina@smartblood.local"; password = "Admin@123" } | ConvertTo-Json
$login = Invoke-RestMethod -Uri http://127.0.0.1:5001/auth/login -Method Post -ContentType "application/json" -Body $body
$headers = @{ Authorization = "Bearer $($login.token)" }

Invoke-RestMethod "http://127.0.0.1:5001/blood/search?group=O%2B&city=Karachi" -Headers $headers
Invoke-RestMethod "http://127.0.0.1:5001/blood/inventory" -Headers $headers
```

## Environment variables

| Variable | Used by | Purpose |
|---|---|---|
| `HOSPITAL_ID` | Backend | Node identity: `A`, `B`, or `C` |
| `DATABASE_URL` | Backend | PostgreSQL URL for that node |
| `SYNC_SHARED_SECRET` | Backend | Shared secret for node synchronization (identical on all nodes) |
| `JWT_SECRET_KEY` | Backend | JWT signing/validation secret |
| `REACT_APP_API_URL` | Frontend | Leave **empty** for local development (uses the dev proxy) |

`start-node.ps1` sets all backend variables for you. Passwords containing URL-reserved characters must be URL-encoded in `DATABASE_URL` (the script does this automatically).

## Troubleshooting

| Problem | Cause and fix |
|---|---|
| Login shows **"Network Error"** | `frontend\.env` contains a real `REACT_APP_API_URL`, or the proxy isn't set. Set `REACT_APP_API_URL=` (empty), confirm `"proxy"` exists in `frontend/package.json`, then stop and restart `npm start`. |
| `psql` is "not recognized" | Run step 8.4 in the same terminal (check the PostgreSQL folder version number). |
| `.\start-node.ps1` is "cannot be loaded because running scripts is disabled" | Run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` and retry. |
| `password authentication failed for user "postgres"` | Wrong PostgreSQL password. Restart the node and re-enter it, or fix `$env:PGPASSWORD`. |
| `Connection refused` on port 5432 | PostgreSQL isn't running. Run step 8.3. |
| Login returns a 500 error | Database not reachable or schema not loaded. Check the backend terminal output and re-run step 8.5. |
| `relation "users" does not exist` | The schema wasn't loaded into that database (step 8.5), or the node points at the wrong database. |
| `permission denied to create extension "pgcrypto"` | The SQL was loaded with a non-superuser. Run step 8.5 with `-U postgres`. |
| `Invoke-RestMethod : Unable to connect to the remote server` | The backend isn't running. Start it again in its own terminal and leave it open. |
| `Port 5001 is already in use` | Another Flask instance is running. Close old terminals, or find the process: `netstat -ano \| findstr :5001`. |
| Port 3000 busy | CRA offers to use 3001. Accept; the proxy still works. |
| Redirected to the login page after a while | The JWT expired (about 8 hours). Sign in again. |
| Frontend dependency/build error | Run `npm ci` (or `npm install`) inside `frontend/` and use a supported Node.js LTS version. |
| "Sync retry cycle failed" in Hospital A's terminal | Hospitals B/C are not running. Harmless; updates are queued and retried. |
| Changed `package.json` or `.env` but nothing changed | CRA only reads them at startup. Stop with Ctrl+C and run `npm start` again. |

## Security notes

- The documented `Admin@123` seed password is for development and testing only.
- Replace the example JWT and sync secrets outside a local demo.
- Never commit `.env`, database passwords, access tokens, `.venv/`, `node_modules/`, or build output.
- Do not expose Flask's development server directly to the public internet.

## Development checklist

- [x] PostgreSQL installed and reachable on port 5432.
- [x] Hospital A database created with schema and seed data applied.
- [x] Hospital A starts on port 5001 and `/health` responds.
- [x] JWT login works from the React frontend through the dev proxy.
- [x] Blood search, inventory, notifications, hospital and report endpoints return data.
- [ ] Hospitals B and C created, started, and configured with correct peer URLs.
- [ ] Registration and role restrictions verified for patient and staff accounts.
- [ ] Emergency request create / accept / reject flow verified end to end.
- [ ] Inventory synchronization and retry behavior verified between nodes.
- [ ] Admin hospital add/update verified.

## Contributing

Create a feature branch, make a focused change, test the relevant functionality, and open a pull request. Commit both `package.json` and `package-lock.json` when frontend dependencies change. Never commit secrets, virtual environments, `node_modules`, or generated build output.
