-- Smart Blood Bank Network
-- Deliverable 1: self-contained PostgreSQL schema + seed data.
-- Run this file once against the corresponding hospital database.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DROP TABLE IF EXISTS sync_log CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS emergency_requests CASCADE;
DROP TABLE IF EXISTS blood_inventory CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS hospitals CASCADE;

CREATE TABLE hospitals (
    id CHAR(1) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    api_url VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(120) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('patient', 'staff', 'admin')),
    hospital_id CHAR(1) NOT NULL REFERENCES hospitals(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE blood_inventory (
    id UUID PRIMARY KEY,
    hospital_id CHAR(1) NOT NULL REFERENCES hospitals(id),
    blood_group VARCHAR(3) NOT NULL CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
    units INTEGER NOT NULL CHECK (units >= 0),
    updated_at TIMESTAMPTZ NOT NULL,
    updated_by_hospital_id CHAR(1) NOT NULL REFERENCES hospitals(id),
    UNIQUE (hospital_id, blood_group)
);

CREATE TABLE emergency_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID NOT NULL REFERENCES users(id),
    blood_group VARCHAR(3) NOT NULL CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
    units INTEGER NOT NULL CHECK (units > 0),
    city VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Application-level write-ahead log / delivery queue.
-- One row represents one origin -> target delivery task.
CREATE TABLE sync_log (
    id UUID PRIMARY KEY,
    operation VARCHAR(40) NOT NULL CHECK (operation IN ('UPSERT_INVENTORY')),
    record_id UUID NOT NULL,
    payload JSONB NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    origin_hospital_id CHAR(1) NOT NULL REFERENCES hospitals(id),
    target_hospital_id CHAR(1) NOT NULL REFERENCES hospitals(id),
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'synced', 'failed')),
    retry_count INTEGER NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
    next_retry_at TIMESTAMPTZ,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (origin_hospital_id <> target_hospital_id)
);

CREATE INDEX idx_blood_inventory_group ON blood_inventory (blood_group);
CREATE INDEX idx_blood_inventory_hospital_group ON blood_inventory (hospital_id, blood_group);
CREATE INDEX idx_sync_retry ON sync_log (status, next_retry_at, timestamp);
CREATE INDEX idx_sync_origin_status ON sync_log (origin_hospital_id, status);

INSERT INTO hospitals (id, name, city, api_url) VALUES
('A', 'Hospital A', 'Karachi', 'http://hospital-a:5000'),
('B', 'Hospital B', 'Lahore', 'http://hospital-b:5000'),
('C', 'Hospital C', 'Islamabad', 'http://hospital-c:5000');

-- Demo users are local to the current hospital database and are NOT synchronized.
INSERT INTO users (id, name, email, password_hash, role, hospital_id) VALUES ('4a902f95-5abc-5bb5-ad9f-1a6edc5f643c', 'Admin C', 'adminc@smartblood.local', 'pbkdf2_sha256$310000$c21hcnQtYmxvb2QtZGVtby1zYWx0$rdm6vsCqB4ezcJRa8Rtv_uUaKzJRw5FCjt5dJesVg1A', 'admin', 'C');
INSERT INTO users (id, name, email, password_hash, role, hospital_id) VALUES ('121b6e4e-a750-5d16-859d-b130f1bb2d21', 'Staff C', 'staffc@smartblood.local', 'pbkdf2_sha256$310000$c21hcnQtYmxvb2QtZGVtby1zYWx0$rdm6vsCqB4ezcJRa8Rtv_uUaKzJRw5FCjt5dJesVg1A', 'staff', 'C');
INSERT INTO users (id, name, email, password_hash, role, hospital_id) VALUES ('83315dd4-6e42-5033-8b9d-2e03f0f92083', 'Patient C', 'patientc@smartblood.local', 'pbkdf2_sha256$310000$c21hcnQtYmxvb2QtZGVtby1zYWx0$rdm6vsCqB4ezcJRa8Rtv_uUaKzJRw5FCjt5dJesVg1A', 'patient', 'C');

