# Smart Blood Bank Network

A three-node distributed blood bank management system. Each hospital runs a Flask REST API and a separate PostgreSQL database. Blood inventory is synchronized between hospitals over direct REST requests; user accounts, emergency requests, and notifications remain local to each hospital.

> **Status:** Development setup is ongoing. Flask's `/health` endpoint responded successfully, but PostgreSQL was not reachable during initial setup. Database schema/seed initialization and full end-to-end tests must be completed before considering the application fully operational.

## Architecture

| Hospital | Flask port | Database |
|---|---:|---|
| A | 5001 | `blood_bank_hospital_a` |
| B | 5002 | `blood_bank_hospital_b` |
| C | 5003 | `blood_bank_hospital_c` |

The application uses Flask, PostgreSQL (`psycopg2-binary`), `requests` for direct hospital-to-hospital REST calls, PyJWT for authentication, and APScheduler for retrying failed synchronization deliveries. No Kafka, RabbitMQ, or other message broker is used.

## Technology

**Frontend:** React with Create React App (`react-scripts`), React Router, Axios, Tailwind CSS, Lucide React, React Hot Toast, Recharts.

**Backend:** Python, Flask, PostgreSQL, psycopg2, requests, PyJWT, APScheduler.

## Repository structure

```text
Blood-Bank/
├── backend/
│   ├── app.py                 # Flask entry point and health endpoint
│   ├── config.py              # Runtime configuration
│   ├── db.py                  # PostgreSQL access
│   ├── .env.example
│   ├── requirements.txt
│   ├── common/                # Authentication, HTTP, validation helpers
│   ├── auth/routes.py         # Register, login, current user
│   ├── blood/routes.py        # Search and inventory
│   ├── emergency/routes.py    # Local emergency requests
│   ├── notifications/routes.py
│   ├── admin/routes.py        # Hospital directory and reports
│   └── sync/                  # Internal sync endpoint and sync service
├── database/                  # Database initialization assets (inspect contents)
├── scripts/                   # Helper scripts
├── deliverable3/
├── deliverable4/
├── frontend/
│   ├── package.json
│   ├── package-lock.json
│   ├── tailwind.config.js
│   └── src/
│       ├── App.js
│       ├── index.js
│       ├── index.css
│       ├── components/        # Navbar, footer, sidebar, protected route
│       ├── context/           # Authentication context
│       ├── layouts/           # Shared dashboard layout
│       ├── pages/             # Home, auth, patient, staff, admin, blood search
│       └── services/api.js    # Axios client and JWT header
├── .gitignore
├── README_DELIVERABLE_2.md
└── README.md
```

This is a documented overview of the known structure; inspect the repository for any additional files.

## Prerequisites

Install:
1. Git
2. Python 3 compatible with `backend/requirements.txt`
3. Node.js LTS and npm
4. PostgreSQL Server and command-line tools

Docker is not required for the documented local setup.

Verify installations:

```bash
git --version
python --version
node --version
npm --version
```

## Clone the repository

```bash
git clone https://github.com/aliwaqar04/Blood-Bank.git
cd Blood-Bank
```

## Configure PostgreSQL

Install PostgreSQL, set a password for the `postgres` user, and keep port `5432` unless your setup requires another port.

Create the three databases using pgAdmin or `psql`:

```bash
psql -U postgres -h 127.0.0.1 -p 5432 -c "CREATE DATABASE blood_bank_hospital_a;"
psql -U postgres -h 127.0.0.1 -p 5432 -c "CREATE DATABASE blood_bank_hospital_b;"
psql -U postgres -h 127.0.0.1 -p 5432 -c "CREATE DATABASE blood_bank_hospital_c;"
```

Creating databases alone is **not enough**: tables and seed data must also be applied. Inspect `database/`, `scripts/`, and `README_DELIVERABLE_2.md` and run the initialization SQL/script provided by the repository against each database. Do not guess a script filename. If the repository has no schema/seed script, add and document one before expecting a fresh clone to work end to end.

Check PostgreSQL is listening:

```powershell
Test-NetConnection 127.0.0.1 -Port 5432
```

