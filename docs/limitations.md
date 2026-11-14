# Limitations and unresolved work

- The official challenge resource page lists 24 optional cards. TerraRotate integrates selected eligible resources; it does not need or claim to download every full global archive. See `nasa_resource_allowlist.md` and `data/resource_samples/resource_download_status.csv` for global suitability and data status.
- NASA POWER values are gridded estimates. Hydrology parameter grids vary by variable; at the illustrative Kashmir point, the live request returned precipitation and evaporation-energy values but no surface/root-zone moisture for the tested dates.
- NASA GIBS layers are rendered browse visualizations. No image colors are decoded to soil-moisture, precipitation or NDVI numeric values.
- Numeric vegetation analysis accepts manual, sourced values. There is no analysis-ready raster ingestion, zonal field extraction, parcel-boundary clipping or automatic numeric MODIS/Landsat processing yet.
- Bare-window output is possible low vegetation, not verified bare earth, fallow, crop harvest, or unused land.
- Water deficit uses farmer-entered crop demand and irrigation/rainfall planning values. It is not a measured irrigation consumption or a complete soil-water model. NASA POWER `EVPTRNS` is energy flux, not converted to mm of ET.
- Rotation rankings use a short provisional crop catalog, broad water classes and a legume practice proxy. No soil suitability ranges, local calendars, yields, markets, nutrient data or agronomist validation are available.
- Historical climate analogues use NASA POWER monthly temperature and precipitation at user-supplied candidate locations. Similarity scales are explicit assumptions, and candidate locations determine the result. No global search or future prediction is performed.
- Zone clusters use user-supplied point measurements only; no parcel map, contiguous management zones or upscaled field surface is created.
- Bayesian feedback is a simple binary Beta update. Current persistence is browser-local. Cross-device field history, authentication and Supabase persistence are not connected.
- RotationRisk reports sensitivity across four weighting presets; no confidence estimates, outcome probabilities, yield predictions or model accuracy are available.
- No labeled data set is available to train or validate a supervised ML model. Unit tests assess software behavior, not agricultural validity.
- The Next.js production build, public hosting, Supabase runtime, Earthdata archive download pipeline and competition submission require additional account/configuration or Windows dependency verification; see `implementation_status.md`.
