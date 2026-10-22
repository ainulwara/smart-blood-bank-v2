from flask import Blueprint, g, jsonify

from common.http import require_auth
from db import fetch_all, transaction


notifications_bp = Blueprint("notifications", __name__)


@notifications_bp.get("")
@require_auth
def list_notifications():
    rows = fetch_all(
        """
        SELECT id, message, type, is_read, created_at
        FROM notifications
        WHERE user_id = %s
        ORDER BY created_at DESC
        """,
        (g.current_user["sub"],),
    )
    return jsonify({"notifications": rows})


@notifications_bp.put("/<notification_id>/read")
@require_auth
def mark_read(notification_id):
    with transaction() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE notifications
                SET is_read = TRUE
                WHERE id = %s AND user_id = %s
                RETURNING id, message, type, is_read, created_at
                """,
                (str(notification_id), g.current_user["sub"]),
            )
            row = cur.fetchone()

    if not row:
        return jsonify({"error": "Notification not found"}), 404
    return jsonify({
        "notification": {
            "id": row[0],
            "message": row[1],
            "type": row[2],
            "is_read": row[3],
            "created_at": row[4],
        }
    })
