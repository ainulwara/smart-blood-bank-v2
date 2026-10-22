#!/usr/bin/env python3
"""Train, evaluate, and export monthly demand forecasts for hospitals A/B/C.

This script performs read-only monthly SQL aggregation against the existing
analytics.historical_demand table. Raw 50M event rows are never loaded into
Python memory; only monthly totals are fetched.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from datetime import date, datetime
from getpass import getpass
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import psycopg2

from forecast_model import (
    MIN_HISTORY_MONTHS,
    calculate_metrics,
    fit_forecast,
    make_monthly_series,
    seasonal_naive_forecast,
)

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT_DIR = ROOT / "outputs"
HOSPITALS = {
    "A": ("blood_bank_hospital_a", "Karachi"),
    "B": ("blood_bank_hospital_b", "Lahore"),
    "C": ("blood_bank_hospital_c", "Islamabad"),
}
BLOOD_GROUPS = ("A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-")

MONTHLY_AGGREGATE_SQL = """
SELECT
    date_trunc('month', event_date)::date AS demand_month,
    blood_group,
    SUM(requested_units)::double precision AS requested_units,
    SUM(fulfilled_units)::double precision AS fulfilled_units,
    COUNT(*)::bigint AS request_count
FROM analytics.historical_demand
WHERE hospital_id = %s
  AND event_date < date_trunc('month', CURRENT_DATE)::date
