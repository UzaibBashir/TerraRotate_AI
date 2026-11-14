# Global resource samples

These are small, dated samples downloaded from public NASA services on 14 Nov 2026. They are not complete global archives and are not automatically loaded by the app as production inputs.

## Downloaded

- `nasa_power_daily_global_sites.csv`: NASA POWER daily `T2M` and `PRECTOTCORR` values from 1–11 Nov 2026 at six illustrative locations across Asia, Africa, South America, and North America. Coordinates are sample points, not farms or representative national averages.
- Global NASA GIBS browse maps for Terra MODIS true color, SNPP VIIRS true color, Terra MODIS 8-day NDVI, GPM IMERG precipitation rate, and SMAP L4 analyzed surface soil moisture. These are low-resolution rendered visualizations, not original granule files or numeric point measurements. The exact imagery date can differ by layer because availability differs.
- `download_manifest.json`: exact image date, layer identifier, request URL, file size, POWER coordinates, and period.

To refresh the sample bundle from the repository root, install `scripts/requirements.txt` and run `python scripts/download_global_samples.py`.

## Remaining challenge resources

`resource_download_status.csv` records each of the 24 official resource cards, its global-scope applicability, and whether a sample was saved. Some resources are geographically limited; others need a product/version and area/time selection or authenticated access. Their complete archives are too large for a project sample bundle. Earthdata passwords or bearer tokens must not be committed or shared in chat. Use local Earthdata credentials only when downloading authenticated NASA granules.

The U.S.-only and North America-only resources are retained as conditional regional options for a truly global app, not global default data. Non-NASA resources and ESA partner resources are identified separately from NASA sources.
