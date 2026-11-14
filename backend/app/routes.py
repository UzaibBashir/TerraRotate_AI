from datetime import date, timedelta
import math
import json
from pathlib import Path
from flask import Blueprint, jsonify, request, Response, send_from_directory, abort
from .services.power import fetch_power_daily, fetch_power_projection, PowerError
from .services.gibs import fetch_gibs_image, GIBSError
from .services.rotation import recommend_rotations, CROPS

api = Blueprint("api", __name__)
SAMPLE_DIR = Path(__file__).resolve().parents[2] / "data" / "resource_samples"

@api.get("/resource-samples")
def resource_samples():
    """List the small, dated sample assets bundled with the project."""
    manifest_path = SAMPLE_DIR / "download_manifest.json"
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return jsonify({"error": "The sample manifest is unavailable"}), 503
    names = []
    power_file = manifest.get("power", {}).get("file")
    if power_file:
        names.append(power_file)
    names.extend(item["file"] for item in manifest.get("gibs", []) if item.get("file"))
    files = [{"name": name, "url": f"/api/resource-samples/{name}", "bytes": (SAMPLE_DIR / name).stat().st_size}
             for name in names if (SAMPLE_DIR / name).is_file()]
    return jsonify({"retrieved_date": manifest.get("retrieved_date"), "note": manifest.get("note"), "files": files})

@api.get("/resource-samples/<path:filename>")
def download_resource_sample(filename):
    """Serve only assets explicitly listed in the generated sample manifest."""
    manifest_path = SAMPLE_DIR / "download_manifest.json"
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return jsonify({"error": "The sample manifest is unavailable"}), 503
    names = {manifest.get("power", {}).get("file")}
    names.update(item.get("file") for item in manifest.get("gibs", []))
    if filename not in names or not filename or Path(filename).name != filename:
        abort(404)
    if not (SAMPLE_DIR / filename).is_file():
        abort(404)
    return send_from_directory(SAMPLE_DIR, filename, as_attachment=True, download_name=filename)

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

@api.get("/climate/projection")
def climate_projection():
    try:
        lat,lon=float(request.args.get("lat","")),float(request.args.get("lon",""))
        start_year=int(request.args.get("start_year","2041")); end_year=int(request.args.get("end_year","2060"))
    except ValueError: return jsonify({"error":"Coordinates and years must be numeric"}),400
    if not (math.isfinite(lat) and math.isfinite(lon) and -59.875<=lat<=89.875 and -179.875<=lon<=179.875):
        return jsonify({"error":"NASA POWER Projection covers latitude -59.875–89.875 and longitude -179.875–179.875"}),400
    if start_year<2015 or end_year>2100 or end_year<start_year or end_year-start_year>40:
        return jsonify({"error":"Choose a projection period from 2015–2100, no longer than 40 years"}),400
    try: return jsonify(fetch_power_projection(lat,lon,start_year,end_year))
    except PowerError as exc: return jsonify({"error":str(exc),"source":"NASA POWER Projection API"}),502

@api.get("/imagery")
def imagery():
    try:
        lat,lon=float(request.args.get("lat","")),float(request.args.get("lon",""))
        layer=request.args.get("layer","modis_terra")
        day=date.fromisoformat(request.args.get("date",(date.today()-timedelta(days=3)).isoformat()))
    except ValueError: return jsonify({"error":"Provide valid coordinates and an ISO date"}),400
    if not (math.isfinite(lat) and math.isfinite(lon) and -90<=lat<=90 and -180<=lon<=180):
        return jsonify({"error":"Coordinates are outside valid ranges"}),400
    if day>date.today(): return jsonify({"error":"Imagery date cannot be in the future"}),400
    try:
        image,metadata=fetch_gibs_image(lat,lon,day,layer)
        response=Response(image,mimetype=metadata.get("content_type","image/jpeg"))
        response.headers["X-Data-Source"]=metadata["provider"]
        response.headers["X-Data-Date"]=metadata["date"]
        response.headers["X-Data-Layer"]=metadata["layer"]["id"]
        response.headers["X-Data-Note"]=metadata["note"]
        response.headers["Cache-Control"]="public, max-age=21600"
        return response
    except ValueError as exc: return jsonify({"error":str(exc)}),400
    except GIBSError as exc: return jsonify({"error":str(exc),"source":"NASA GIBS"}),502

@api.post("/rotations")
def rotations():
    try: return jsonify(recommend_rotations(request.get_json(silent=True) or {}))
    except ValueError as exc: return jsonify({"error": str(exc)}), 400
