# Data provenance policy

NASA environmental output carries provider, service, parameters, coordinates, requested window, retrieval date, missing-day counts, and API URL. The NASA POWER missing sentinel (-999) becomes `null`; request failures are returned as errors. The service does not switch products or fabricate observations.

Rotation output is deterministic and uses farmer choices plus the crop catalog. Its score is a normalized comparison aid, not a probability, model accuracy, yield estimate, or measured soil-health effect.

The default coordinates (33.7311, 75.1480) are illustrative only. They do not represent a verified farm or parcel boundary.
