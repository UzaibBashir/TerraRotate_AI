from datetime import date, timedelta
import math
from flask import Blueprint, jsonify, request
from .services.power import fetch_power_daily, PowerError
from .services.rotation import recommend_rotations, CROPS

api = Blueprint("api", __name__)

@api.get("/catalog")
def catalog(): return jsonify({"crops": list(CROPS.values())})

@api.get("/climate")
def climate():
    try:
        lat, lon = float(request.args.get("lat", "")), float(request.args.get("lon", ""))
    except ValueError: return jsonify({"error": "lat and lon must be numbers"}), 400
    if not (math.isfinite(lat) and math.isfinite(lon) and -90 <= lat <= 90 and -180 <= lon <= 180):
        return jsonify({"error": "Coordinates are outside valid ranges"}), 400
    end = date.today() - timedelta(days=3)
    try: return jsonify(fetch_power_daily(lat, lon, end-timedelta(days=30), end))
    except PowerError as exc: return jsonify({"error": str(exc), "source": "NASA POWER"}), 502

@api.post("/rotations")
def rotations():
    try: return jsonify(recommend_rotations(request.get_json(silent=True) or {}))
    except ValueError as exc: return jsonify({"error": str(exc)}), 400
