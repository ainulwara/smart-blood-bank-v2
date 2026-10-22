# Smart Blood Bank Network — Deliverable 2

## Complete Flask Backend Services

This deliverable extends the working Deliverable 1 sync core into the complete Flask backend. It keeps the strict project architecture:

- Flask backend
- psycopg2 + PostgreSQL
- requests for direct hospital-to-hospital REST
- PyJWT for JWT authentication
- APScheduler for one retry worker per Flask node
- no Kafka / broker
- inventory is synchronized; users, emergency requests, and notifications remain local

## 1. Backend structure

```text
backend/
├── app.py
├── config.py
├── db.py
├── .env.example
├── requirements.txt
├── common/
│   ├── __init__.py
│   ├── auth.py
│   ├── http.py
│   └── validation.py
├── auth/
│   ├── __init__.py
│   └── routes.py
├── blood/
│   ├── __init__.py
│   └── routes.py
├── emergency/
│   ├── __init__.py
│   └── routes.py
├── notifications/
│   ├── __init__.py
│   └── routes.py
├── admin/
│   ├── __init__.py
│   └── routes.py
└── sync/
    ├── __init__.py
    ├── routes.py
    └── service.py
```

## 2. Services implemented

### Authentication

- `POST /auth/register` — creates a local patient account.
- `POST /auth/login` — verifies password and returns a JWT.
- `GET /auth/me` — returns the currently authenticated user.
- Registration is local to the current hospital database.
- Seed accounts from Deliverable 1 use password `Admin@123`.

### Blood search

- `GET /blood/search?group=&city=` — searches synchronized inventory in the local node's database. Because inventory rows for A/B/C are replicated, any node can answer the search.
- `GET /blood/inventory` — staff/admin view of the full synchronized inventory table.
- `PUT /blood/inventory` — staff/admin absolute inventory update. It writes locally, creates the origin-side sync records, then pushes to peers.

### Emergency requests

- `POST /emergency` — patient/staff/admin creates a local emergency request.
- `GET /emergency` — patients see their own requests; staff/admin see local requests.
- `PUT /emergency/<id>/accept` — staff/admin accepts when local inventory is sufficient. It reduces local inventory and creates sync delivery records.
- `PUT /emergency/<id>/reject` — staff/admin rejects a pending request.

Accepting a request is intentionally local: users and requests are not replicated between hospitals.

### Notifications

- `GET /notifications` — current user's local notifications.
- `PUT /notifications/<id>/read` — marks a notification read.
- Emergency creation notifies local staff/admin.
- Acceptance/rejection notifies the requester.
- Inventory at or below `LOW_STOCK_THRESHOLD` creates local low-stock alerts.

### Admin dashboard APIs

- `GET /admin/hospitals` — local hospital directory.
- `POST /admin/hospitals` — updates/registers metadata for A, B, or C in the current database. The project still has exactly three running hospital nodes.
- `GET /admin/reports` — network inventory summary, emergency request summary, and low-stock report from the current node's synchronized inventory plus its local request data.

### Internal synchronization

- `POST /sync/receive` — shared-secret-protected internal endpoint.
- Incoming events use last-write-wins by `(updated_at, origin_hospital_id)`.
- Equal timestamps use the hospital ID as the deterministic tiebreaker.
- The receiver never forwards a received event.
- Duplicate `sync_log.id` is a no-op.
- Failed origin-to-peer deliveries remain in `sync_log` and are retried with simple backoff.

## 3. Local three-node ports

Use these values outside Docker during Deliverable 2 development:

```text
Hospital A → Flask :5001 → PostgreSQL blood_bank_hospital_a
Hospital B → Flask :5002 → PostgreSQL blood_bank_hospital_b
Hospital C → Flask :5003 → PostgreSQL blood_bank_hospital_c
```

Update each database's `hospitals.api_url` values for local testing, as done in Deliverable 1.

## 4. Install dependencies

From `backend/`:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## 5. Start a node

Hospital A example:

```powershell
$env:HOSPITAL_ID="A"
$env:DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@127.0.0.1:5432/blood_bank_hospital_a"
$env:SYNC_SHARED_SECRET="smart-blood-bank-demo-secret"
$env:JWT_SECRET_KEY="smart-blood-bank-demo-jwt-secret"
flask --app app run --host=127.0.0.1 --port=5001 --no-debugger --no-reload
```

Use B/5002 and C/5003 with their database names for the other terminals.

## 6. API test order

### Health

```powershell
Invoke-RestMethod http://127.0.0.1:5001/health
```

Expected:

```json
{"status":"ok"}
```

### Login using seeded A admin

```powershell
$body = @{ email = "admina@smartblood.local"; password = "Admin@123" } | ConvertTo-Json
$login = Invoke-RestMethod -Uri http://127.0.0.1:5001/auth/login -Method Post -ContentType "application/json" -Body $body
$token = $login.token
```

### Search blood

```powershell
Invoke-RestMethod "http://127.0.0.1:5001/blood/search?group=O%2B&city=Karachi"
```

### Update inventory

```powershell
$headers = @{ Authorization = "Bearer $token" }
$body = @{ blood_group = "O+"; units = 25 } | ConvertTo-Json
Invoke-RestMethod -Uri http://127.0.0.1:5001/blood/inventory -Method Put -Headers $headers -ContentType "application/json" -Body $body
```

This uses the Deliverable 1 sync module; after commit it sends to B and C.

## 7. Important design decision

The five application services never directly modify another hospital's database. Only the inventory sync module communicates across hospitals. This preserves the required distributed-database boundary.

## 8. Deliverable 2 completion checkpoint

Before moving to Deliverable 3, verify:

```text
[ ] A/B/C Flask nodes start
[ ] /health works on all three
[ ] JWT login works
[ ] patient registration works
[ ] role checks reject unauthorized operations
[ ] blood search filters by group/city
[ ] inventory PUT changes the local value and synchronizes it
[ ] emergency request creation works
[ ] accept decreases inventory and synchronizes the new absolute value
[ ] reject works
[ ] notifications are local and readable
[ ] low-stock notifications appear
[ ] admin hospitals endpoint works
[ ] admin reports endpoint works
[ ] Deliverable 1 outage/retry behavior still works
```
