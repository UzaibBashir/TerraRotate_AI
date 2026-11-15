from flask import Flask
from flask_cors import CORS
from .routes import api

def create_app():
    app = Flask(__name__)
    app.config.from_prefixed_env()
    configured_origins = app.config.get("CORS_ORIGINS", "")
    if isinstance(configured_origins, str):
        allowed = [origin.strip() for origin in configured_origins.split(",") if origin.strip()]
    else:
        allowed = list(configured_origins)
    for origin in ("http://localhost:3000", "https://terra-rotate-ai.vercel.app"):
        if origin not in allowed:
            allowed.append(origin)
    CORS(app, resources={r"/api/*": {"origins": allowed}})
    app.register_blueprint(api, url_prefix="/api")
    @app.get("/health")
    def health(): return {"status": "ok", "service": "TerraRotate API"}
    return app
