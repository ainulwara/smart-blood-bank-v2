from flask import Blueprint, jsonify, request
from psycopg2.errors import UniqueViolation

from common.http import require_roles
from config import Config
from db import fetch_all, fetch_one, transaction


admin_bp = Blueprint("admin", __name__)


@admin_bp.get("/hospitals")
@require_roles("admin")
def list_hospitals():
    rows = fetch_all(
        """
        SELECT id, name, city, api_url, created_at
        FROM hospitals
        ORDER BY id
        """
    )
    return jsonify({"hospitals": rows})


@admin_bp.post("/hospitals")
@require_roles("admin")
def manage_hospital():
    data = request.get_json(silent=True) or {}
    hospital_id = str(data.get("id", "")).strip().upper()
    name = str(data.get("name", "")).strip()
    city = str(data.get("city", "")).strip()
    api_url = str(data.get("api_url", "")).strip()

    if hospital_id not in Config.ALLOWED_HOSPITAL_IDS:
        return jsonify({"error": "This project supports only Hospital IDs A, B, and C"}), 400
    if not all([name, city, api_url]):
        return jsonify({"error": "id, name, city and api_url are required"}), 400

    try:
        with transaction() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO hospitals (id, name, city, api_url)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT (id) DO UPDATE
                    SET name = EXCLUDED.name,
                        city = EXCLUDED.city,
                        api_url = EXCLUDED.api_url
                    RETURNING id, name, city, api_url, created_at
                    """,
                    (hospital_id, name, city, api_url),
                )
                row = cur.fetchone()
    except UniqueViolation:
        return jsonify({"error": "Hospital API URL must be unique"}), 409

    return jsonify({
        "message": "Hospital information saved locally",
        "hospital": {
            "id": row[0],
            "name": row[1],
            "city": row[2],
            "api_url": row[3],
            "created_at": row[4],
        },
    }), 201


@admin_bp.get("/reports")
@require_roles("admin")
def reports():
    by_hospital = fetch_all(
        """
        SELECT bi.hospital_id, h.name AS hospital_name, h.city,
               SUM(bi.units) AS total_units,
               COUNT(*) AS blood_group_count
        FROM blood_inventory bi
        JOIN hospitals h ON h.id = bi.hospital_id
        GROUP BY bi.hospital_id, h.name, h.city
        ORDER BY bi.hospital_id
        """
    )
    by_group = fetch_all(
        """
        SELECT blood_group, SUM(units) AS network_units
        FROM blood_inventory
        GROUP BY blood_group
        ORDER BY blood_group
        """
    )
    emergency_summary = fetch_all(
        """
        SELECT status, COUNT(*) AS count
        FROM emergency_requests
        GROUP BY status
        ORDER BY status
        """
    )
    low_stock = fetch_all(
        """
        SELECT bi.hospital_id, h.name AS hospital_name, h.city,
               bi.blood_group, bi.units, bi.updated_at
        FROM blood_inventory bi
        JOIN hospitals h ON h.id = bi.hospital_id
        WHERE bi.units <= %s
        ORDER BY bi.units ASC, bi.hospital_id, bi.blood_group
        """,
        (Config.LOW_STOCK_THRESHOLD,),
    )

    return jsonify({
        "generated_at_utc": fetch_one("SELECT NOW() AS generated_at")["generated_at"],
        "current_hospital_id": Config.HOSPITAL_ID,
        "inventory_by_hospital": by_hospital,
        "inventory_by_blood_group": by_group,
        "emergency_summary": emergency_summary,
        "low_stock": low_stock,
        "low_stock_threshold": Config.LOW_STOCK_THRESHOLD,
    })
