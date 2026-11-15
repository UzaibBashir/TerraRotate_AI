"""Train and evaluate TerraRotate's experimental country-level yield context model.

Requires the public FAOSTAT QCL normalized bulk archive at data/faostat_qcl.zip.
The archive is downloaded separately; see docs/model_evaluation.md for provenance.
"""
from __future__ import annotations

import json
import zipfile
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, mean_squared_error
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

ROOT = Path(__file__).resolve().parents[1]
ARCHIVE = ROOT / "data" / "faostat_qcl.zip"
OUT = ROOT / "backend" / "app" / "data" / "faostat_yield_model.json"
META = ROOT / "backend" / "app" / "data" / "faostat_yield_model_metrics.json"


def main():
    if not ARCHIVE.exists():
        raise SystemExit(f"Missing {ARCHIVE}; download the official FAOSTAT QCL archive first.")
    with zipfile.ZipFile(ARCHIVE) as archive:
        csv_name = next(n for n in archive.namelist() if "All_Data" in n)
        rows = pd.read_csv(archive.open(csv_name), usecols=["Area Code", "Area", "Item Code", "Item", "Element", "Year", "Unit", "Value"])
    rows = rows[(rows["Element"] == "Yield") & (rows["Unit"] == "kg/ha") & (rows["Area Code"] < 5000)]
    rows["Year"] = pd.to_numeric(rows["Year"], errors="coerce")
    rows["Value"] = pd.to_numeric(rows["Value"], errors="coerce") / 1000.0  # kg/ha to t/ha
    rows = rows.dropna(subset=["Year", "Value"])
    rows = rows[(rows["Year"] >= 1980) & (rows["Value"] > 0)]
    rows["Year"] = rows["Year"].astype(int)
    rows = rows.sort_values("Year").drop_duplicates(["Area Code", "Item Code", "Year"], keep="last")
    groups = rows.groupby(["Area Code", "Item Code"], sort=False)
    rows["lag1"] = groups["Value"].shift(1)
    rows["lag3"] = groups["Value"].transform(lambda s: s.shift(1).rolling(3, min_periods=1).mean())
    rows["prev_year"] = groups["Year"].shift(1)
    rows = rows[(rows["Year"] - rows["prev_year"]) == 1].dropna(subset=["lag1", "lag3"])
    rows["log_lag1"] = np.log1p(rows["lag1"].clip(0, 30))
    rows["log_lag3"] = np.log1p(rows["lag3"].clip(0, 30))
    if rows.empty:
        raise SystemExit("No consecutive crop yield observations found in the downloaded data.")

    # Time holdout: the latest five data years are never used to fit the model.
    cutoff = int(rows["Year"].max()) - 4
    train = rows[rows["Year"] < cutoff].copy()
    test = rows[rows["Year"] >= cutoff].copy()
    cats = ["Area", "Item"]
    nums = ["Year", "log_lag1", "log_lag3"]
    preprocess = ColumnTransformer([
        ("categories", OneHotEncoder(handle_unknown="ignore", min_frequency=2), cats),
        ("numeric", StandardScaler(), nums),
    ])
    model = Pipeline([("features", preprocess), ("regression", Ridge(alpha=10.0))])
    model.fit(train[cats + nums], np.log1p(train["Value"].clip(upper=30)))
    predicted = np.expm1(model.predict(test[cats + nums])).clip(0, 30)
    baseline = test["lag1"].clip(0, 30).to_numpy()
    mae = float(mean_absolute_error(test["Value"].clip(upper=30), predicted))
    baseline_mae = float(mean_absolute_error(test["Value"].clip(upper=30), baseline))
    rmse = float(mean_squared_error(test["Value"].clip(upper=30), predicted) ** 0.5)
    model_rows = rows[["Area Code", "Area", "Item Code", "Item", "Year", "Value"]].copy()
    model_rows = model_rows.sort_values("Year").groupby(["Area Code", "Item Code"], sort=False).tail(12)
    lookup = {}
    for (area_code, item_code), series in model_rows.groupby(["Area Code", "Item Code"], sort=False):
        latest = series.sort_values("Year").tail(12)
        key = f"{int(area_code)}:{int(item_code)}"
        lookup[key] = {
            "area_code": int(area_code), "area": str(latest.iloc[-1]["Area"]),
            "item_code": int(item_code), "item": str(latest.iloc[-1]["Item"]),
            "years": latest["Year"].astype(int).tolist(), "yields_t_ha": latest["Value"].round(5).tolist(),
        }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    encoder = model.named_steps["features"].named_transformers_["categories"]
    encoder_names = list(encoder.get_feature_names_out(cats))
    coef = model.named_steps["regression"].coef_
    category_effects = {"Area": {}, "Item": {}}
    infrequent = encoder.infrequent_categories_
    for idx, column in enumerate(cats):
        rare = set(infrequent[idx].tolist()) if infrequent[idx] is not None else set()
        for value in encoder.categories_[idx]:
            feature = f"{column}_infrequent_sklearn" if value in rare else f"{column}_{value}"
            if feature in encoder_names:
                category_effects[column][str(value)] = float(coef[encoder_names.index(feature)])
    scaler = model.named_steps["features"].named_transformers_["numeric"]
    numeric_coef = coef[len(encoder_names):]
    bundle = {
        "lookup": lookup, "cutoff_year": cutoff,
        "regression": {"intercept": float(model.named_steps["regression"].intercept_),
            "category_effects": category_effects, "numeric_columns": nums,
            "numeric_means": scaler.mean_.tolist(), "numeric_scales": scaler.scale_.tolist(),
            "numeric_coefficients": numeric_coef.tolist()},
    }
    OUT.write_text(json.dumps(bundle, separators=(",", ":")), encoding="utf-8")
    metrics = {
        "source": "FAOSTAT Crops and Livestock Products (QCL), Yield element, kg/ha converted to t/ha",
        "source_url": "https://bulks-faostat.fao.org/production/Production_Crops_Livestock_E_All_Data_(Normalized).zip",
        "trained_at_utc": pd.Timestamp.now(tz="UTC").isoformat(),
        "training_years": [int(train.Year.min()), int(train.Year.max())],
        "test_years": [int(test.Year.min()), int(test.Year.max())],
        "training_rows": int(len(train)), "test_rows": int(len(test)),
        "countries": int(rows["Area Code"].nunique()), "crops": int(rows["Item Code"].nunique()),
        "mae_t_ha": round(mae, 4), "rmse_t_ha": round(rmse, 4),
        "persistence_baseline_mae_t_ha": round(baseline_mae, 4),
        "beats_persistence_baseline": bool(mae < baseline_mae),
        "target": "National annual crop yield, tonnes per hectare",
        "features": ["country", "crop", "year", "previous year national yield", "previous three-observation average"],
        "scope_note": "National history only. No crop rotation sequence, field conditions, or causality is modeled.",
    }
    META.write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    print(json.dumps(metrics, indent=2))


if __name__ == "__main__":
    main()
