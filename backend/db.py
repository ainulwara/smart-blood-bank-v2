from contextlib import contextmanager

import psycopg2
from psycopg2.extras import RealDictCursor

from config import Config


@contextmanager
def get_connection():
    conn = psycopg2.connect(Config.DATABASE_URL)
    conn.cursor().execute("SET TIME ZONE 'UTC'")
   
    try:
        yield conn
    finally:
        conn.close()


@contextmanager
def transaction():
    with get_connection() as conn:
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise


def fetch_one(query, params=()):
    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query, params)
            return cur.fetchone()


def fetch_all(query, params=()):
    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query, params)
            return cur.fetchall()
