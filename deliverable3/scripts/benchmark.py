#!/usr/bin/env python3
"""Run repeatable row-count, table-size, selective-query, and query-plan checks for A/B/C."""
from __future__ import annotations

import argparse
import os
import sys
import time
from datetime import date, timedelta
from getpass import getpass

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


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--host", default=os.getenv("PGHOST", "127.0.0.1"))
    parser.add_argument("--port", type=int, default=int(os.getenv("PGPORT", "5432")))
    parser.add_argument("--user", default=os.getenv("PGUSER", "postgres"))
    parser.add_argument("--password", default=os.getenv("PGPASSWORD"))
    args = parser.parse_args()
    password = args.password or getpass(f"PostgreSQL password for {args.user}: ")
    since = date.today() - timedelta(days=365)

    print("Smart Blood Bank Network — database benchmark")
    print("Run AFTER loading data and creating secondary indexes for the indexed-search timings.")
    for hid, (dbname, city) in DATABASES.items():
        print(f"\n{'=' * 72}\nHospital {hid} — {dbname}\n{'=' * 72}")
        conn = None
        try:
            conn = psycopg2.connect(host=args.host, port=args.port, dbname=dbname,
                                    user=args.user, password=password, connect_timeout=10,
                                    application_name="smart_blood_bank_d3_benchmark")
            conn.autocommit = True
            with conn.cursor() as cur:
                cur.execute("SELECT to_regclass('analytics.historical_demand')")
                if cur.fetchone()[0] is None:
                    print("ERROR: analytics.historical_demand missing; create schema and load rows first.")
                    return 1

                start = time.perf_counter()
                cur.execute("SELECT count(*) FROM analytics.historical_demand")
                count = cur.fetchone()[0]
                count_seconds = time.perf_counter() - start
                cur.execute("SELECT pg_size_pretty(pg_total_relation_size('analytics.historical_demand'))")
                size = cur.fetchone()[0]
                print(f"Rows: {count:,} (COUNT(*) time: {count_seconds:.3f} sec)")
                print(f"Table + indexes size: {size}")

                query = """
                    SELECT event_date, requested_units, fulfilled_units, request_status
                    FROM analytics.historical_demand
                    WHERE blood_group = %s AND city = %s AND event_date >= %s
                    ORDER BY event_date DESC
                    LIMIT 100
                """
                start = time.perf_counter()
                cur.execute(query, ("O+", city, since))
                rows = cur.fetchall()
                query_seconds = time.perf_counter() - start
                print(f"Selective search (O+ in {city}, last 365 days, max 100 rows): {query_seconds:.4f} sec; rows returned: {len(rows)}")

                print("\nEXPLAIN ANALYZE for selective search:")
                cur.execute("EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) " + query, ("O+", city, since))
                for line, in cur.fetchall():
                    print(line)

                print("\nMonthly demand aggregation (last 3 years):")
                agg = """
                    SELECT date_trunc('month', event_date)::date AS demand_month,
                           blood_group,
                           count(*) AS request_count,
                           sum(requested_units) AS requested_units,
                           sum(fulfilled_units) AS fulfilled_units
                    FROM analytics.historical_demand
                    WHERE event_date >= CURRENT_DATE - INTERVAL '3 years'
                    GROUP BY 1, 2
                    ORDER BY 1, 2
                """
                start = time.perf_counter()
                cur.execute(agg)
                aggregate_rows = cur.fetchall()
                print(f"Aggregation time: {time.perf_counter() - start:.3f} sec; output groups: {len(aggregate_rows)}")
        except Exception as exc:
            print(f"ERROR for Hospital {hid}: {type(exc).__name__}: {exc}", file=sys.stderr)
            return 1
        finally:
            if conn is not None:
                conn.close()
    print("\nBenchmark completed. Record row counts, size, search timings, and plan output for your report.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
