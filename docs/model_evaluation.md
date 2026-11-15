# Experimental yield model

## What is deployed in the prototype

The `/model` page uses a trained Ridge regression model to estimate the next annual **national crop yield** (tonnes per hectare) for a selected country and crop. It is separate from the rotation ranking. Inputs are country, crop, year, previous-year national yield, and the mean of up to three recent reported yields. The FAOSTAT QCL `Yield` values are converted from kg/ha to t/ha. The model is not a farm/field forecast and does not estimate the causal effect of a preceding crop or rotation.

The exported regression coefficients and compact history lookup are in `backend/app/data/faostat_yield_model.json`; metrics and provenance are in `backend/app/data/faostat_yield_model_metrics.json`. The full source archive is intentionally not bundled in Git. Reproduce the fit with the official QCL normalized bulk file saved as `data/faostat_qcl.zip`, then run `python scripts/train_faostat_yield_model.py` from the repository root. The backend serves the exported plain-data model without importing machine-learning packages. Retraining requires pandas, NumPy, and scikit-learn, listed in backend requirements.

## Data and evaluation

Source: FAO. 2026. *FAOSTAT: Crops and livestock products (QCL).* Accessed 15 Nov 2026. https://bulks-faostat.fao.org/production/Production_Crops_Livestock_E_All_Data_(Normalized).zip. Licence: CC-BY-4.0. Dataset attribution follows [FAO statistical database terms](https://www.fao.org/contact-us/terms/db-terms-of-use/). FAOSTAT data may include third-party exceptions; check the current source metadata before redistribution.

The fit used 384,254 consecutive country/crop/year rows from 1981–2019. The latest five years, 2020–2024 (53,487 rows), were held out by time. On that holdout, the model’s MAE was **0.5586 t/ha** and RMSE was **1.3640 t/ha**. A simple previous-year-yield baseline had MAE **0.5182 t/ha**. The trained model did not beat that baseline overall. The page shows both values and warns users about the comparison. This is an aggregate score; per-country/per-crop performance varies and is not independently reviewed.

## Limits and next data needed

The training set has no rotation sequence, field soil, irrigation, cultivar, planting date, management, or field-level yield labels. National observations aggregate very different growing conditions. Therefore, this model is presented as experimental historical context only and does not change the rule-based rotation recommendation. Do not interpret the output as a probability, causal estimate, farm prediction, or agronomic advice.

To make a useful rotation model, obtain permissioned multi-season field/trial records linking prior crop sequence, location, crop, management, and yield; join compatible weather; hold out entire locations and years; compare against simple local baselines; and review performance with regional agronomists before enabling decisions.
