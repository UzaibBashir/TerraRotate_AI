"""FAOSTAT-trained national crop-yield context model; never a field-yield estimate."""
import json
import math
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parents[1] / "data"
MODEL_PATH = DATA_DIR / "faostat_yield_model.json"
METRICS_PATH = DATA_DIR / "faostat_yield_model_metrics.json"
_bundle = None
_metrics = None


class YieldModelError(ValueError):
    pass


def _load():
    global _bundle, _metrics
    if _bundle is None:
        if not MODEL_PATH.is_file() or not METRICS_PATH.is_file():
            raise YieldModelError("The trained yield model is not installed. Run scripts/train_faostat_yield_model.py first.")
        _bundle = json.loads(MODEL_PATH.read_text(encoding="utf-8"))
        _metrics = json.loads(METRICS_PATH.read_text(encoding="utf-8"))
    return _bundle, _metrics


def model_status():
    try:
        _, metrics = _load()
        return {"available": True, "metrics": metrics}
    except (YieldModelError, OSError, ValueError):
        return {"available": False, "metrics": None}


def model_options():
    bundle, _ = _load()
    countries, crops, crop_codes_by_country = {}, {}, {}
    for record in bundle["lookup"].values():
        area_code, item_code = str(record["area_code"]), str(record["item_code"])
        countries[area_code] = record["area"]
        crops[item_code] = record["item"]
        crop_codes_by_country.setdefault(area_code, []).append(item_code)
    return {"countries": [{"code": k, "name": v} for k, v in sorted(countries.items(), key=lambda x: x[1])],
            "crops": [{"code": k, "name": v} for k, v in sorted(crops.items(), key=lambda x: x[1])],
            "crop_codes_by_country": crop_codes_by_country}


def predict_national_yield(area_code, item_code):
    bundle, metrics = _load()
    key = f"{int(area_code)}:{int(item_code)}"
    history = bundle["lookup"].get(key)
    if not history:
        raise YieldModelError("No compatible national crop-yield history exists for that country and crop.")
    years, values = history["years"], history["yields_t_ha"]
    if not values:
        raise YieldModelError("No usable historical yield observations exist for that selection.")
    numeric = [int(years[-1]) + 1,
               math.log1p(max(0, min(float(values[-1]), 30))),
               math.log1p(max(0, min(sum(values[-3:]) / min(3, len(values[-3:])), 30)))]
    regression = bundle["regression"]
    log_estimate = regression["intercept"]
    log_estimate += regression["category_effects"]["Area"].get(history["area"], 0.0)
    log_estimate += regression["category_effects"]["Item"].get(history["item"], 0.0)
    for value, mean, scale, coefficient in zip(numeric, regression["numeric_means"], regression["numeric_scales"], regression["numeric_coefficients"]):
        log_estimate += ((value - mean) / (scale or 1.0)) * coefficient
    estimate = math.expm1(log_estimate)
    estimate = max(0.0, min(30.0, estimate))
    return {
        "country": history["area"], "crop": history["item"], "target_year": int(years[-1]) + 1,
        "estimated_yield_t_ha": round(estimate, 2),
        "recent_history": [{"year": int(y), "yield_t_ha": round(float(v), 2)} for y, v in zip(years, values)],
        "latest_observation_year": int(years[-1]),
        "validation_mae_t_ha": metrics["mae_t_ha"],
        "persistence_baseline_mae_t_ha": metrics["persistence_baseline_mae_t_ha"],
        "beats_baseline": metrics["beats_persistence_baseline"],
        "baseline_estimate_t_ha": round(float(values[-1]), 2),
        "interpretation": "Experimental national-level historical yield context. Not a field yield or a causal crop-rotation effect.",
    }
