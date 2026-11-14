# Data sources

The official Field Shift Resources tab was inspected on 14 Nov 2026. Its complete 24-card inventory and provider classification are recorded in `docs/nasa_resource_allowlist.md`. The resources tab offers optional materials; it does not require integrating all 24. This source register distinguishes resources actually used from suggestions reviewed.

| Source | Type | Use | Resolution and limitations | Status |
|---|---|---|---|---|
| NASA POWER Daily Point API | NASA meteorology / solar estimates | T2M (2 m air temperature) and PRECTOTCORR (corrected precipitation), agriculture community | Product/grid dependent; nearest point grid cell; not a field sensor | Live connector at `backend/app/services/power.py`; challenge-eligible. |
| NASA POWER Projection API | NASA NEX-GDDP-CMIP6 multi-model ensemble exposed by POWER | Monthly T2M and PRECTOTCORR for SSP1-2.6, SSP2-4.5, SSP3-7.0 | 0.25° global grid, nearest cell without interpolation; 2015–2100; not a farm forecast | Connector implemented; live endpoint could not be reached from this environment |
| NASA GIBS WMS imagery | NASA MODIS / VIIRS corrected-reflectance browse visualizations | MODIS Terra/Aqua and SNPP VIIRS true-color imagery around the user point/date | Daily browse render at the product's native 250–500 m layer family; visual context, not analysis-ready field measurement | Backend image proxy implemented; live endpoint could not be reached from this environment |
| Farmer-entered field values | User input | Coordinates, current crop, water availability, priorities | Accuracy is user-dependent | Used per request; not persisted |
| Crop catalog | Curated broad characteristics | Crop duration, family, water class, season, legume classification | Regional and cultivar variation; see `docs/crop_catalog.md` | Prototype baseline |

SMAP, GPM/IMERG, Landsat, SRTM, ECOSTRESS, NLDAS/GLDAS, and GEDI remain listed but not directly ingested. GIBS imagery is browse visualization only. Optional U.S.-specific and ESA partner resources are documented in the official register but are not used by the Kashmir demonstration. Soil values are farmer-entered only.
