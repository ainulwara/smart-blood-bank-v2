from flask import Blueprint, g, jsonify, request
from psycopg2.errors import UniqueViolation

from common.auth import hash_password, issue_token, validate_email, verify_password
from common.http import require_auth
from common.validation import require_json_object
from config import Config
from db import fetch_one, transaction


auth_bp = Blueprint("auth", __name__)


@auth_bp.post("/register")
def register():
    data = require_json_object(request.get_json(silent=True))
    name = str(data.get("name", "")).strip()
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))

    if not name:
        return jsonify({"error": "Name is required"}), 400
    if not validate_email(email):
        return jsonify({"error": "A valid email is required"}), 400

    try:
        password_hash = hash_password(password)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    try:
        with transaction() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO users (name, email, password_hash, role, hospital_id)
                    VALUES (%s, %s, %s, 'patient', %s)
                    RETURNING id, name, email, role, hospital_id, created_at
                    """,
                    (name, email, password_hash, Config.HOSPITAL_ID),
                )
                row = cur.fetchone()
    except UniqueViolation:
        return jsonify({"error": "An account with this email already exists"}), 409

    user = {
        "id": row[0],
        "name": row[1],
        "email": row[2],
        "role": row[3],
        "hospital_id": row[4],
    }
    return jsonify({"message": "Registration successful", "user": user}), 201


@auth_bp.post("/login")
def login():
    data = require_json_object(request.get_json(silent=True))
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))

    row = fetch_one(
        """
        SELECT id, name, email, password_hash, role, hospital_id
        FROM users
        WHERE email = %s
        """,
        (email,),
    )

    if not row or not verify_password(password, row["password_hash"]):
        return jsonify({"error": "Invalid email or password"}), 401

    user = {
        "id": row["id"],
        "name": row["name"],
        "email": row["email"],
        "role": row["role"],
        "hospital_id": row["hospital_id"],
    }
    return jsonify({"token": issue_token(user), "user": user})


@auth_bp.get("/me")
@require_auth
def me():
    user = fetch_one(
        """
        SELECT id, name, email, role, hospital_id, created_at
        FROM users
        WHERE id = %s
        """,
        (g.current_user["sub"],),
    )
    # The decorator stores the decoded token on Flask g only; use the token subject directly.
    return jsonify({"user": user}) if user else (jsonify({"error": "User not found"}), 404)
