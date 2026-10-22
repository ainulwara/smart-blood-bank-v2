"""Application-level inventory synchronization and retry worker."""

from __future__ import annotations

import json
import threading
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID, uuid4

import requests
from apscheduler.schedulers.background import BackgroundScheduler
from flask import current_app, jsonify, request

from config import Config
from db import transaction

_sync_scheduler: BackgroundScheduler | None = None
_scheduler_lock = threading.Lock()


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _json_datetime(value: datetime) -> str:
    return value.astimezone(timezone.utc).isoformat()


def _parse_utc(value: str | datetime) -> datetime:
    if isinstance(value, datetime):
        dt = value
    else:
        dt = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _backoff_seconds(retry_count: int) -> int:
    return min(60, 5 * (2 ** max(retry_count - 1, 0)))


def _next_retry_at(retry_count: int) -> datetime:
    return utc_now() + timedelta(seconds=_backoff_seconds(retry_count))


def _payload_for_inventory(record: dict[str, Any]) -> dict[str, Any]:
    return {
        "record_id": str(record["id"]),
        "hospital_id": record["hospital_id"],
        "blood_group": record["blood_group"],
        "units": int(record["units"]),
        "updated_at": _json_datetime(record["updated_at"]),
        "updated_by_hospital_id": record["updated_by_hospital_id"],
    }


def apply_inventory_change_in_transaction(cur, *, blood_group: str, units: int) -> dict[str, Any]:
    """Update the local authoritative row and enqueue one delivery per peer.

    The caller's transaction must still be open. No network I/O occurs here.
    """
    if units < 0:
        raise ValueError("Inventory units cannot be negative")

    origin = Config.HOSPITAL_ID
    timestamp = utc_now()
    group = blood_group.upper()

    cur.execute(
        """
        UPDATE blood_inventory
        SET units = %s, updated_at = %s, updated_by_hospital_id = %s
        WHERE hospital_id = %s AND blood_group = %s
        RETURNING id, hospital_id, blood_group, units, updated_at,
                  updated_by_hospital_id
        """,
        (units, timestamp, origin, origin, group),
    )
    row = cur.fetchone()
    if row is None:
        raise ValueError(f"Inventory row not found for hospital {origin}, blood group {group}")

    record = {
        "id": row[0],
        "hospital_id": row[1],
        "blood_group": row[2],
        "units": row[3],
        "updated_at": row[4],
        "updated_by_hospital_id": row[5],
    }
    payload = _payload_for_inventory(record)
    event_id = uuid4()

    cur.execute(
        "SELECT id FROM hospitals WHERE id <> %s ORDER BY id",
        (origin,),
    )
    for (peer_id,) in cur.fetchall():
        cur.execute(
            """
            INSERT INTO sync_log (
                id, operation, record_id, payload, timestamp,
                origin_hospital_id, target_hospital_id, status,
                retry_count, next_retry_at, last_error
            )
            VALUES (%s, 'UPSERT_INVENTORY', %s, %s::jsonb, %s,
                    %s, %s, 'pending', 0, %s, NULL)
            """,
            (
                str(uuid4()),
                str(record["id"]),
                json.dumps({**payload, "event_id": str(event_id)}),
                timestamp,
                origin,
                peer_id,
                timestamp,
            ),
        )

    return {**payload, "event_id": str(event_id)}


def update_local_inventory_and_enqueue(*, blood_group: str, units: int) -> dict[str, Any]:
    with transaction() as conn:
        with conn.cursor() as cur:
            result = apply_inventory_change_in_transaction(
                cur, blood_group=blood_group, units=units
            )

            if units <= Config.LOW_STOCK_THRESHOLD:
                cur.execute(
                    "SELECT id FROM users WHERE role = ANY(%s) AND hospital_id = %s",
                    (["staff", "admin"], Config.HOSPITAL_ID),
                )
                for (user_id,) in cur.fetchall():
                    cur.execute(
                        """
                        INSERT INTO notifications (user_id, message, type)
                        VALUES (%s, %s, 'low_stock')
                        """,
                        (
                            user_id,
                            f"Low stock alert: {blood_group.upper()} inventory is {units} units at {Config.HOSPITAL_ID}.",
                        ),
                    )

    push_pending_for_record(result["record_id"])
    return result


