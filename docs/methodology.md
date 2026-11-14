# Methods and assumptions

## NASA POWER climate context

`/api/climate` requests NASA POWER daily `T2M` and `PRECTOTCORR` for the recent 31-day window ending three days before the request. `-999` and unavailable values become `null`; no alternate dataset is substituted. Values are gridded context, not field sensor readings.

## NASA POWER water context and water budget

`/api/intelligence/water` requests daily `PRECTOTCORR`, `SFMC`, `RZMC`, and `EVPTRNS` using POWER's tested Agroclimatology API community. Parameter source grids may differ. `SFMC` and `RZMC` remain volumetric fractions; missing values remain missing. `EVPTRNS` is reported as energy flux (MJ/m²/day), not converted to an ET water depth. The budget separately uses farmer-entered field area, crop water demand, planned irrigation, and dry/normal/wet rainfall assumptions. For depth in mm and area in hectares, volume is mm × hectares × 10 m³. Effective rainfall, soil storage, conveyance loss, runoff and crop-stage timing are not modeled.

## Field intelligence and possible bare windows

`/api/intelligence/vegetation` and `/api/intelligence/bare-windows` accept dated numeric values from a challenge-listed NASA Landsat/MODIS/VIIRS product or listed ESA Sentinel-2. Each payload must include product/source text and native resolution. The app does not automatically decode GIBS images or download analysis-ready rasters. Values are sorted by date; gaps are not filled. Median and median absolute deviation summarize the supplied values; an outlier is flagged only when MAD is nonzero and the deviation exceeds three robust standard deviations. Values below a user threshold (0.2 by default) are labeled possible low vegetation. This is not a disease or nutrient diagnosis, bare-soil classification or verified fallow classification.

## Crop rotation baseline

The API ranks the current crop continued and up to two three-season alternatives from the catalog. Alternatives cannot repeat the same crop family in adjacent seasons. Weight inputs for water, diversity, soil-practice proxy and preference must be finite/non-negative and are normalized to sum to one. The catalog's legume indicator contributes a simple practice proxy; this is not measured soil health or crop-specific soil suitability. Broad water categories are relative catalog classes. Soil details remain visible as context and are not scored. No yields, planting-window feasibility, market price, cultivar, nutrient, climate-stress or pest model is implied.

## Historical climate analogues

`/api/intelligence/climate-analogs` retrieves monthly NASA POWER `T2M` and `PRECTOTCORR` for one field point and up to five candidate coordinates over a common period (default 1991–2020). It averages each calendar month's available values, then computes an RMS distance across monthly temperature and precipitation profiles after dividing differences by 10°C and 5 mm/day respectively. Similarity score is `100 / (1 + distance)`. These scales and the candidate set are configurable assumptions, not calibrated similarity thresholds. The output describes historical climate patterns only, not future climate or crop suitability.

## Zones

`/api/intelligence/zones` applies deterministic K-means-like clustering to farmer-supplied georeferenced sample points and numeric attributes. Features are standardized; coordinates influence spatial grouping. Cluster labels describe supplied samples only. The output does not create field boundaries, satellite-derived zones or high-resolution surfaces.

## Farmer feedback and RotationRisk

Feedback uses a Beta(2,2) prior on a binary farmer response of helpful/not helpful. Each response increments one Beta count. The posterior mean summarizes subjective feedback only; no interval or causal effect is claimed. The current demo stores counts in that browser's local storage. RotationRisk reranks the rule baseline across four preference presets and reports top-choice stability across those presets. Stability is not probability, predictive confidence or outcome validation. No model is trained because the project has no labeled field outcome data.

## NASA GIBS display

The `/api/imagery` endpoint displays MODIS Terra/Aqua, VIIRS, Terra MODIS 8-day NDVI, GPM IMERG precipitation-rate and SMAP L4 browse layers from the official NASA GIBS WMS. Images retain date/layer/source headers and are contextual visualizations only. They are not converted to per-field measurements or model inputs.

## NASA POWER projection panel

The existing projection panel uses NASA POWER monthly multi-model scenarios. It is shown as a separately labeled scenario context and is not used to generate the historical analogue rankings, crop rankings or field forecasts. The allowlist requires team verification that the exact projection product is within the challenge-listed POWER resource before submission.
