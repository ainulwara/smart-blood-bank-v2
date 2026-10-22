# Smart Blood Bank Network — Deliverable 4
## Statistical blood-demand forecasting model and evaluation

This is an additive package for the existing `sbb-deliverable-2` project. It reads the D3 table `analytics.historical_demand` in the existing PostgreSQL databases A/B/C. It does **not** create new databases or modify inventory, users, emergency requests, notifications, or `sync_log`.

## What it does

- Aggregates `requested_units` into monthly totals inside PostgreSQL, so the 50-million raw event rows are not copied into Python memory.
- Processes Hospital A/Karachi, B/Lahore and C/Islamabad independently.
- Forecasts the next three months by hospital and blood group using a Holt-Winters exponential-smoothing model with additive trend and annual (12-month) seasonality.
- Uses the latest 12 complete months as a holdout test, and compares Holt-Winters with a seasonal-naive baseline (repeat the previous 12 month values).
- Reports MAE, RMSE, WAPE and sMAPE; it does not assume the statistical model beats the baseline.
- Excludes the current incomplete month from the training data.
- Exports CSV, JSON summary and three PNG charts.

Synthetic demand data is for coursework and demonstration; forecasts are not clinical advice.

## Folder layout

```text
deliverable4/
├── README_DELIVERABLE_4.md
├── requirements.txt
├── sql/
│   └── 01_check_historical_data.sql
├── scripts/
│   ├── forecast_model.py
│   ├── test_model_installation.py
│   └── run_forecast.py
└── outputs/
```

## Preconditions

1. PostgreSQL 18 is running.
2. The existing databases `blood_bank_hospital_a`, `blood_bank_hospital_b`, and `blood_bank_hospital_c` exist.
3. Deliverable 3 has been loaded in those databases; each contains at least 36 **complete months** of `analytics.historical_demand` data for its hospital ID.
4. The current D2 Python virtual environment at `backend/.venv` exists.
5. Keep a backup of your project and outputs before testing; this package does not alter database tables, but the output CSV files are overwritten on subsequent runs.

## Windows / PowerShell step-by-step

### Step 1 — Add D4 to the project

Download/extract the D4 ZIP. Copy the **inner `deliverable4` folder** into the existing project root:

```text
C:\Users\NM TRADERS\Desktop\sbb-deliverable-2\deliverable4
```

Do not replace `backend`, `scripts`, or `deliverable3`.

### Step 2 — Verify files

From PowerShell:

```powershell
cd "$HOME\Desktop\sbb-deliverable-2"
Test-Path .\deliverable4\scripts\run_forecast.py
Test-Path .\deliverable4\scripts\forecast_model.py
Test-Path .\deliverable4\sql\01_check_historical_data.sql
```

All three results should be `True`.

### Step 3 — Activate the existing Python environment

```powershell
.\backend\.venv\Scripts\Activate.ps1
python --version
```