def _get_pending_deliveries(limit: int = 50):
    with transaction() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT sl.id, sl.payload, sl.target_hospital_id, h.api_url,
                       sl.retry_count
                FROM sync_log sl
                JOIN hospitals h ON h.id = sl.target_hospital_id
                WHERE sl.origin_hospital_id = %s
                  AND sl.status IN ('pending', 'failed')
                  AND (sl.next_retry_at IS NULL OR sl.next_retry_at <= NOW())
                ORDER BY sl.timestamp ASC
                LIMIT %s
                """,
                (Config.HOSPITAL_ID, limit),
            )
            return cur.fetchall()


def _mark_synced(log_id):
    with transaction() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE sync_log SET status = 'synced', last_error = NULL WHERE id = %s",
                (str(log_id),),
            )


def _mark_failed(log_id, retry_count: int, error: str):
    with transaction() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE sync_log
                SET status = 'failed', retry_count = %s,
                    next_retry_at = %s, last_error = %s
                WHERE id = %s
                """,
                (retry_count, _next_retry_at(retry_count), error[:1000], str(log_id)),
            )


def _send_delivery(log_id, payload, target_hospital_id, api_url, retry_count):
    url = api_url.rstrip("/") + "/sync/receive"
    body = {
        "sync_log_id": str(log_id),
        "operation": "UPSERT_INVENTORY",
        "record_id": payload["record_id"],
        "payload": payload,
        "timestamp": payload["updated_at"],
        "origin_hospital_id": payload["hospital_id"],
        "target_hospital_id": target_hospital_id,
    }
    try:
        response = requests.post(
            url,
            json=body,
            headers={"X-Sync-Secret": Config.SYNC_SHARED_SECRET},
            timeout=Config.SYNC_REQUEST_TIMEOUT,
        )
        response.raise_for_status()
        _mark_synced(log_id)
        return True, None
    except requests.RequestException as exc:
        next_count = retry_count + 1
        _mark_failed(log_id, next_count, str(exc))
        return False, str(exc)


def push_pending(limit: int | None = None):
    rows = _get_pending_deliveries(limit or Config.RETRY_BATCH_SIZE)
    results = []
    for log_id, payload, target_hospital_id, api_url, retry_count in rows:
        ok, error = _send_delivery(
            log_id, payload, target_hospital_id, api_url, retry_count
        )
        results.append({
            "sync_log_id": str(log_id),
            "target_hospital_id": target_hospital_id,
            "synced": ok,
            "error": error,
        })
    return results