-- Inventory is replicated across all hospital databases. Seed IDs are identical on A/B/C.
INSERT INTO blood_inventory (id, hospital_id, blood_group, units, updated_at, updated_by_hospital_id) VALUES ('1fa44f94-783a-52e2-907b-7c3058da49e6', 'A', 'A+', 18, '2026-09-24 00:00:00+00', 'A');
INSERT INTO blood_inventory (id, hospital_id, blood_group, units, updated_at, updated_by_hospital_id) VALUES ('0a6d3775-b34a-5a66-ad95-6deedddcceca', 'A', 'A-', 7, '2026-09-24 00:00:00+00', 'A');
INSERT INTO blood_inventory (id, hospital_id, blood_group, units, updated_at, updated_by_hospital_id) VALUES ('16b559c4-26f3-5e24-bf59-b787a27f4969', 'A', 'B+', 14, '2026-09-24 00:00:00+00', 'A');
INSERT INTO blood_inventory (id, hospital_id, blood_group, units, updated_at, updated_by_hospital_id) VALUES ('aab82a22-e46d-5aa6-b432-806db2b77b19', 'A', 'B-', 5, '2026-09-24 00:00:00+00', 'A');
INSERT INTO blood_inventory (id, hospital_id, blood_group, units, updated_at, updated_by_hospital_id) VALUES ('7c68ce9d-894e-5812-83b9-77e54b64c139', 'A', 'AB+', 6, '2026-09-24 00:00:00+00', 'A');
INSERT INTO blood_inventory (id, hospital_id, blood_group, units, updated_at, updated_by_hospital_id) VALUES ('f3541b95-d73a-528d-8e89-4b5947388703', 'A', 'AB-', 3, '2026-09-24 00:00:00+00', 'A');
INSERT INTO blood_inventory (id, hospital_id, blood_group, units, updated_at, updated_by_hospital_id) VALUES ('62fe98d5-469d-53d8-acbf-ae138404e65f', 'A', 'O+', 21, '2026-09-24 00:00:00+00', 'A');
INSERT INTO blood_inventory (id, hospital_id, blood_group, units, updated_at, updated_by_hospital_id) VALUES ('9704dd67-1ed4-555f-a804-7ff211f98cc2', 'A', 'O-', 8, '2026-09-24 00:00:00+00', 'A');
INSERT INTO blood_inventory (id, hospital_id, blood_group, units, updated_at, updated_by_hospital_id) VALUES ('32d308c1-fcd0-5acc-9f8d-f2f45ba1f170', 'B', 'A+', 12, '2026-09-24 00:00:00+00', 'B');
INSERT INTO blood_inventory (id, hospital_id, blood_group, units, updated_at, updated_by_hospital_id) VALUES ('353582b3-3788-5a37-8c38-c8f23bccec09', 'B', 'A-', 4, '2026-09-24 00:00:00+00', 'B');
INSERT INTO blood_inventory (id, hospital_id, blood_group, units, updated_at, updated_by_hospital_id) VALUES ('1b020bdc-9548-5264-8bd5-4d26c93c1ceb', 'B', 'B+', 17, '2026-09-24 00:00:00+00', 'B');
INSERT INTO blood_inventory (id, hospital_id, blood_group, units, updated_at, updated_by_hospital_id) VALUES ('9eb797b2-9383-548c-b381-18a72cf2265e', 'B', 'B-', 6, '2026-09-24 00:00:00+00', 'B');
INSERT INTO blood_inventory (id, hospital_id, blood_group, units, updated_at, updated_by_hospital_id) VALUES ('98792bdb-cda7-596f-95fa-c73a84b9ba80', 'B', 'AB+', 5, '2026-09-24 00:00:00+00', 'B');
INSERT INTO blood_inventory (id, hospital_id, blood_group, units, updated_at, updated_by_hospital_id) VALUES ('5d8edfec-883b-56a3-8af4-58f5df7e0965', 'B', 'AB-', 2, '2026-09-24 00:00:00+00', 'B');
INSERT INTO blood_inventory (id, hospital_id, blood_group, units, updated_at, updated_by_hospital_id) VALUES ('d2d5cf2f-6750-5da0-aa89-444c4a909681', 'B', 'O+', 15, '2026-09-24 00:00:00+00', 'B');
INSERT INTO blood_inventory (id, hospital_id, blood_group, units, updated_at, updated_by_hospital_id) VALUES ('489e6e50-034c-578f-86db-a08e3422a92a', 'B', 'O-', 7, '2026-09-24 00:00:00+00', 'B');
INSERT INTO blood_inventory (id, hospital_id, blood_group, units, updated_at, updated_by_hospital_id) VALUES ('e0c38efc-a3f2-590e-874e-edf776e980aa', 'C', 'A+', 10, '2026-09-24 00:00:00+00', 'C');
INSERT INTO blood_inventory (id, hospital_id, blood_group, units, updated_at, updated_by_hospital_id) VALUES ('9413bbc9-ef31-50ee-a3cf-4c8e19dc2986', 'C', 'A-', 3, '2026-09-24 00:00:00+00', 'C');
INSERT INTO blood_inventory (id, hospital_id, blood_group, units, updated_at, updated_by_hospital_id) VALUES ('a8317f8d-a6ad-5657-8f21-5da79e816760', 'C', 'B+', 13, '2026-09-24 00:00:00+00', 'C');
INSERT INTO blood_inventory (id, hospital_id, blood_group, units, updated_at, updated_by_hospital_id) VALUES ('bddc9bb7-25bd-505e-a671-231e62a03a0a', 'C', 'B-', 4, '2026-09-24 00:00:00+00', 'C');
INSERT INTO blood_inventory (id, hospital_id, blood_group, units, updated_at, updated_by_hospital_id) VALUES ('48d18274-8299-5a2e-a655-42776c5d8e40', 'C', 'AB+', 4, '2026-09-24 00:00:00+00', 'C');
INSERT INTO blood_inventory (id, hospital_id, blood_group, units, updated_at, updated_by_hospital_id) VALUES ('c5bd1d7a-01a8-57ac-845f-a3bab5a6190a', 'C', 'AB-', 1, '2026-09-24 00:00:00+00', 'C');
INSERT INTO blood_inventory (id, hospital_id, blood_group, units, updated_at, updated_by_hospital_id) VALUES ('8d0d16a2-a024-5050-99a7-06017914d912', 'C', 'O+', 19, '2026-09-24 00:00:00+00', 'C');
INSERT INTO blood_inventory (id, hospital_id, blood_group, units, updated_at, updated_by_hospital_id) VALUES ('b56cc3cf-861c-543f-a8f3-888a4f015d97', 'C', 'O-', 5, '2026-09-24 00:00:00+00', 'C');
INSERT INTO notifications (user_id, message, type, is_read) VALUES ('4a902f95-5abc-5bb5-ad9f-1a6edc5f643c', 'Demo low-stock monitoring is enabled for blood groups below 5 units.', 'low_stock_info', FALSE);
