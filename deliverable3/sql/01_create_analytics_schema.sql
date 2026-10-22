-- Smart Blood Bank Network — Deliverable 3
-- Run this script ONCE in EACH database: blood_bank_hospital_a, _b, and _c.
-- Additive only: does not modify the operational tables from Deliverable 1/2.

CREATE SCHEMA IF NOT EXISTS analytics;

CREATE TABLE IF NOT EXISTS analytics.historical_demand (
    event_date       DATE        NOT NULL,
    event_id         BIGINT      NOT NULL CHECK (event_id > 0),
    hospital_id      CHAR(1)     NOT NULL CHECK (hospital_id IN ('A', 'B', 'C')),
    city             VARCHAR(80) NOT NULL,
    blood_group      VARCHAR(3)  NOT NULL CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
    requested_units  SMALLINT    NOT NULL CHECK (requested_units BETWEEN 1 AND 20),
    fulfilled_units  SMALLINT    NOT NULL CHECK (fulfilled_units BETWEEN 0 AND requested_units),
    request_status   VARCHAR(20) NOT NULL CHECK (request_status IN ('fulfilled', 'partial', 'unfulfilled', 'cancelled')),
    wait_minutes     SMALLINT    NOT NULL CHECK (wait_minutes BETWEEN 0 AND 2880),
    request_channel  VARCHAR(20) NOT NULL CHECK (request_channel IN ('web', 'phone', 'walk_in', 'emergency')),
    PRIMARY KEY (event_date, event_id)
) PARTITION BY RANGE (event_date);

-- Year partitions for efficient date-range scans and future trend modelling.
-- The DEFAULT partition keeps loading safe for dates outside the named ranges.
CREATE TABLE IF NOT EXISTS analytics.historical_demand_2018 PARTITION OF analytics.historical_demand FOR VALUES FROM ('2018-01-01') TO ('2019-01-01');
CREATE TABLE IF NOT EXISTS analytics.historical_demand_2019 PARTITION OF analytics.historical_demand FOR VALUES FROM ('2019-01-01') TO ('2020-01-01');
CREATE TABLE IF NOT EXISTS analytics.historical_demand_2020 PARTITION OF analytics.historical_demand FOR VALUES FROM ('2020-01-01') TO ('2021-01-01');
CREATE TABLE IF NOT EXISTS analytics.historical_demand_2021 PARTITION OF analytics.historical_demand FOR VALUES FROM ('2021-01-01') TO ('2022-01-01');
CREATE TABLE IF NOT EXISTS analytics.historical_demand_2022 PARTITION OF analytics.historical_demand FOR VALUES FROM ('2022-01-01') TO ('2023-01-01');
CREATE TABLE IF NOT EXISTS analytics.historical_demand_2023 PARTITION OF analytics.historical_demand FOR VALUES FROM ('2023-01-01') TO ('2024-01-01');
CREATE TABLE IF NOT EXISTS analytics.historical_demand_2024 PARTITION OF analytics.historical_demand FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
CREATE TABLE IF NOT EXISTS analytics.historical_demand_2025 PARTITION OF analytics.historical_demand FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
CREATE TABLE IF NOT EXISTS analytics.historical_demand_2026 PARTITION OF analytics.historical_demand FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
CREATE TABLE IF NOT EXISTS analytics.historical_demand_2027 PARTITION OF analytics.historical_demand FOR VALUES FROM ('2027-01-01') TO ('2028-01-01');
CREATE TABLE IF NOT EXISTS analytics.historical_demand_2028 PARTITION OF analytics.historical_demand FOR VALUES FROM ('2028-01-01') TO ('2029-01-01');
CREATE TABLE IF NOT EXISTS analytics.historical_demand_2029 PARTITION OF analytics.historical_demand FOR VALUES FROM ('2029-01-01') TO ('2030-01-01');
CREATE TABLE IF NOT EXISTS analytics.historical_demand_2030 PARTITION OF analytics.historical_demand FOR VALUES FROM ('2030-01-01') TO ('2031-01-01');
CREATE TABLE IF NOT EXISTS analytics.historical_demand_default PARTITION OF analytics.historical_demand DEFAULT;

COMMENT ON SCHEMA analytics IS 'Additive analytics and synthetic historical data for performance tests and demand modelling.';
COMMENT ON TABLE analytics.historical_demand IS 'Synthetic historical demand events. Not real patient data and not the live inventory table.';