GROUP BY 1, 2
ORDER BY 1, 2
"""


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--host", default=os.getenv("PGHOST", "127.0.0.1"))
    parser.add_argument("--port", type=int, default=int(os.getenv("PGPORT", "5432")))
    parser.add_argument("--user", default=os.getenv("PGUSER", "postgres"))
    parser.add_argument("--password", default=os.getenv("PGPASSWORD"), help="Avoid passing this on the command line; leave blank to be prompted.")
    parser.add_argument("--hospital", choices=["A", "B", "C"], help="Optional: run only one hospital. Default: A, B, and C.")
    parser.add_argument("--horizon", type=int, default=3, help="Number of completed-month steps to forecast (default 3).")
    parser.add_argument("--holdout-months", type=int, default=12, help="Most recent completed months held out for evaluation (default 12).")
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    return parser.parse_args()


def connect(dbname: str, args: argparse.Namespace, password: str):
    return psycopg2.connect(
        host=args.host,
        port=args.port,
        dbname=dbname,
        user=args.user,
        password=password,
        connect_timeout=10,
        application_name="smart_blood_bank_d4_forecasting",
    )


def read_monthly_aggregates(hospital_id: str, dbname: str, args: argparse.Namespace, password: str) -> pd.DataFrame:
    conn = connect(dbname, args, password)
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT to_regclass('analytics.historical_demand')")
            if cur.fetchone()[0] is None:
                raise RuntimeError(
                    f"{dbname}: analytics.historical_demand is missing. Complete Deliverable 3 schema/load first."
                )
            started = time.perf_counter()
            cur.execute(MONTHLY_AGGREGATE_SQL, (hospital_id,))
            rows = cur.fetchall()
            elapsed = time.perf_counter() - started
        if not rows:
            raise RuntimeError(
                f"{dbname}: no completed-month historical data found for hospital {hospital_id}."
            )
        frame = pd.DataFrame(rows, columns=[
            "demand_month", "blood_group", "requested_units", "fulfilled_units", "request_count"
        ])
        frame.insert(0, "hospital_id", hospital_id)
        frame.insert(1, "city", HOSPITALS[hospital_id][1])
        frame["demand_month"] = pd.to_datetime(frame["demand_month"])
        for column in ("requested_units", "fulfilled_units", "request_count"):
            frame[column] = pd.to_numeric(frame[column], errors="raise")
        print(
            f"  {hospital_id}: fetched {len(frame):,} monthly-group aggregates "
            f"from the database in {elapsed:.1f}s; source event count={int(frame['request_count'].sum()):,}"
        )
        return frame
    finally:
        conn.close()


def evaluate_series(series: pd.Series, hospital_id: str, city: str,
                    blood_group: str, holdout_months: int) -> dict | None:
    if len(series) <= holdout_months:
        return None
    train = series.iloc[:-holdout_months].to_numpy(dtype=float)
    actual = series.iloc[-holdout_months:].to_numpy(dtype=float)
    if len(train) < 24:
        return None
    model_prediction, method = fit_forecast(train, holdout_months)
    baseline_prediction = seasonal_naive_forecast(train, holdout_months)
    model_metrics = calculate_metrics(actual, model_prediction)
    baseline_metrics = calculate_metrics(actual, baseline_prediction)
    return {
        "hospital_id": hospital_id,
        "city": city,
        "blood_group": blood_group,
        "model_used": method,
        "train_months": int(len(train)),
        "holdout_months": int(len(actual)),
        "train_end_month": series.index[-holdout_months - 1].date().isoformat(),
        "test_start_month": series.index[-holdout_months].date().isoformat(),
        "test_end_month": series.index[-1].date().isoformat(),
        "model_mae_units": model_metrics["mae"],
        "model_rmse_units": model_metrics["rmse"],
        "model_wape_pct": model_metrics["wape_pct"],
        "model_smape_pct": model_metrics["smape_pct"],
        "seasonal_naive_mae_units": baseline_metrics["mae"],
        "seasonal_naive_rmse_units": baseline_metrics["rmse"],
        "seasonal_naive_wape_pct": baseline_metrics["wape_pct"],
        "model_lower_mae_than_baseline": model_metrics["mae"] < baseline_metrics["mae"],
    }


def plot_hospital(hospital_id: str, city: str,
                  series_by_group: dict[str, pd.Series],
                  forecasts_by_group: dict[str, tuple[pd.DatetimeIndex, np.ndarray, str]],
                  output_dir: Path) -> Path:
    fig, axes = plt.subplots(4, 2, figsize=(14, 13), constrained_layout=True)
    fig.suptitle(f"Hospital {hospital_id} — {city}: monthly blood-demand forecasts", fontsize=15)
    for ax, group in zip(axes.flat, BLOOD_GROUPS):
        if group not in series_by_group or group not in forecasts_by_group:
            ax.set_title(f"{group} — insufficient history")
            ax.text(0.5, 0.5, "No forecast produced", ha="center", va="center", transform=ax.transAxes)
            ax.grid(True, alpha=0.25)
            continue
        series = series_by_group[group]
        visible = series.tail(36)
        forecast_dates, predictions, method = forecasts_by_group[group]
        ax.plot(visible.index, visible.values, label="Actual requested units", marker="o", markersize=2)
        ax.plot(forecast_dates, predictions, label="Forecast", marker="o", linestyle="--")
        ax.axvline(forecast_dates[0], linestyle=":", linewidth=1)
        ax.set_title(group)
        ax.set_ylabel("Units requested")
        ax.grid(True, alpha=0.25)
        ax.tick_params(axis="x", rotation=35, labelsize=8)
    handles, labels = axes.flat[0].get_legend_handles_labels()
    fig.legend(handles, labels, loc="upper center", ncol=2, bbox_to_anchor=(0.5, 0.965))
    path = output_dir / f"forecast_hospital_{hospital_id}.png"
    fig.savefig(path, dpi=140)
    plt.close(fig)
    return path


def main() -> int:
    args = parse_args()
    if args.horizon < 1 or args.horizon > 24:
        print("--horizon must be between 1 and 24 months.", file=sys.stderr)
        return 2
    if args.holdout_months < 1 or args.holdout_months > 24:
        print("--holdout-months must be between 1 and 24.", file=sys.stderr)
        return 2

    args.output_dir.mkdir(parents=True, exist_ok=True)
    password = args.password or getpass(f"PostgreSQL password for {args.user}: ")
    hospital_ids = [args.hospital] if args.hospital else ["A", "B", "C"]

    print("Smart Blood Bank Network — Deliverable 4: statistical demand forecast")
    print("Model: Holt-Winters additive trend + 12-month additive seasonality")
    print("Evaluation: last completed months held out; compare with seasonal-naive baseline")
    print("Database work: read-only monthly aggregation; raw event rows are not loaded into Python.")

    all_aggregates: list[pd.DataFrame] = []
    all_metrics: list[dict] = []
    all_forecasts: list[dict] = []
    plot_paths: list[str] = []
    hospital_summaries: list[dict] = []
    started_all = time.perf_counter()

    try:
        for hospital_id in hospital_ids:
            dbname, city = HOSPITALS[hospital_id]
            print(f"\n=== Hospital {hospital_id} / {dbname} ===")
            aggregates = read_monthly_aggregates(hospital_id, dbname, args, password)
            all_aggregates.append(aggregates)
            series_by_group: dict[str, pd.Series] = {}
            forecasts_by_group: dict[str, tuple[pd.DatetimeIndex, np.ndarray, str]] = {}

            for blood_group in BLOOD_GROUPS:
                group_frame = aggregates.loc[aggregates["blood_group"] == blood_group]
                if group_frame.empty:
                    print(f"  WARNING: no rows for {blood_group}; forecast will be skipped.")
                    continue
                series = make_monthly_series(aggregates, blood_group)
                if len(series) < MIN_HISTORY_MONTHS:
                    print(
                        f"  WARNING: {blood_group} has only {len(series)} months; "
                        f"at least {MIN_HISTORY_MONTHS} are needed for evaluation/seasonal modelling. Skipped."
                    )
                    continue
                series_by_group[blood_group] = series
                metrics = evaluate_series(series, hospital_id, city, blood_group, args.holdout_months)
                if metrics is not None:
                    all_metrics.append(metrics)
                predictions, method = fit_forecast(series.to_numpy(dtype=float), args.horizon)
                future_dates = pd.date_range(
                    start=series.index[-1] + pd.offsets.MonthBegin(1),
                    periods=args.horizon,
                    freq="MS",
                )
                forecasts_by_group[blood_group] = (future_dates, predictions, method)
                last_monthly_total = float(series.iloc[-1])
                print(
                    f"  {blood_group}: history={len(series)} months; last requested units={last_monthly_total:,.0f}; "
                    f"model={method}"
                )
                for month, value in zip(future_dates, predictions):
                    all_forecasts.append({
                        "hospital_id": hospital_id,
                        "city": city,
                        "blood_group": blood_group,
                        "forecast_month": month.date().isoformat(),
                        "forecast_requested_units": round(float(value), 1),
                        "model_used": method,
                        "history_months": int(len(series)),
                        "last_actual_month": series.index[-1].date().isoformat(),
                        "last_actual_requested_units": last_monthly_total,
                    })

            if not forecasts_by_group:
                raise RuntimeError(
                    f"Hospital {hospital_id} did not have any series with at least {MIN_HISTORY_MONTHS} months. "
                    "Check that D3 loading and monthly history are complete."
                )
            chart = plot_hospital(hospital_id, city, series_by_group, forecasts_by_group, args.output_dir)
            plot_paths.append(str(chart))
            hospital_summaries.append({
                "hospital_id": hospital_id,
                "database": dbname,
                "city": city,
                "monthly_aggregate_rows": int(len(aggregates)),
                "source_event_count": int(aggregates["request_count"].sum()),
                "last_complete_month": max(s.index[-1] for s in series_by_group.values()).date().isoformat(),
                "blood_groups_forecast": sorted(forecasts_by_group.keys()),
                "chart": str(chart),
            })

        combined = pd.concat(all_aggregates, ignore_index=True)
        aggregate_path = args.output_dir / "monthly_aggregates.csv"
        metrics_path = args.output_dir / "evaluation_metrics.csv"
        forecasts_path = args.output_dir / "forecast_next_months.csv"
        combined.to_csv(aggregate_path, index=False)
        pd.DataFrame(all_metrics).to_csv(metrics_path, index=False)
        pd.DataFrame(all_forecasts).to_csv(forecasts_path, index=False)
        summary = {
            "generated_at_utc": datetime.utcnow().isoformat(timespec="seconds") + "Z",
            "model_primary": "Holt-Winters additive trend + 12-month additive seasonality",
            "evaluation_baseline": "seasonal naive (repeat previous 12 months)",
            "target": "monthly sum of requested_units",
            "forecast_horizon_months": args.horizon,
            "holdout_months": args.holdout_months,
            "source_table": "analytics.historical_demand",
            "data_note": "Synthetic demonstration data; forecasts are not clinical advice.",
            "hospital_summaries": hospital_summaries,
            "output_files": [str(aggregate_path), str(metrics_path), str(forecasts_path), *plot_paths],
            "elapsed_seconds": round(time.perf_counter() - started_all, 2),
        }
        summary_path = args.output_dir / "run_summary.json"
        summary_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")

        print("\nCompleted Deliverable 4 run.")
        print(f"Monthly aggregate rows exported: {len(combined):,}")
        print(f"Forecast rows exported: {len(all_forecasts):,}")
        print(f"Evaluation metric rows exported: {len(all_metrics):,}")
        print(f"Output folder: {args.output_dir}")
        print("Open evaluation_metrics.csv to compare Holt-Winters against the seasonal-naive baseline.")
        return 0
    except Exception as exc:
        print(f"\nERROR: {type(exc).__name__}: {exc}", file=sys.stderr)
        print("No operational table is changed by this script. Check the README troubleshooting section.", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
