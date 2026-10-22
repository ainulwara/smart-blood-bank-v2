from flask import Flask, jsonify

from admin.routes import admin_bp
from auth.routes import auth_bp
from blood.routes import blood_bp
from emergency.routes import emergency_bp
from notifications.routes import notifications_bp
from sync.routes import sync_bp
from sync.service import start_retry_scheduler


def create_app() -> Flask:
    app = Flask(__name__)

    app.register_blueprint(auth_bp, url_prefix="/auth")
    app.register_blueprint(blood_bp, url_prefix="/blood")
    app.register_blueprint(emergency_bp, url_prefix="/emergency")
    app.register_blueprint(notifications_bp, url_prefix="/notifications")
    app.register_blueprint(admin_bp, url_prefix="/admin")
    app.register_blueprint(sync_bp, url_prefix="/sync")

    @app.get("/health")
    def health():
        return jsonify({"status": "ok"})

    @app.errorhandler(404)
    def not_found(_error):
        return jsonify({"error": "Route not found"}), 404

    @app.errorhandler(405)
    def method_not_allowed(_error):
        return jsonify({"error": "Method not allowed"}), 405

    start_retry_scheduler(app)
    return app


app = create_app()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False, use_reloader=False)
