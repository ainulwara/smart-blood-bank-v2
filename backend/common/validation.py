BLOOD_GROUPS = {"A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"}
ROLES = {"patient", "staff", "admin"}
REQUEST_STATUSES = {"pending", "accepted", "rejected"}


def require_json_object(data):
    if not isinstance(data, dict):
        raise ValueError("JSON object is required")
    return data


def normalize_blood_group(value: str) -> str:
    group = str(value or "").strip().upper()
    if group not in BLOOD_GROUPS:
        raise ValueError("Invalid blood group")
    return group


def positive_int(value, field: str) -> int:
    try:
        number = int(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"{field} must be an integer") from exc
    if number <= 0:
        raise ValueError(f"{field} must be greater than 0")
    return number


def non_negative_int(value, field: str) -> int:
    try:
        number = int(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"{field} must be an integer") from exc
    if number < 0:
        raise ValueError(f"{field} cannot be negative")
    return number