Expected: `TcpTestSucceeded : True`.

## Backend setup

Open a terminal at the repository root.

### Create a virtual environment

**Git Bash:**

```bash
cd backend
python -m venv .venv
source .venv/Scripts/activate
```

**PowerShell:**

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

### Install dependencies

```bash
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

### Configure Hospital A

Replace `YOUR_POSTGRES_PASSWORD` with your local PostgreSQL password.

**Git Bash:**

```bash
export HOSPITAL_ID="A"
export DATABASE_URL="postgresql://postgres:YOUR_POSTGRES_PASSWORD@127.0.0.1:5432/blood_bank_hospital_a"
export SYNC_SHARED_SECRET="replace-with-a-local-random-secret"
export JWT_SECRET_KEY="replace-with-a-local-random-jwt-secret"
flask --app app run --host=127.0.0.1 --port=5001 --no-debugger --no-reload
```

**PowerShell:**

```powershell
$env:HOSPITAL_ID = "A"
$env:DATABASE_URL = "postgresql://postgres:YOUR_POSTGRES_PASSWORD@127.0.0.1:5432/blood_bank_hospital_a"
$env:SYNC_SHARED_SECRET = "replace-with-a-local-random-secret"
$env:JWT_SECRET_KEY = "replace-with-a-local-random-jwt-secret"
flask --app app run --host=127.0.0.1 --port=5001 --no-debugger --no-reload
```

Keep this terminal open. Test the API from another terminal:

```powershell
Invoke-RestMethod http://127.0.0.1:5001/health
```

Expected response:

```json
{"status":"ok"}
```

A successful health response proves Flask is responding; it does not prove the database connection works.

### Run Hospital B and C

Open separate terminals for each additional node. Activate the backend virtual environment in each terminal and set the node-specific variables before running Flask.

Hospital B:
- `HOSPITAL_ID=B`
- database `blood_bank_hospital_b`
- port `5002`

Hospital C:
- `HOSPITAL_ID=C`
- database `blood_bank_hospital_c`
- port `5003`

For example, the final command for B is:

```bash
flask --app app run --host=127.0.0.1 --port=5002 --no-debugger --no-reload
```

For C, use port `5003`. Set `DATABASE_URL`, `HOSPITAL_ID`, `SYNC_SHARED_SECRET`, and `JWT_SECRET_KEY` correctly in each terminal first. Configure the `hospitals.api_url` records in each database to use `http://127.0.0.1:5001`, `:5002`, and `:5003` as appropriate; use the project's initialization procedure rather than inventing a seed command.

## Frontend setup

Open a separate terminal at the repository root:

```bash
cd frontend
npm ci
npm start
```

`npm ci` installs dependencies from the committed lockfile. The Create React App development server normally runs at `http://localhost:3000`. Do not run these commands from the repository root; `package.json` is inside `frontend/`.

The API client defaults to Hospital A at `http://127.0.0.1:5001`. If `src/services/api.js` supports `REACT_APP_API_URL`, you can override it before starting CRA.

**Git Bash:**

```bash
export REACT_APP_API_URL="http://127.0.0.1:5001"
npm start
```

**PowerShell:**

```powershell
$env:REACT_APP_API_URL = "http://127.0.0.1:5001"
npm start
```

Change the port to `5002` or `5003` to target another node. Set CRA environment variables before starting the development server.

