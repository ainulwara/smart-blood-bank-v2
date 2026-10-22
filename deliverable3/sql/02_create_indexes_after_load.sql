-- Run in EACH hospital database AFTER the initial bulk load.
-- Secondary indexes improve common filters, but creating them before bulk load slows ingestion.

CREATE INDEX IF NOT EXISTS idx_hd_blood_group_date
    ON analytics.historical_demand (blood_group, event_date DESC);

CREATE INDEX IF NOT EXISTS idx_hd_city_group_date
    ON analytics.historical_demand (city, blood_group, event_date DESC);

CREATE INDEX IF NOT EXISTS idx_hd_status_date
    ON analytics.historical_demand (request_status, event_date DESC);

ANALYZE analytics.historical_demand;
