# Data provenance policy

The official Field Shift resources inventory is in `nasa_resource_allowlist.md`. Each used observation or feature is labeled by NASA POWER, NASA GIBS, an eligible listed NASA vegetation product, a listed ESA Sentinel-2 product, the crop catalog, or farmer input. Non-NASA material is never attributed to NASA.

## API provenance

NASA POWER output includes provider, API, parameter list, coordinates, requested period, URL and missing-value behavior. The daily water connector reports units and warns that source grids can differ. Climate analogue results carry the historical time range, input coordinates, source and monthly feature names. POWER's `-999` fill values become `null`.

NASA GIBS output carries source provider, layer identifier, date, requested coordinates, request URL and a statement that the rendered image is visual context only. Image samples and API responses are not treated as numeric pixel measurements.

## User-supplied analytical inputs

Numeric vegetation inputs require an eligible listed source family (NASA Landsat, MODIS or VIIRS; listed ESA Sentinel-2), date, numeric index value and native resolution. User-supplied climate candidate coordinates are fetched directly from NASA POWER. Zone clustering records its user-described source and resolution/spacing. Farmer-entered water assumptions, soil context and feedback remain labeled as farmer input. Missing dates, missing values and missing NASA soil moisture are not imputed.

## Derived outputs

Vegetation medians, anomalies, possible low-vegetation windows, water balance arithmetic, crop-rotation scores, climate-profile distances, point clusters, Beta posterior summaries and preference sensitivity are derived outputs. They do not become independent satellite observations, diagnoses, measured soil effects, validated predictions, or confidence scores.

## Demonstration data

Default coordinates (33.7311, 75.1480) are illustrative and do not represent an enrolled farm or verified boundary. `data/resource_samples/download_manifest.json` records retrieval dates, request URLs and sample provenance. Files in the sample bundle are small demonstration excerpts, not complete datasets.
