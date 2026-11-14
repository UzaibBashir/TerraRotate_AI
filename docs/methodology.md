# Methodology

## Climate context

The API requests daily NASA POWER `T2M` and `PRECTOTCORR` point values for a recent 31-day window ending three days before the request date. The API may revise availability; failures are explicit. Mean returned temperature and summed precipitation are descriptive summaries. Point estimates are gridded and cannot resolve within-field variability.

## Rotation baseline

Three candidate sequences include the selected current crop. A normalized weighted comparison uses broad crop water classes, family diversity, a legume-count soil proxy, and farmer priority. Default weights: water 0.35, diversity 0.25, soil proxy 0.20, preference 0.20. Priority options adjust weights as returned by the API. This rule baseline is not validated. Local crop-calendar feasibility and crop-family breaks need regional agronomic review.

No machine-learning model is trained because no suitable labeled field outcome data is available.