def push_pending_for_record(record_id):
    with transaction() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT COUNT(*)
                FROM sync_log
                WHERE origin_hospital_id = %s
                  AND record_id = %s
                  AND status IN ('pending', 'failed')
                """,
                (Config.HOSPITAL_ID, str(record_id)),
            )
            count = cur.fetchone()[0]
    if count:
        return push_pending(limit=count)
    return []


def _is_newer(incoming_ts: datetime, incoming_origin: str, current_ts: datetime, current_origin: str) -> bool:
    return (incoming_ts, incoming_origin) > (current_ts, current_origin)


def receive_sync(data: dict[str, Any]) -> dict[str, Any]:
    target = Config.HOSPITAL_ID
    sync_log_id = UUID(str(data["sync_log_id"]))
    origin = str(data["origin_hospital_id"]).upper()
    payload = data["payload"]

    if str(data.get("target_hospital_id", target)).upper() != target:
        raise ValueError("Sync payload target does not match this hospital")
    if origin == target:
        raise ValueError("A hospital cannot receive its own sync delivery")
    if data.get("record_id") != payload.get("record_id"):
        raise ValueError("Top-level record_id does not match payload")

    incoming_ts = _parse_utc(payload["updated_at"])
    incoming_origin = str(payload["updated_by_hospital_id"]).upper()
    if origin != incoming_origin or origin != str(payload["hospital_id"]).upper():
        raise ValueError("Origin hospital does not match inventory payload")

    record_id = UUID(str(payload["record_id"]))
    units = int(payload["units"])
    if units < 0:
        raise ValueError("Inventory units cannot be negative")

    with transaction() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT 1 FROM sync_log WHERE id = %s", (str(sync_log_id),))
            if cur.fetchone():
                return {
                    "status": "duplicate",
                    "applied": False,
                    "sync_log_id": str(sync_log_id),
                }

            cur.execute(
                """
                SELECT id, updated_at, updated_by_hospital_id
                FROM blood_inventory
                WHERE id = %s
                FOR UPDATE
                """,
                (str(record_id),),
            )
            existing = cur.fetchone()

            should_apply = existing is None
            if existing:
                _, current_ts, current_origin = existing
                should_apply = _is_newer(
                    incoming_ts,
                    incoming_origin,
                    _parse_utc(current_ts),
                    str(current_origin or "").upper(),
                )

            if existing is None:
                cur.execute(
                    """
                    INSERT INTO blood_inventory (
                        id, hospital_id, blood_group, units, updated_at,
                        updated_by_hospital_id
                    )
                    VALUES (%s, %s, %s, %s, %s, %s)
                    """,
                    (
                        str(record_id),
                        payload["hospital_id"],
                        payload["blood_group"].upper(),
                        units,
                        incoming_ts,
                        incoming_origin,
                    ),
                )
            elif should_apply:
                cur.execute(
                    """
                    UPDATE blood_inventory
                    SET units = %s, updated_at = %s,
                        updated_by_hospital_id = %s
                    WHERE id = %s
                    """,
                    (units, incoming_ts, incoming_origin, str(record_id)),
                )

            cur.execute(
                """
                INSERT INTO sync_log (
                    id, operation, record_id, payload, timestamp,
                    origin_hospital_id, target_hospital_id, status,
                    retry_count, next_retry_at, last_error
                )
                VALUES (%s, 'UPSERT_INVENTORY', %s, %s::jsonb, %s,
                        %s, %s, 'synced', 0, NULL, NULL)
                """,
                (
                    str(sync_log_id),
                    str(record_id),
                    json.dumps(data),
                    incoming_ts,
                    origin,
                    target,
                ),
            )

            if should_apply and units <= Config.LOW_STOCK_THRESHOLD:
                cur.execute(
                    "SELECT id FROM users WHERE role = ANY(%s) AND hospital_id = %s",
                    (["staff", "admin"], target),
                )
                for (user_id,) in cur.fetchall():
                    cur.execute(
                        """
                        INSERT INTO notifications (user_id, message, type)
                        VALUES (%s, %s, 'low_stock')
                        """,
                        (
                            user_id,
                            f"Low stock alert: {payload['blood_group']} at Hospital {incoming_origin} is {units} units.",
                        ),
                    )

    return {
        "status": "applied" if should_apply else "stale_ignored",
        "applied": should_apply,
        "sync_log_id": str(sync_log_id),
        "record_id": str(record_id),
    }


def receive_sync_http():
    if request.headers.get("X-Sync-Secret") != Config.SYNC_SHARED_SECRET:
        return jsonify({"error": "Unauthorized sync request"}), 401

    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "JSON body is required"}), 400

    required = {
        "sync_log_id", "operation", "record_id", "payload", "timestamp",
        "origin_hospital_id", "target_hospital_id",
    }
    missing = sorted(required - set(data.keys()))
    if missing:
        return jsonify({"error": "Missing fields", "fields": missing}), 400
    if data["operation"] != "UPSERT_INVENTORY":
        return jsonify({"error": "Unsupported sync operation"}), 400

    try:
        result = receive_sync(data)
    except (ValueError, KeyError, TypeError) as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception:
        current_app.logger.exception("Failed to apply incoming sync event")
        return jsonify({"error": "Sync application failed"}), 500

    return jsonify(result), 200


def _retry_job(app):
    with app.app_context():
        try:
            results = push_pending()
            if results:
                delivered = sum(1 for r in results if r["synced"])
                app.logger.info(
                    "Sync retry cycle: %s delivered, %s failed",
                    delivered,
                    len(results) - delivered,
                )
        except Exception:
            app.logger.exception("Sync retry cycle failed")


def start_retry_scheduler(app):
    global _sync_scheduler
    with _scheduler_lock:
        if _sync_scheduler and _sync_scheduler.running:
            return
        scheduler = BackgroundScheduler(timezone="UTC")
        scheduler.add_job(
            lambda: _retry_job(app),
            "interval",
            seconds=Config.RETRY_INTERVAL_SECONDS,
            id=f"sync-retry-{Config.HOSPITAL_ID}",
            replace_existing=True,
            max_instances=1,
            coalesce=True,
        )
        scheduler.start()
        _sync_scheduler = scheduler
        app.logger.info(
            "Inventory sync retry worker started for hospital %s",
            Config.HOSPITAL_ID,
        )
