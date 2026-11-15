import re
from flask import Flask, request
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
    vercel_origin = re.compile(r"^https://[a-z0-9-]+\.vercel\.app$")
    CORS(app, resources={r"/api/*": {"origins": [*allowed, vercel_origin]}})

    @app.after_request
    def add_api_cors_headers(response):
        request_origin = request.headers.get("Origin")
        if request_origin and (request_origin in allowed or vercel_origin.fullmatch(request_origin)):
            response.headers["Access-Control-Allow-Origin"] = request_origin
            response.headers.add("Vary", "Origin")
            if response.status_code == 200 and request.method == "OPTIONS":
                response.headers["Access-Control-Allow-Methods"] = request.headers.get(
                    "Access-Control-Request-Method", "GET, POST, OPTIONS"
                )
                response.headers["Access-Control-Allow-Headers"] = "Content-Type"
        return response

    app.register_blueprint(api, url_prefix="/api")
    @app.get("/health")
    def health(): return {"status": "ok", "service": "TerraRotate API"}
    return app
