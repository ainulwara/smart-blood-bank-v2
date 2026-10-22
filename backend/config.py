import os


class Config:
    HOSPITAL_ID = os.getenv("HOSPITAL_ID", "A").upper()
    DATABASE_URL = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:postgres@127.0.0.1:5432/blood_bank_hospital_a",
    )
    SYNC_SHARED_SECRET = os.getenv("SYNC_SHARED_SECRET", "change-me")
    SYNC_REQUEST_TIMEOUT = float(os.getenv("SYNC_REQUEST_TIMEOUT", "5"))
    RETRY_INTERVAL_SECONDS = int(os.getenv("RETRY_INTERVAL_SECONDS", "15"))
    RETRY_BATCH_SIZE = int(os.getenv("RETRY_BATCH_SIZE", "50"))
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "smart-blood-bank-dev-jwt-secret")
    JWT_EXPIRY_HOURS = int(os.getenv("JWT_EXPIRY_HOURS", "8"))
    LOW_STOCK_THRESHOLD = int(os.getenv("LOW_STOCK_THRESHOLD", "5"))
    ALLOWED_HOSPITAL_IDS = {"A", "B", "C"}
