"""Download small public NASA samples for the global TerraRotate demo.

This is deliberately not a bulk archive downloader. It retrieves a short NASA
POWER daily window at representative locations and low-resolution global GIBS
renderings for layers already used in the app. All output records source and
retrieval metadata; no credentials are read or stored.
"""
from __future__ import annotations

import csv
import json
from datetime import date, timedelta
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "resource_samples"
POWER_URL = "https://power.larc.nasa.gov/api/temporal/daily/point"
GIBS_URL = "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi"
POWER_SITES = {
    "Kashmir_demo": (33.7311, 75.1480),
    "Nairobi_demo": (-1.2921, 36.8219),
    "Sao_Paulo_demo": (-23.5505, -46.6333),
    "Cairo_demo": (30.0444, 31.2357),
    "Los_Angeles_demo": (34.0522, -118.2437),
    "Tokyo_demo": (35.6762, 139.6503),
}
GIBS_LAYERS = {
    "modis_terra_true_color": ("MODIS_Terra_CorrectedReflectance_TrueColor", "image/jpeg"),
    "viirs_snpp_true_color": ("VIIRS_SNPP_CorrectedReflectance_TrueColor", "image/jpeg"),
    "modis_terra_ndvi_8day": ("MODIS_Terra_NDVI_8Day", "image/png"),
    "imerg_precipitation_rate": ("IMERG_Precipitation_Rate", "image/png"),
    "smap_l4_surface_soil_moisture": ("SMAP_L4_Analyzed_Surface_Soil_Moisture", "image/png"),
}


def download_power() -> dict:
    end = date.today() - timedelta(days=3)
    start = end - timedelta(days=10)
    rows = []
    site_status = {}
    for name, (lat, lon) in POWER_SITES.items():
        params = {
            "parameters": "T2M,PRECTOTCORR", "community": "AG",
            "longitude": f"{lon:.4f}", "latitude": f"{lat:.4f}",
            "start": start.strftime("%Y%m%d"), "end": end.strftime("%Y%m%d"),
            "format": "JSON", "time-standard": "UTC",
        }
        response = requests.get(POWER_URL, params=params, timeout=45)
        response.raise_for_status()
        payload = response.json()
        values = payload["properties"]["parameter"]
        site_rows = 0
        for day in sorted(values.get("T2M", {})):
            def valid(value):
                return value is not None and float(value) > -900
            rows.append({
                "site": name, "latitude": lat, "longitude": lon, "date": day,
                "temperature_c": float(values["T2M"][day]) if valid(values["T2M"].get(day)) else "",
                "precipitation_mm_day": float(values["PRECTOTCORR"][day]) if valid(values["PRECTOTCORR"].get(day)) else "",
                "source": "NASA POWER Daily Point API",
            })
            site_rows += 1
        site_status[name] = {"coordinates": [lat, lon], "days_returned": site_rows, "url": response.url}
    csv_path = OUT / "nasa_power_daily_global_sites.csv"
    with csv_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)
    return {"file": csv_path.name, "rows": len(rows), "period": {"start": start.isoformat(), "end": end.isoformat()}, "sites": site_status}


def download_gibs() -> list[dict]:
    results = []
    requested = date.today() - timedelta(days=3)
    for slug, (layer, image_format) in GIBS_LAYERS.items():
        last_error = None
        for offset in range(15):
            day = requested - timedelta(days=offset)
            params = {
                "SERVICE": "WMS", "VERSION": "1.1.1", "REQUEST": "GetMap",
                "LAYERS": layer, "STYLES": "", "SRS": "EPSG:4326",
                "BBOX": "-180,-85,180,85", "WIDTH": 1800, "HEIGHT": 850,
                "FORMAT": image_format, "TIME": day.isoformat(),
            }
            try:
                response = requests.get(GIBS_URL, params=params, timeout=60)
                response.raise_for_status()
            except requests.RequestException as exc:
                last_error = f"request failed on {day.isoformat()}: {exc}"
                continue
            content_type = response.headers.get("Content-Type", "").split(";", 1)[0].lower()
            if content_type == image_format:
                ext = "jpg" if image_format == "image/jpeg" else "png"
                filename = f"{slug}_{day.isoformat()}.{ext}"
                (OUT / filename).write_bytes(response.content)
                results.append({
                    "file": filename, "layer": layer, "date": day.isoformat(),
                    "format": image_format, "bytes": len(response.content),
                    "scope": "global browse rendering; low-resolution visualization, not source pixels",
                    "url": response.url,
                })
                break
            last_error = f"{content_type or 'unknown content type'} on {day.isoformat()}"
        else:
            results.append({"layer": layer, "error": f"No image returned in 15-day window: {last_error}"})
    return results


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    power = download_power()
    imagery = download_gibs()
    manifest = {
        "retrieved_date": date.today().isoformat(),
        "note": "Small public samples only. These are not complete mission archives and are not automatically used as production inputs.",
        "power": power,
        "gibs": imagery,
    }
    (OUT / "download_manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(json.dumps({"output_directory": str(OUT), "power_rows": power["rows"], "gibs_layers": imagery}, indent=2))


if __name__ == "__main__":
    main()
