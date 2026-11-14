# Data provenance policy

The complete official Field Shift Resources-tab inventory was checked on 14 Nov 2026 and is registered in `docs/nasa_resource_allowlist.md`. Current data integrations are NASA POWER daily and projection products plus NASA GIBS MODIS/VIIRS browse imagery. Other listed items are not used unless their row is explicitly changed to integrated with exact product provenance.

NASA environmental output carries provider, service, parameters/layer, coordinates, requested window/date, retrieval date, missing-day counts, and API URL. The NASA POWER missing sentinel (-999) becomes `null`; request failures are returned as errors. GIBS images are explicitly browse visualizations, not raw reflectance, NDVI, or crop-stress diagnoses. The service does not switch products or fabricate observations.

Rotation output is deterministic and uses farmer choices plus the crop catalog. Its score is a normalized comparison aid, not a probability, model accuracy, yield estimate, or measured soil-health effect.

The default coordinates (33.7311, 75.1480) are illustrative only. They do not represent a verified farm or parcel boundary.