Python 3.13 is supported by current statsmodels releases. If PowerShell blocks activation, in this terminal only run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` and activate again.

### Step 4 — Install D4 packages into that same environment

```powershell
python -m pip install -r .\deliverable4\requirements.txt
```

This installs the PostgreSQL driver and forecasting/plotting libraries. It does not uninstall D1/D2 dependencies.

### Step 5 — Test the model without touching PostgreSQL

```powershell
python .\deliverable4\scripts\test_model_installation.py
```

Expected ending:

```text
PASS: dependencies import and model produced 12 finite forecasts.
Note: this test uses generated sample data; it does not connect to PostgreSQL.
```

If the test fails, stop here and keep the full error output.

### Step 6 — Confirm D3 data exists

In pgAdmin, open each existing database and execute `deliverable4\sql\01_check_historical_data.sql`. Check that `analytics.historical_demand` exists, has rows for its own hospital ID, and covers at least 36 complete months. This SQL is read-only.

### Step 7 — Run forecasting for Hospital A only first

From the project root, and with `.venv` active:

```powershell
python .\deliverable4\scripts\run_forecast.py --hospital A --horizon 3 --holdout-months 12
```

Enter your PostgreSQL `postgres` password when prompted. Do not write the password in the command or source files. The script performs read-only aggregation in `blood_bank_hospital_a`, then exports forecast/evaluation outputs. This first run limits scope while you verify everything works.

Expected results include:
- monthly aggregated rows fetched from PostgreSQL;
- a model name for each available blood group;
- a completed-run message;
- files under `deliverable4\outputs`.

### Step 8 — Inspect A's outputs

```powershell
Get-ChildItem .\deliverable4\outputs
```

Open:

- `monthly_aggregates.csv` — monthly totals produced by SQL aggregation;
- `evaluation_metrics.csv` — holdout MAE/RMSE/WAPE/sMAPE and seasonal-naive comparisons;
- `forecast_next_months.csv` — requested-unit forecasts for the next three months;
- `forecast_hospital_A.png` — chart across blood groups;
- `run_summary.json` — model, source and output summary.

Check that the CSV files contain data and that `model_lower_mae_than_baseline` is a boolean. A `False` value is not a technical failure; it means the simple baseline had lower MAE on that holdout. Report the measured result honestly.

### Step 9 — Run all three hospitals

After Hospital A succeeds:

```powershell
python .\deliverable4\scripts\run_forecast.py --horizon 3 --holdout-months 12
```

Enter the same PostgreSQL password when prompted. This processes A, B and C sequentially and updates the output files to contain all three hospitals. The SQL aggregation scans historical rows inside each database; elapsed time depends on your PC and PostgreSQL configuration.

### Optional — Repeat for 6-month forecasts

```powershell
python .\deliverable4\scripts\run_forecast.py --horizon 6 --holdout-months 12
```

This overwrites the output CSV/PNG/JSON files with the six-month forecast run. Copy previous results elsewhere first if you need to preserve both horizons.

## How the evaluation works

For each hospital and blood group:

1. PostgreSQL sums `requested_units` by month.
2. The current incomplete month is excluded.
3. The first portion of the series is used for training; the last 12 complete months are held out.
4. Holt-Winters is fit on training data and forecasts the holdout period.
5. Those forecasts are compared against actual held-out values and the seasonal-naive baseline.
6. Holt-Winters is refit to all complete historical months and forecasts the next 3 months.

Metrics:
- **MAE**: average absolute error in units.
- **RMSE**: square-root mean squared error; larger errors are penalized more.
- **WAPE**: total absolute error divided by total actual demand, as a percentage.
- **sMAPE**: symmetric percentage error, as a percentage.

## Troubleshooting

- `analytics.historical_demand is missing`: run Deliverable 3's schema script in that existing database and ensure it was loaded.
- `No completed-month historical data` or fewer than 36 months: verify D3 data/date coverage. Do not create fake operational inventory to fix it.
- `password authentication failed`: enter the PostgreSQL role password you use in pgAdmin; the script prompts securely.
- `connection refused`: ensure PostgreSQL service is running and port/host are correct. Defaults are `127.0.0.1:5432`.
- `ModuleNotFoundError`: ensure `(.venv)` is active, then reinstall `python -m pip install -r .\deliverable4\requirements.txt`.
- Forecast/model warnings: the script suppresses non-fatal optimizer warnings. A fallback model may be named in output if Holt-Winters fails for a particular series.
- Slow SQL aggregation: expected when reading millions of source rows. Let it finish, and use the reported elapsed time as part of the project's evidence. It returns only monthly aggregates to Python.
- If the script raises an exception, paste the full traceback. Do not rerun schema or loader scripts as a generic fix.

## Completion checklist

- [ ] Requirements installed in D2 `.venv`.
- [ ] `test_model_installation.py` prints PASS.
- [ ] D3 source checked in A/B/C.
- [ ] Hospital A forecasting succeeds.
- [ ] Forecast and evaluation CSVs exist and contain rows.
- [ ] Hospital B and C forecasting succeeds.
- [ ] MAE/RMSE/WAPE/sMAPE are reviewed and baseline results recorded.
- [ ] Charts and `run_summary.json` saved for report/viva.

Deliverable 4 is complete only after the database-backed run works and the generated outputs have been inspected. Syntax checks or the no-database test alone do not prove the data-backed forecast has worked.