## API overview

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/auth/register` | Register a local patient |
| POST | `/auth/login` | Login and obtain a JWT |
| GET | `/auth/me` | Get current authenticated user |
| GET | `/blood/search?group=&city=` | Search inventory |
| GET | `/blood/inventory` | Read inventory (staff/admin) |
| PUT | `/blood/inventory` | Update inventory and synchronize |
| POST | `/emergency` | Create local emergency request |
| GET | `/emergency` | List requests visible to user/role |
| PUT | `/emergency/<id>/accept` | Accept a pending request |
| PUT | `/emergency/<id>/reject` | Reject a pending request |
| GET | `/notifications` | Read local notifications |
| PUT | `/notifications/<id>/read` | Mark a notification read |
| GET | `/admin/hospitals` | List hospital directory |
| POST | `/admin/hospitals` | Register/update hospital metadata |
| GET | `/admin/reports` | Get admin reports |
| POST | `/sync/receive` | Receive an internal inventory sync event |

Protected routes use `Authorization: Bearer <token>`. Backend role checks must authorize protected operations. The internal synchronization endpoint uses the configured shared secret.

## API smoke tests (PowerShell)

After the schema and seed data have been applied and Hospital A is running:

```powershell
$body = @{ email = "admina@smartblood.local"; password = "Admin@123" } | ConvertTo-Json
$login = Invoke-RestMethod -Uri http://127.0.0.1:5001/auth/login -Method Post -ContentType "application/json" -Body $body
$token = $login.token
$headers = @{ Authorization = "Bearer $token" }
```

The documented seed account is `admina@smartblood.local` / `Admin@123`, but it works only if the database seed process created it. Confirm that the actual login response uses a `token` property.

Search inventory:

```powershell
Invoke-RestMethod "http://127.0.0.1:5001/blood/search?group=O%2B&city=Karachi"
```

Update inventory (this changes data and may synchronize it to peers):

```powershell
$body = @{ blood_group = "O+"; units = 25 } | ConvertTo-Json
Invoke-RestMethod -Uri http://127.0.0.1:5001/blood/inventory -Method Put -Headers $headers -ContentType "application/json" -Body $body
```

The search results depend on seeded inventory; do not assume a particular record exists.

## Environment variables

| Variable | Purpose |
|---|---|
| `HOSPITAL_ID` | Node identity: `A`, `B`, or `C` |
| `DATABASE_URL` | PostgreSQL URL for that node |
| `SYNC_SHARED_SECRET` | Shared secret for node synchronization |
| `JWT_SECRET_KEY` | JWT signing/validation secret |
| `REACT_APP_API_URL` | Optional frontend API base URL |

Do not commit passwords or real secrets. Passwords containing URL-reserved characters must be URL-encoded in `DATABASE_URL`. All nodes that communicate must use the same sync secret.

## Troubleshooting

- **Port 5432 refuses connections:** PostgreSQL is stopped, not installed, or configured on another port. Start the PostgreSQL service and recheck `Test-NetConnection`.
- **`psycopg2.OperationalError: connection refused`:** verify PostgreSQL is running and `DATABASE_URL` has the correct host, port, and database.
- **Password authentication failed:** check the local PostgreSQL password and URL-encode reserved characters.
- **Database does not exist:** create the three databases and apply the repository's schema/seed initialization.
- **Relation/table does not exist:** schema initialization has not run or the wrong database is configured.
- **`flask` not found:** activate `.venv` and install `backend/requirements.txt`.
- **Frontend dependency/build error:** run `npm ci` inside `frontend/` and use a supported Node.js LTS version.
- **Frontend cannot reach backend:** confirm the Flask process, API URL, browser console, and CORS settings.

## Security notes

- The documented `Admin@123` seed password is for development/testing only.
- Replace example JWT and synchronization secrets outside a local demo.
- Never commit `.env`, database passwords, access tokens, `.venv/`, `node_modules/`, or generated build output.
- Do not expose Flask's development server directly to the public internet.

## Development checklist

- [ ] PostgreSQL is installed and reachable on port 5432.
- [ ] All three hospital databases exist.
- [ ] Schema and seed data have been applied to all databases.
- [ ] Hospital peer API URLs are configured correctly.
- [ ] A, B, and C start on ports 5001, 5002, and 5003.
- [ ] JWT login, registration, and role restrictions work.
- [ ] Blood search and inventory updates work.
- [ ] Inventory synchronization and retry behavior work.
- [ ] Emergency requests and local notifications work.
- [ ] Admin hospital/report endpoints work.
- [ ] Frontend runs using `npm ci` and `npm start`.
- [ ] Frontend successfully calls the selected backend.

## Contributing

Create a feature branch, make a focused change, test the relevant functionality, and open a pull request. Commit both `package.json` and `package-lock.json` when frontend dependencies change. Never commit secrets, virtual environments, `node_modules`, or generated build output.
