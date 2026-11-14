# Model and method evaluation

## Model status

No supervised or deep-learning model is trained or deployed. The repository has no labeled, field-level outcomes for crop stress, yield, soil change, water use, or farmer recommendation success. No accuracy, validation score, uncertainty interval, or causal impact is claimed.

## Software behavior checks

The Flask suite checks API input validation, NASA response parsing, missing-value handling, rotation weight normalization and family-break constraints, water-balance arithmetic, vegetation/bare-window labels, climate-analogue ordering, sample clustering, Beta feedback updates, and RotationRisk confidence withholding. These tests use mocked responses and supplied fixtures; they establish code behavior only, not scientific validity.

## Methods in use

- Vegetation summaries: median, median absolute deviation and first-to-last difference from user-supplied dated observations.
- Bare windows: threshold and date-gap grouping; possible low vegetation only.
- Zones: deterministic clustering of user-supplied point measurements; exploratory sample clusters only.
- Climate analogues: seasonal distance between NASA POWER historical monthly profiles at coordinates selected by the user.
- Rotation: weighted catalog rules with configurable normalized weights and a family-break constraint; local suitability is not established.
- Water: explicit depth/area arithmetic using farmer-entered planning assumptions alongside separate NASA POWER context.
- Feedback: Beta(2,2) prior updated with subjective binary feedback.
- RotationRisk: rank sensitivity across four preference presets; no probability or confidence.

## Evaluation needed before agricultural use

The team should obtain permissioned multi-season field observations across crops and agroecological regions, define independent outcome labels, use location/time-separated holdouts to prevent leakage, compare against local agronomist and farmer baselines, measure calibration and error by crop/region, and review the methods with agricultural experts. No such evaluation is currently complete.
