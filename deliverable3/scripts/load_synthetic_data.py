#!/usr/bin/env python3
"""Stream synthetic historical-demand rows into the three existing hospital DBs.

Default target is 50,000,000 rows TOTAL across A/B/C, not per database.
Rows are loaded into analytics.historical_demand only; operational tables are untouched.
"""
from __future__ import annotations

import argparse
import csv
import io
import os
import random
import sys
import time
from datetime import date, timedelta
from getpass import getpass
from typing import Iterable

try:
    import psycopg2
except ImportError:
    print("Missing dependency psycopg2. Activate the D2 .venv and run: pip install psycopg2-binary", file=sys.stderr)
    raise SystemExit(2)

DATABASES = {
    "A": ("blood_bank_hospital_a", "Karachi"),
    "B": ("blood_bank_hospital_b", "Lahore"),
    "C": ("blood_bank_hospital_c", "Islamabad"),
}
BLOOD_GROUPS = ("O+", "A+", "B+", "O-", "B-", "A-", "AB+", "AB-")
# Approximate relative frequencies to make synthetic records less uniform.
WEIGHTED_BLOOD_GROUPS = tuple(
    group for group, weight in zip(BLOOD_GROUPS, (34, 22, 18, 7, 4, 6, 7, 2)) for _ in range(weight)
)
CHANNELS = ("web", "phone", "walk_in", "emergency")
COPY_SQL = """
COPY analytics.historical_demand (
    event_date, event_id, hospital_id, city, blood_group,
    requested_units, fulfilled_units, request_status, wait_minutes, request_channel
) FROM STDIN WITH (FORMAT CSV)
"""


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--target-total-rows", type=int, default=50_000_000,
                        help="Target row count across A+B+C (default: 50,000,000). Re-running fills missing rows, without deleting existing rows.")
    parser.add_argument("--batch-rows", type=int, default=20_000,
                        help="Rows per PostgreSQL COPY transaction (default: 20,000). Lower this if memory is limited.")
    parser.add_argument("--host", default=os.getenv("PGHOST", "127.0.0.1"))
    parser.add_argument("--port", type=int, default=int(os.getenv("PGPORT", "5432")))
    parser.add_argument("--user", default=os.getenv("PGUSER", "postgres"))
    parser.add_argument("--password", default=os.getenv("PGPASSWORD"), help="Optional; safer to let the script prompt for it.")
    parser.add_argument("--start-date", default="2018-01-01", help="First synthetic event date (YYYY-MM-DD).")
    parser.add_argument("--end-date", default=date.today().isoformat(), help="Last synthetic event date (YYYY-MM-DD).")
    parser.add_argument("--seed", type=int, default=20261021, help="Base random seed for reproducible synthetic generation.")
    return parser.parse_args()


def distribute_target(total: int) -> dict[str, int]:
    base, remainder = divmod(total, len(DATABASES))
    return {hospital_id: base + (1 if index < remainder else 0)
            for index, hospital_id in enumerate(DATABASES)}


def check_date_range(start_text: str, end_text: str) -> tuple[list[tuple[str, int]], date, date]:
    try:
        start = date.fromisoformat(start_text)
        end = date.fromisoformat(end_text)
    except ValueError as exc:
        raise SystemExit(f"Invalid date: {exc}. Use YYYY-MM-DD.") from exc
    if start > end:
        raise SystemExit("--start-date must be on or before --end-date")
    days = (end - start).days
    # Cache string representations to avoid formatting a date for every row.
    options = []
    for offset in range(days + 1):
        d = start + timedelta(days=offset)
        options.append((d.isoformat(), d.month))
    return options, start, end


def connect(dbname: str, args: argparse.Namespace, password: str):
    return psycopg2.connect(
        host=args.host,
        port=args.port,
        dbname=dbname,
        user=args.user,
        password=password,
        connect_timeout=10,
        application_name="smart_blood_bank_d3_loader",
    )


def get_current_state(conn) -> tuple[int, int]:
    with conn.cursor() as cur:
        cur.execute("SELECT to_regclass('analytics.historical_demand')")
        if cur.fetchone()[0] is None:
            raise RuntimeError(
                "analytics.historical_demand is missing. Run deliverable3/sql/01_create_analytics_schema.sql "
                "in this database first."
            )
        cur.execute("SELECT count(*), COALESCE(max(event_id), 0) FROM analytics.historical_demand")
        count, max_id = cur.fetchone()
        return int(count), int(max_id)


