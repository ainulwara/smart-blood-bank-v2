"""Statistical time-series helpers for Smart Blood Bank Network D4.

The primary target is monthly requested blood units. The primary model is
Holt-Winters additive trend + additive annual seasonality (12 months). It is
evaluated against a seasonal-naive baseline on the most recent 12 completed
months. Values are forecasts for planning/demo only, not clinical advice.
"""
from __future__ import annotations

import math
import warnings
from typing import Iterable

import numpy as np
import pandas as pd
from statsmodels.tsa.holtwinters import ExponentialSmoothing

SEASONAL_PERIODS = 12
MIN_HISTORY_MONTHS = 36


def seasonal_naive_forecast(values: Iterable[float], steps: int) -> np.ndarray:
    """Forecast by repeating the most recent 12 observed month values."""
    y = np.asarray(list(values), dtype=float)
    if steps < 1:
        return np.array([], dtype=float)
    if len(y) == 0:
        raise ValueError("Cannot forecast an empty time series.")
    if len(y) < SEASONAL_PERIODS:
        return np.repeat(float(np.mean(y)), steps)
    pattern = y[-SEASONAL_PERIODS:]
    return np.tile(pattern, int(math.ceil(steps / len(pattern))))[:steps]


def fit_forecast(values: Iterable[float], steps: int) -> tuple[np.ndarray, str]:
    """Fit Holt-Winters when possible, then use transparent fallbacks if needed."""
    y = np.asarray(list(values), dtype=float)
    if len(y) < 2:
        raise ValueError("At least two monthly observations are required to forecast.")
    if steps < 1:
        return np.array([], dtype=float), "Holt-Winters additive seasonal"

    # Non-finite and negative values should not be introduced into demand series.
    y = np.nan_to_num(y, nan=0.0, posinf=0.0, neginf=0.0)
    y = np.maximum(y, 0.0)

    # Two complete seasonal cycles (24 months) are enough for a fit; the full
    # series is separately required to contain 36 months before forecasting.
    if len(y) >= 2 * SEASONAL_PERIODS:
        try:
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                fit = ExponentialSmoothing(
                    y,
                    trend="add",
                    damped_trend=True,
                    seasonal="add",
                    seasonal_periods=SEASONAL_PERIODS,
                    initialization_method="estimated",
                ).fit(optimized=True, use_brute=False)
            pred = np.asarray(fit.forecast(steps), dtype=float)
            if len(pred) == steps and np.all(np.isfinite(pred)):
                return np.maximum(pred, 0.0), "Holt-Winters additive seasonal"
        except Exception:
            # Keep the forecasting pipeline usable if a series is degenerate.
            pass

    try:
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            fit = ExponentialSmoothing(
                y,
                trend="add",
                damped_trend=True,
                seasonal=None,
                initialization_method="estimated",
            ).fit(optimized=True)
        pred = np.asarray(fit.forecast(steps), dtype=float)
        if len(pred) == steps and np.all(np.isfinite(pred)):
            return np.maximum(pred, 0.0), "Holt damped-trend fallback"
    except Exception:
        pass

    return np.maximum(seasonal_naive_forecast(y, steps), 0.0), "Seasonal-naive fallback"


def calculate_metrics(actual: Iterable[float], predicted: Iterable[float]) -> dict[str, float]:
    """Calculate MAE, RMSE, WAPE%, and symmetric MAPE% without sklearn."""
    a = np.asarray(list(actual), dtype=float)
    p = np.asarray(list(predicted), dtype=float)
    if len(a) == 0 or len(a) != len(p):
        raise ValueError("Actual and predicted arrays must be non-empty and the same length.")
    errors = a - p
    denom = float(np.sum(np.abs(a)))
    smape_denom = np.abs(a) + np.abs(p)
    smape_terms = np.divide(
        2.0 * np.abs(errors),
        smape_denom,
        out=np.zeros_like(smape_denom),
        where=smape_denom > 0,
    )
    return {
        "mae": float(np.mean(np.abs(errors))),
        "rmse": float(np.sqrt(np.mean(errors ** 2))),
        "wape_pct": float(np.sum(np.abs(errors)) / denom * 100.0) if denom > 0 else float("nan"),
        "smape_pct": float(np.mean(smape_terms) * 100.0),
    }


def make_monthly_series(monthly_frame: pd.DataFrame, blood_group: str) -> pd.Series:
    """Build a continuous month-start series, filling absent months with zero."""
    subset = monthly_frame.loc[monthly_frame["blood_group"] == blood_group].copy()
    if subset.empty:
        raise ValueError(f"No monthly observations found for blood group {blood_group}.")
    subset["demand_month"] = pd.to_datetime(subset["demand_month"]).dt.to_period("M").dt.to_timestamp()
    subset = subset.sort_values("demand_month").drop_duplicates("demand_month", keep="last")
    full_index = pd.date_range(subset["demand_month"].min(), subset["demand_month"].max(), freq="MS")
    series = subset.set_index("demand_month")["requested_units"].astype(float).reindex(full_index, fill_value=0.0)
    series.name = blood_group
    return series
