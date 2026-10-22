from flask import Blueprint, current_app, g, jsonify, request

from common.http import require_roles
from common.validation import non_negative_int, normalize_blood_group
from config import Config
from db import fetch_all
from sync.service import update_local_inventory_and_enqueue


blood_bp = Blueprint("blood", __name__)


@blood_bp.get("/search")
def search_blood():
    group = request.args.get("group")
    city = request.args.get("city")

    params = []
    clauses = ["bi.units > 0"]

    if group:
        try:
            group = normalize_blood_group(group)
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400
        clauses.append("bi.blood_group = %s")
        params.append(group)

    if city:
        clauses.append("h.city ILIKE %s")
        params.append(f"%{city.strip()}%")

    where_sql = " AND ".join(clauses)
    rows = fetch_all(
        f"""
        SELECT bi.id, bi.hospital_id, h.name AS hospital_name, h.city,
               bi.blood_group, bi.units, bi.updated_at,
               bi.updated_by_hospital_id
        FROM blood_inventory bi
        JOIN hospitals h ON h.id = bi.hospital_id
        WHERE {where_sql}
        ORDER BY h.city, h.name, bi.blood_group
        """,
        tuple(params),
    )
    return jsonify({"results": rows, "count": len(rows)})


@blood_bp.get("/inventory")
@require_roles("staff", "admin")
def get_inventory():
    rows = fetch_all(
        """
        SELECT bi.id, bi.hospital_id, h.name AS hospital_name, h.city,
               bi.blood_group, bi.units, bi.updated_at,
               bi.updated_by_hospital_id
        FROM blood_inventory bi
        JOIN hospitals h ON h.id = bi.hospital_id
        ORDER BY bi.hospital_id, bi.blood_group
        """
    )
    return jsonify({"hospital_id": Config.HOSPITAL_ID, "inventory": rows})


@blood_bp.put("/inventory")
@require_roles("staff", "admin")
def update_inventory():
    data = request.get_json(silent=True) or {}
    try:
        group = normalize_blood_group(data.get("blood_group"))
        units = non_negative_int(data.get("units"), "units")
        result = update_local_inventory_and_enqueue(
            blood_group=group,
            units=units,
        )
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception:
        current_app.logger.exception("Inventory update failed")
        return jsonify({"error": "Inventory update failed"}), 500

    return jsonify({"message": "Inventory updated", "inventory": result}), 200
