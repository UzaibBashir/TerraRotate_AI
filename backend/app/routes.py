from datetime import date, timedelta
from concurrent.futures import ThreadPoolExecutor
import math
import json
from pathlib import Path
from flask import Blueprint, jsonify, request, Response, send_from_directory, abort
from .services.power import fetch_power_daily, fetch_power_projection, fetch_power_water, fetch_power_monthly_profile, PowerError
from .services.gibs import fetch_gibs_image, fetch_gibs_legend, GIBSError
from .services.rotation import recommend_rotations, CROPS
from .services.intelligence import vegetation, bare_windows, water_budget, historical_climate_analogs, spatial_zones, bayesian_feedback, rotation_risk

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
        zoom=int(request.args.get("zoom","1"))
        day=date.fromisoformat(request.args.get("date",(date.today()-timedelta(days=3)).isoformat()))
    except ValueError: return jsonify({"error":"Provide valid coordinates and an ISO date"}),400
    if not (math.isfinite(lat) and math.isfinite(lon) and -90<=lat<=90 and -180<=lon<=180):
        return jsonify({"error":"Coordinates are outside valid ranges"}),400
    if day>date.today(): return jsonify({"error":"Imagery date cannot be in the future"}),400
    try:
        image,metadata=fetch_gibs_image(lat,lon,day,layer,zoom)
        response=Response(image,mimetype=metadata.get("content_type","image/jpeg"))
        response.headers["X-Data-Source"]=metadata["provider"]
        response.headers["X-Data-Date"]=metadata["date"]
        response.headers["X-Data-Layer"]=metadata["layer"]["id"]
        response.headers["X-Data-Note"]=metadata["note"]
        if metadata.get("bounds"):
            response.headers["X-Map-Bounds"]=json.dumps(metadata["bounds"],separators=(",",":"))
        response.headers["Cache-Control"]="public, max-age=21600"
        return response
    except ValueError as exc: return jsonify({"error":str(exc)}),400
    except GIBSError as exc: return jsonify({"error":str(exc),"source":"NASA GIBS"}),502

@api.get("/imagery/legend")
def imagery_legend():
    layer=request.args.get("layer","modis_terra")
    try:
        image,metadata=fetch_gibs_legend(layer)
        response=Response(image,mimetype=metadata.get("content_type","image/png"))
        response.headers["X-Data-Source"]=metadata["provider"]
        response.headers["X-Data-Layer"]=metadata["layer"]["id"]
        response.headers["X-Data-Note"]=metadata["note"]
        response.headers["Cache-Control"]="public, max-age=604800"
        return response
    except ValueError as exc: return jsonify({"error":str(exc)}),400
    except GIBSError as exc: return jsonify({"error":str(exc),"source":"NASA GIBS"}),502

@api.post("/rotations")
def rotations():
    try: return jsonify(recommend_rotations(request.get_json(silent=True) or {}))
    except ValueError as exc: return jsonify({"error": str(exc)}), 400

def _analysis_body():
    body=request.get_json(silent=True)
    if not isinstance(body,dict): raise ValueError("Send a JSON object")
    return body

@api.post("/intelligence/vegetation")
def vegetation_analysis():
    try: return jsonify(vegetation(_analysis_body()))
    except ValueError as exc: return jsonify({"error":str(exc)}),400

@api.post("/intelligence/bare-windows")
def bare_window_analysis():
    try: return jsonify(bare_windows(_analysis_body()))
    except ValueError as exc: return jsonify({"error":str(exc)}),400

@api.post("/intelligence/water")
def water_analysis():
    try:
        body=_analysis_body(); lat=float(body.get("latitude")); lon=float(body.get("longitude"))
        if not (math.isfinite(lat) and math.isfinite(lon) and -90<=lat<=90 and -180<=lon<=180): raise ValueError("Coordinates are outside valid ranges")
        end=date.today()-timedelta(days=3)
        nasa=fetch_power_water(lat,lon,end-timedelta(days=29),end)
        valid=[row for row in nasa["rows"] if row.get("sfmc") is not None or row.get("rzmc") is not None]
        if valid:
            nasa["soil_moisture_summary"]={"mean_surface_volumetric_content":round(sum(r["sfmc"] for r in valid if r.get("sfmc") is not None)/sum(r.get("sfmc") is not None for r in valid),4) if any(r.get("sfmc") is not None for r in valid) else None,
                                           "mean_root_zone_volumetric_content":round(sum(r["rzmc"] for r in valid if r.get("rzmc") is not None)/sum(r.get("rzmc") is not None for r in valid),4) if any(r.get("rzmc") is not None for r in valid) else None,
                                           "note":"Coarse gridded NASA estimate; not a field sensor reading."}
        return jsonify(water_budget(body,nasa))
    except (ValueError,TypeError) as exc: return jsonify({"error":str(exc)}),400
    except PowerError as exc: return jsonify({"error":str(exc),"source":"NASA POWER Daily Hydrology"}),502

@api.post("/intelligence/climate-analogs")
def climate_analog_analysis():
    try:
        body=_analysis_body(); field=body.get("field"); candidates=body.get("candidates")
        if not isinstance(field,dict) or not isinstance(candidates,list) or not candidates or len(candidates)>5:
            raise ValueError("Provide a field coordinate and between one and five candidate coordinates")
        if any(not isinstance(candidate,dict) for candidate in candidates):
            raise ValueError("Each candidate must be an object with a name and coordinates")
        start=int(body.get("start_year",1991)); end=int(body.get("end_year",2020)); latest=date.today().year-1
        if start<1981 or end>latest or end<start or end-start>39: raise ValueError(f"Choose a historical period between 1981 and {latest}, no longer than 40 years")
        sites=[{"name":"Field","latitude":float(field["latitude"]),"longitude":float(field["longitude"])}]
        for candidate in candidates:
            name=str(candidate.get("name","Candidate")).strip()
            if not name or len(name)>120: raise ValueError("Candidate names must contain 1 to 120 characters")
            sites.append({"name":name,"latitude":float(candidate["latitude"]),"longitude":float(candidate["longitude"])})
        if any(not (math.isfinite(s["latitude"]) and math.isfinite(s["longitude"]) and -90<=s["latitude"]<=90 and -180<=s["longitude"]<=180) for s in sites): raise ValueError("Coordinates must be finite and within valid ranges")
        with ThreadPoolExecutor(max_workers=3) as pool:
            futures=[pool.submit(fetch_power_monthly_profile,s["latitude"],s["longitude"],start,end) for s in sites]
            profiles=[future.result() for future in futures]
        for source,profile in zip(sites,profiles): source["data"]=profile
        result=historical_climate_analogs(profiles[0],sites[1:]); result["candidate_count"]=len(candidates)
        result["note"]="Similar locations depend on the candidate coordinates supplied; no global search is implied."
        return jsonify(result)
    except (ValueError,TypeError,KeyError) as exc: return jsonify({"error":str(exc)}),400
    except PowerError as exc: return jsonify({"error":str(exc),"source":"NASA POWER Monthly Point API"}),502

@api.post("/intelligence/zones")
def zone_analysis():
    try: return jsonify(spatial_zones(_analysis_body()))
    except ValueError as exc: return jsonify({"error":str(exc)}),400

@api.post("/intelligence/farmer-feedback")
def feedback_analysis():
    try: return jsonify(bayesian_feedback(_analysis_body()))
    except ValueError as exc: return jsonify({"error":str(exc)}),400

@api.post("/intelligence/rotation-risk")
def rotation_risk_analysis():
    return jsonify(rotation_risk(recommend_rotations))
