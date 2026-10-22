from flask import Blueprint

from sync.service import receive_sync_http

sync_bp = Blueprint("sync", __name__)
sync_bp.add_url_rule("/receive", view_func=receive_sync_http, methods=["POST"])