def make_row(rng: random.Random, hospital_id: str, city: str,
             date_options: list[tuple[str, int]], event_id: int) -> tuple:
    event_date, month = date_options[rng.randrange(len(date_options))]
    blood_group = WEIGHTED_BLOOD_GROUPS[rng.randrange(len(WEIGHTED_BLOOD_GROUPS))]
    # Add mild seasonal variation so the data supports meaningful modelling exercises.
    seasonal_surge = month in (6, 7, 8, 11, 12)
    requested_units = rng.randint(1, 5 if not seasonal_surge else 7)
    roll = rng.random()
    fulfilled_cutoff = 0.76 if not seasonal_surge else 0.68
    partial_cutoff = 0.90 if not seasonal_surge else 0.86
    unfulfilled_cutoff = 0.97 if not seasonal_surge else 0.96

    if roll < fulfilled_cutoff:
        status = "fulfilled"
        fulfilled_units = requested_units
    elif roll < partial_cutoff and requested_units > 1:
        status = "partial"
        fulfilled_units = rng.randint(1, requested_units - 1)
    elif roll < unfulfilled_cutoff:
        status = "unfulfilled"
        fulfilled_units = 0
    else:
        status = "cancelled"
        fulfilled_units = 0

    wait_minutes = 0 if status == "cancelled" else rng.randint(1, 360)
    channel = CHANNELS[rng.randrange(len(CHANNELS))]
    return (event_date, event_id, hospital_id, city, blood_group, requested_units,
            fulfilled_units, status, wait_minutes, channel)


def load_hospital(hospital_id: str, dbname: str, city: str, target: int,
                  args: argparse.Namespace, password: str,
                  date_options: list[tuple[str, int]]) -> tuple[int, float]:
    conn = connect(dbname, args, password)
    started = time.perf_counter()
    try:
        existing, max_id = get_current_state(conn)
        remaining = max(0, target - existing)
        print(f"\nHospital {hospital_id} / {dbname}: existing={existing:,}; target={target:,}; to_add={remaining:,}")
        if remaining == 0:
            return existing, time.perf_counter() - started

        next_id = max_id + 1
        # Change the stream when resuming so newly generated values are not an exact repeat of the initial test run.
        rng = random.Random(args.seed + ord(hospital_id) * 1_000_003 + next_id)
        loaded = 0
        last_report = 0
        while loaded < remaining:
            this_batch = min(args.batch_rows, remaining - loaded)
            buffer = io.StringIO(newline="")
            writer = csv.writer(buffer, lineterminator="\n")
            for offset in range(this_batch):
                writer.writerow(make_row(rng, hospital_id, city, date_options, next_id + loaded + offset))
            buffer.seek(0)
            try:
                with conn.cursor() as cur:
                    cur.copy_expert(COPY_SQL, buffer)
                conn.commit()
            except Exception:
                conn.rollback()
                raise
            loaded += this_batch
            if loaded - last_report >= 250_000 or loaded == remaining:
                elapsed = max(time.perf_counter() - started, 0.001)
                rate = loaded / elapsed
                print(f"  Hospital {hospital_id}: added {loaded:,}/{remaining:,} rows ({rate:,.0f} rows/sec)")
                last_report = loaded
        return existing + loaded, time.perf_counter() - started
    finally:
        conn.close()


def main() -> int:
    args = parse_args()
    if args.target_total_rows < 0:
        print("--target-total-rows must be zero or greater.", file=sys.stderr)
        return 2
    if args.batch_rows < 1 or args.batch_rows > 200_000:
        print("--batch-rows must be between 1 and 200000.", file=sys.stderr)
        return 2
    date_options, start_date, end_date = check_date_range(args.start_date, args.end_date)
    targets = distribute_target(args.target_total_rows)
    password = args.password or getpass(f"PostgreSQL password for {args.user}: ")

    print("Smart Blood Bank Network — Deliverable 3 bulk loader")
    print(f"Target total rows: {args.target_total_rows:,} across A/B/C")
    print(f"Date range: {start_date} through {end_date}")
    print("This script only writes to analytics.historical_demand; it does not modify inventory, users, requests, notifications, or sync_log.")
    print("Targets: " + ", ".join(f"{hid}={count:,}" for hid, count in targets.items()))

    results = {}
    overall_start = time.perf_counter()
    for hospital_id, (dbname, city) in DATABASES.items():
        try:
            count, elapsed = load_hospital(hospital_id, dbname, city, targets[hospital_id], args, password, date_options)
            results[hospital_id] = (count, elapsed)
        except Exception as exc:
            print(f"\nERROR while loading Hospital {hospital_id} ({dbname}): {type(exc).__name__}: {exc}", file=sys.stderr)
            print("Successful committed batches remain in the analytics table. Re-run with the same target to fill missing rows; existing rows are not deleted.", file=sys.stderr)
            return 1

    total = sum(item[0] for item in results.values())
    print("\nCompleted. Current row counts:")
    for hid, (count, elapsed) in results.items():
        print(f"  Hospital {hid}: {count:,} rows (elapsed this run: {elapsed:,.1f} sec)")
    print(f"  Total A+B+C: {total:,} rows")
    print(f"  Total elapsed: {time.perf_counter() - overall_start:,.1f} sec")
    print("Next: run sql/02_create_indexes_after_load.sql in each database, then sql/03_benchmark_queries.sql or scripts/benchmark.py.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
