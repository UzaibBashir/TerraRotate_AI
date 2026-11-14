from flask import Flask
from flask_cors import CORS
from .routes import api

def create_app():
    app = Flask(__name__)
    app.config.from_prefixed_env()
    allowed = app.config.get("CORS_ORIGINS", "http://localhost:3000")
    CORS(app, resources={r"/api/*": {"origins": allowed.split(",")}})
    app.register_blueprint(api, url_prefix="/api")
    @app.get("/health")
    def health(): return {"status": "ok", "service": "TerraRotate API"}
    return app
