from flask import Blueprint, g, jsonify, request

from common.http import require_roles
from common.validation import normalize_blood_group, positive_int
from config import Config
from db import transaction
from sync.service import update_local_inventory_and_enqueue


emergency_bp = Blueprint("emergency", __name__)


def _notify_local_roles(cur, message, notification_type, roles=("staff", "admin")):
    cur.execute(
        "SELECT id FROM users WHERE role = ANY(%s) AND hospital_id = %s",
        (list(roles), Config.HOSPITAL_ID),
    )
    for row in cur.fetchall():
        cur.execute(
            """
            INSERT INTO notifications (user_id, message, type)
            VALUES (%s, %s, %s)
            """,
            (row[0], message, notification_type),
        )


def _notify_user(cur, user_id, message, notification_type):
    cur.execute(
        """
        INSERT INTO notifications (user_id, message, type)
        VALUES (%s, %s, %s)
        """,
        (str(user_id), message, notification_type),
    )


@emergency_bp.post("")
@require_roles("patient", "staff", "admin")
def create_request():
    data = request.get_json(silent=True) or {}
    city = str(data.get("city", "")).strip()
    try:
        blood_group = normalize_blood_group(data.get("blood_group"))
        units = positive_int(data.get("units"), "units")
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    if not city:
        return jsonify({"error": "City is required"}), 400

    with transaction() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO emergency_requests (requester_id, blood_group, units, city)
                VALUES (%s, %s, %s, %s)
                RETURNING id, requester_id, blood_group, units, city,
                          status, created_at
                """,
                (g.current_user["sub"], blood_group, units, city),
            )
            row = cur.fetchone()
            _notify_local_roles(
                cur,
                f"Emergency request: {blood_group}, {units} units, {city}.",
                "emergency_request",
            )

    return jsonify({
        "message": "Emergency request created",
        "request": {
            "id": row[0],
            "requester_id": row[1],
            "blood_group": row[2],
            "units": row[3],
            "city": row[4],
            "status": row[5],
            "created_at": row[6],
        },
    }), 201


@emergency_bp.get("")
@require_roles("patient", "staff", "admin")
def list_requests():
    from db import fetch_all

    if g.current_user["role"] == "patient":
        rows = fetch_all(
            """
            SELECT id, requester_id, blood_group, units, city, status, created_at
            FROM emergency_requests
            WHERE requester_id = %s
            ORDER BY created_at DESC
            """,
            (g.current_user["sub"],),
        )
    else:
        rows = fetch_all(
            """
            SELECT id, requester_id, blood_group, units, city, status, created_at
            FROM emergency_requests
            ORDER BY created_at DESC
            """
        )
    return jsonify({"requests": rows})


@emergency_bp.put("/<request_id>/accept")
@require_roles("staff", "admin")
def accept_request(request_id):
    try:
        request_id = str(request_id)
    except ValueError:
        return jsonify({"error": "Invalid request ID"}), 400

    new_units = None
    group = None
    with transaction() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, requester_id, blood_group, units, city, status
                FROM emergency_requests
                WHERE id = %s
                FOR UPDATE
                """,
                (request_id,),
            )
            req = cur.fetchone()
            if not req:
                return jsonify({"error": "Emergency request not found"}), 404
            if req[5] != "pending":
                return jsonify({"error": "Request is already closed"}), 409

            group = req[2]
            cur.execute(
                """
                SELECT id, units
                FROM blood_inventory
                WHERE hospital_id = %s AND blood_group = %s
                FOR UPDATE
                """,
                (Config.HOSPITAL_ID, group),
            )
            inventory = cur.fetchone()
            if not inventory:
                return jsonify({"error": "Local inventory row not found"}), 404

            current_units = inventory[1]
            if current_units < req[3]:
                return jsonify({
                    "error": "Insufficient local inventory",
                    "available_units": current_units,
                    "requested_units": req[3],
                }), 409

            new_units = current_units - req[3]
            # Perform the inventory update inside the same transaction and
            # create its origin-side sync records before commit.
            from sync.service import apply_inventory_change_in_transaction
            inventory_result = apply_inventory_change_in_transaction(
                cur,
                blood_group=group,
                units=new_units,
            )

            cur.execute(
                """
                UPDATE emergency_requests
                SET status = 'accepted'
                WHERE id = %s
                RETURNING id, requester_id, blood_group, units, city, status, created_at
                """,
                (request_id,),
            )
            updated_req = cur.fetchone()
            _notify_user(
                cur,
                req[1],
                f"Your emergency request for {req[3]} units of {group} was accepted at {Config.HOSPITAL_ID}.",
                "emergency_accepted",
            )
            if new_units <= Config.LOW_STOCK_THRESHOLD:
                _notify_local_roles(
                    cur,
                    f"Low stock alert: {group} inventory is now {new_units} units at {Config.HOSPITAL_ID}.",
                    "low_stock",
                )

    # Network calls occur after the transaction commits.
    from sync.service import push_pending_for_record
    push_pending_for_record(inventory_result["record_id"])
    return jsonify({
        "message": "Emergency request accepted",
        "request": {
            "id": updated_req[0],
            "requester_id": updated_req[1],
            "blood_group": updated_req[2],
            "units": updated_req[3],
            "city": updated_req[4],
            "status": updated_req[5],
            "created_at": updated_req[6],
        },
        "inventory": inventory_result,
    })


@emergency_bp.put("/<request_id>/reject")
@require_roles("staff", "admin")
def reject_request(request_id):
    with transaction() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, requester_id, blood_group, units, city, status, created_at
                FROM emergency_requests
                WHERE id = %s
                FOR UPDATE
                """,
                (str(request_id),),
            )
            req = cur.fetchone()
            if not req:
                return jsonify({"error": "Emergency request not found"}), 404
            if req[5] != "pending":
                return jsonify({"error": "Request is already closed"}), 409

            cur.execute(
                """
                UPDATE emergency_requests
                SET status = 'rejected'
                WHERE id = %s
                RETURNING id, requester_id, blood_group, units, city, status, created_at
                """,
                (str(request_id),),
            )
            updated_req = cur.fetchone()
            _notify_user(
                cur,
                req[1],
                f"Your emergency request for {req[3]} units of {req[2]} was rejected.",
                "emergency_rejected",
            )

    return jsonify({
        "message": "Emergency request rejected",
        "request": {
            "id": updated_req[0],
            "requester_id": updated_req[1],
            "blood_group": updated_req[2],
            "units": updated_req[3],
            "city": updated_req[4],
            "status": updated_req[5],
            "created_at": updated_req[6],
        },
    })
