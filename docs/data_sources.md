# Data sources

| Source | Type | Use | Resolution and limitations | Status |
|---|---|---|---|---|
| NASA POWER Daily Point API | NASA meteorology / solar estimates | T2M (2 m air temperature) and PRECTOTCORR (corrected precipitation), agriculture community | Product/grid dependent; not a field sensor; daily series | Live connector at `backend/app/services/power.py` |
| Farmer-entered field values | User input | Coordinates, current crop, water availability, priorities | Accuracy is user-dependent | Used per request; not persisted |
| Crop catalog | Curated broad characteristics | Crop duration, family, water class, season, legume classification | Regional and cultivar variation; see `docs/crop_catalog.md` | Prototype baseline |

No other satellite product is ingested. Soil values are not automatically inferred.
