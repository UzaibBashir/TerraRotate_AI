# Data sources

The official Field Shift Resources tab was inspected on 14 Nov 2026. Its complete 24-card inventory and provider classification are recorded in `docs/nasa_resource_allowlist.md`. The resources tab offers optional materials; it does not require integrating all 24. This source register distinguishes resources actually used from suggestions reviewed.

| Source | Type | Use | Resolution and limitations | Status |
|---|---|---|---|---|
| NASA POWER Daily Point API | NASA meteorology / solar estimates | T2M (2 m air temperature) and PRECTOTCORR (corrected precipitation), agriculture community | Product/grid dependent; not a field sensor; daily series | Live connector at `backend/app/services/power.py`; challenge-eligible. Live external retrieval remains unverified in this environment. |
| Farmer-entered field values | User input | Coordinates, current crop, water availability, priorities | Accuracy is user-dependent | Used per request; not persisted |
| Crop catalog | Curated broad characteristics | Crop duration, family, water class, season, legume classification | Regional and cultivar variation; see `docs/crop_catalog.md` | Prototype baseline |

No other NASA satellite product is ingested. SMAP, GPM/IMERG, Landsat, MODIS, VIIRS, SRTM, ECOSTRESS, NLDAS/GLDAS, and GEDI are listed in the official register but are not currently integrated. Optional U.S.-specific and ESA-partner resources are also documented there and not used by the Kashmir demonstration. Soil values are farmer-entered only.
