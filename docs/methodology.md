# Methodology

## Climate context

The API requests daily NASA POWER `T2M` and `PRECTOTCORR` point values for a recent 31-day window ending three days before the request date, using UTC timestamps. The API may revise availability; failures are explicit. Mean returned temperature and summed precipitation are descriptive summaries. Point estimates are gridded and cannot resolve within-field variability.

## Rotation baseline

Three candidate sequences include the selected current crop. A normalized weighted comparison uses broad crop water classes, family diversity, a legume-count soil proxy, and farmer priority. Default weights: water 0.35, diversity 0.25, soil proxy 0.20, preference 0.20. Priority options adjust weights as returned by the API. This rule baseline is not validated. Local crop-calendar feasibility and crop-family breaks need regional agronomic review.

Farmers may also enter texture, pH and organic matter. The API preserves these as user-provided context, but does not use them in ranking until locally appropriate crop suitability ranges have been verified.

No machine-learning model is trained because no suitable labeled field outcome data is available.

## Future climate scenarios

The `/api/climate/projection` route requests NASA POWER Projection API monthly `T2M` and `PRECTOTCORR` for 2041–2060 using the multi-model ensemble and all three SSP pathways. The API returns the 0.25° nearest grid cell without interpolation; only locations within NASA's documented projection coverage are accepted. This is scenario context, not a field-scale forecast or yield prediction.

## Satellite visual context

The `/api/imagery` route requests true-color visualizations from NASA GIBS for MODIS Terra, MODIS Aqua, or Suomi NPP VIIRS corrected reflectance. The image is browse imagery rendered for the selected bounding box. It is not used for NDVI calculation, crop classification, field-zone detection, or crop-stress diagnosis. Daily imagery may be absent for a chosen date and is then shown as unavailable.
