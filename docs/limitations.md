# Limitations

- The allowlist was checked against the official challenge Resources tab on 14 Nov 2026.
- NASA POWER climate values are gridded estimates, not farm sensor measurements; short summaries do not diagnose crop stress.
- NASA POWER projections use a 0.25° nearest-cell climate model grid and cannot predict a specific farm's future conditions or outcomes.
- NASA GIBS MODIS/VIIRS, SMAP and GPM/IMERG layers are rendered visualizations. The app does not extract numeric soil-moisture or rainfall observations from their pixels. No Landsat integration, NDVI computation, or image-derived crop diagnosis is implemented.
- The starter crop catalog is broad and incomplete; regional and cultivar differences need expert review.
- Rotation scores have no outcome validation, yield data, uncertainty interval, or measured soil-health effect.
- Field boundaries, map, spatial zones, Supabase, authentication, persistent farmer memory, climate scenarios, and report export are not implemented yet.
- No fallback satellite observations are used; network outages make climate observations unavailable.
