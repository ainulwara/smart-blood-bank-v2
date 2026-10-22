# Smart Blood Bank Network — Deliverable 3
## Large-scale schema, synthetic data generator, 50M-row loading, and database performance

This is an **add-on** for the existing `sbb-deliverable-2` project. It does not replace the D1/D2 backend and does not alter operational tables such as `blood_inventory`, `users`, `emergency_requests`, `notifications`, or `sync_log`.

### Scope and data design

- Adds `analytics.historical_demand`, a separate historical dataset for database-scale testing and the later statistical forecasting deliverable.
- Uses PostgreSQL declarative **yearly range partitions** on `event_date` plus a default partition.
- Generates synthetic, non-personal records with seasonal variation, blood group, units requested/fulfilled, status, wait time, and request channel.
- Default target is **50,000,000 rows total across all three existing databases**, split as evenly as possible: A = 16,666,667, B = 16,666,667, C = 16,666,666.
- The loader uses PostgreSQL `COPY` in committed batches, not 50 million individual `INSERT` calls and not a huge intermediate CSV file.
- Re-running the loader is additive and resumable: it fills each hospital database up to its target and **does not delete existing data**.
- Secondary indexes are intentionally created **after** the large load to avoid slowing the bulk ingest.

These are synthetic history records. They are not real patient data, and they are not inserted into the live `emergency_requests` table. This keeps operational behaviour local to each hospital and keeps analytics separate from the D1/D2 sync mechanism.

## Folder contents

```text
deliverable3/
├── README_DELIVERABLE_3.md
├── sql/
│   ├── 01_create_analytics_schema.sql
│   ├── 02_create_indexes_after_load.sql
│   └── 03_benchmark_queries.sql
└── scripts/
    ├── load_synthetic_data.py
    └── benchmark.py
```

## Before the 50-million-row load

1. Confirm PostgreSQL 18 is running and these existing databases are present:
   - `blood_bank_hospital_a`
   - `blood_bank_hospital_b`
   - `blood_bank_hospital_c`
2. Back up any important databases before a large data operation.
3. Check free disk space. **Plan for roughly 20–30 GB of free space as a cautious starting allowance** for 50M rows, indexes, WAL and temporary overhead. Actual usage varies with PostgreSQL settings and row/index sizes. The 10,000-row trial below lets you measure real storage growth before committing to the full load.
4. Run the schema SQL in each of the three databases. Do not rerun the D1 schema scripts.
5. Perform a small trial first. Do not begin with 50M rows on the first run.

## Step-by-step execution on Windows / PowerShell

Commands below assume the project root remains:

```text
C:\Users\NM TRADERS\Desktop\sbb-deliverable-2
```

Copy the supplied `deliverable3` folder into that root so you have:

```text
sbb-deliverable-2\
├── backend\                 # existing D2 backend — keep it
├── scripts\                 # existing D2 smoke tests — keep them
└── deliverable3\            # new D3 files
```

### Step 1 — Apply the new schema to Hospital A

In pgAdmin, open **`blood_bank_hospital_a` → Query Tool**. Open and execute:

```text
deliverable3\sql\01_create_analytics_schema.sql
```

### Step 2 — Apply the same schema to Hospital B and C

Repeat the same script in `blood_bank_hospital_b` and `blood_bank_hospital_c`.

This script only adds the `analytics` schema and its historical-demand partitions. It does not drop or change existing D1/D2 tables.

### Step 3 — Activate the existing D2 Python environment

Open a new PowerShell terminal and run:

```powershell
cd "$HOME\Desktop\sbb-deliverable-2"
.\backend\.venv\Scripts\Activate.ps1
```

Check that the driver exists:

```powershell
python -c "import psycopg2; print('psycopg2 OK')"
```

If that import fails, install the driver in this environment:

```powershell
python -m pip install psycopg2-binary
```

### Step 4 — Run a small 10,000-row trial

```powershell
python .\deliverable3\scripts\load_synthetic_data.py --target-total-rows 10000
```

Enter your PostgreSQL `postgres` password when prompted. It is not saved in the script. This creates roughly 3,333–3,334 rows per database.

Expected ending: a row-count summary showing approximately **10,000 total rows**. The initial schema must have been created in all three databases first.

### Step 5 — Verify the trial in pgAdmin

Run this query in each database:

```sql
SELECT hospital_id, count(*) AS rows_loaded,
       min(event_date) AS first_event_date,
       max(event_date) AS last_event_date
FROM analytics.historical_demand
GROUP BY hospital_id;
```

Hospital A's rows should have `hospital_id = 'A'`, B's should have `B`, and C's should have `C`.

You can also run:

```sql
SELECT count(*) FROM analytics.historical_demand;
```

### Step 6 — Load up to 50 million rows total

Only proceed after the small trial works and free disk space is confirmed.

```powershell
python .\deliverable3\scripts\load_synthetic_data.py --target-total-rows 50000000 --batch-rows 20000
```

The script detects how many rows already exist and adds only the rows needed to reach each database's target. It commits every batch. It can take a long time on a personal computer. If interrupted, re-run the same command; committed batches remain and the loader continues toward the target.

**Do not close or shut down PostgreSQL during the load.** The Flask app terminals may remain running, but the data loader itself connects directly to PostgreSQL.

### Step 7 — Create secondary indexes after the load

Execute `deliverable3\sql\02_create_indexes_after_load.sql` in each database once the data load has finished. It creates indexes for:

- blood-group + date search;
- city + blood-group + date search;
- request status + date filtering.

The script also runs `ANALYZE` so PostgreSQL can update query-planner statistics.

### Step 8 — Run performance benchmarks

From the project root, with the D2 `.venv` active:

```powershell
python .\deliverable3\scripts\benchmark.py
```

Enter the PostgreSQL password when prompted. It reports per-database row counts, table-plus-index size, a selective blood-search runtime, `EXPLAIN ANALYZE`/buffer details, and monthly aggregation runtime.

For manual plan output, you can also run `deliverable3\sql\03_benchmark_queries.sql` in a Query Tool. The sample city in that file is Karachi; change it to Lahore or Islamabad when benchmarking B or C.

## What to capture for your project report

Record these values after the load:

- row count in A, B, C and total (target 50,000,000 total);
- elapsed loading time and approximate load rate from the script;
- relation size for each database;
- selected search runtime and `EXPLAIN (ANALYZE, BUFFERS)` output;
- monthly aggregate runtime for the forecasting model's future input.

Do not claim one-million-user capacity from this deliverable. This deliverable proves that the data layer can be populated and measured at 50M synthetic historical records. Concurrent-user capacity is a separate later load-testing task that requires actual traffic measurements.

## Safety / recovery notes

- There is no `DROP TABLE`, `TRUNCATE`, or destructive reset in these scripts.
- Do not run 50M rows as the first trial; use 10,000 first, check disk space and confirm the schema/driver work.
- Keep the original D1 and D2 folders/files as backup/reference.
- Do not rerun the original D1 SQL scripts to set up this deliverable.
- The historical analytics rows are not synchronized through `sync_log`; the operational inventory rules from D1 remain unchanged.
