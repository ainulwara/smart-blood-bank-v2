-- Run in a hospital database after data loading and index creation.
-- Query 1: total rows (full-table count; useful for verification, but can take time at scale).
SELECT count(*) AS historical_demand_rows
FROM analytics.historical_demand;

-- Query 2: selective blood-group + city + date search. Inspect the plan and actual runtime.
EXPLAIN (ANALYZE, BUFFERS)
SELECT event_date, requested_units, fulfilled_units, request_status
FROM analytics.historical_demand
WHERE blood_group = 'O+'
  AND city = 'Karachi'
  AND event_date >= CURRENT_DATE - 365
ORDER BY event_date DESC
LIMIT 100;

-- Query 3: monthly totals for the forecasting model's input data.
SELECT date_trunc('month', event_date)::date AS demand_month,
       blood_group,
       count(*) AS request_count,
       sum(requested_units) AS units_requested,
       sum(fulfilled_units) AS units_fulfilled
FROM analytics.historical_demand
WHERE event_date >= CURRENT_DATE - INTERVAL '3 years'
GROUP BY 1, 2
ORDER BY 1, 2;

-- Approximate stored table + index footprint.
SELECT pg_size_pretty(pg_total_relation_size('analytics.historical_demand')) AS total_relation_size;
