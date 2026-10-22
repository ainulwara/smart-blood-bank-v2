-- Read-only checks. Run separately in each existing hospital database.
SELECT current_database() AS database_name,
       to_regclass('analytics.historical_demand') AS source_table;

-- Aggregate source coverage without transferring all event rows into a client.
SELECT hospital_id,
       MIN(event_date) AS earliest_event_date,
       MAX(event_date) AS latest_event_date,
       COUNT(*) AS event_rows,
       COUNT(DISTINCT blood_group) AS blood_groups
FROM analytics.historical_demand
GROUP BY hospital_id
ORDER BY hospital_id;

-- Months available to the forecasting model (current partial month excluded).
SELECT MIN(month_start) AS first_complete_month,
       MAX(month_start) AS last_complete_month,
       COUNT(*) AS monthly_group_rows
FROM (
    SELECT date_trunc('month', event_date)::date AS month_start, blood_group
    FROM analytics.historical_demand
    WHERE event_date < date_trunc('month', CURRENT_DATE)::date
    GROUP BY 1, 2
) s;
