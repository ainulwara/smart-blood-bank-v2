"""Quick no-database check for Deliverable 4 dependencies and model fitting."""
from __future__ import annotations

import numpy as np
import pandas as pd
import statsmodels

from forecast_model import calculate_metrics, fit_forecast, seasonal_naive_forecast


def main() -> int:
    index = pd.date_range("2018-01-01", periods=96, freq="MS")
    values = np.array([
        180 + 0.7 * i + 35 * np.sin(2 * np.pi * (i % 12) / 12)
        for i in range(len(index))
    ], dtype=float)
    train, test = values[:-12], values[-12:]
    prediction, method = fit_forecast(train, len(test))
    baseline = seasonal_naive_forecast(train, len(test))
    print("Deliverable 4 dependency check")
    print(f"statsmodels version: {statsmodels.__version__}")
    print(f"Synthetic monthly observations: {len(values)}")
    print(f"Model selected: {method}")
    print(f"Holt-Winters/fallback MAE: {calculate_metrics(test, prediction)['mae']:.2f}")
    print(f"Seasonal-naive baseline MAE: {calculate_metrics(test, baseline)['mae']:.2f}")
    if len(prediction) != 12 or not np.all(np.isfinite(prediction)):
        print("FAIL: model returned invalid forecasts.")
        return 1
    print("PASS: dependencies import and model produced 12 finite forecasts.")
    print("Note: this test uses generated sample data; it does not connect to PostgreSQL.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
