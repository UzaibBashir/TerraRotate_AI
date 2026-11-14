# Implementation status — 14 Nov 2026

## Completed and verified locally

| Area | Status | Evidence |
|---|---|---|
| Field Shift resource inventory and global applicability | Verified | 24 visible challenge resource cards classified in `nasa_resource_allowlist.md`; regional products are not global defaults. |
| NASA POWER daily climate | Tested | Daily `T2M` / `PRECTOTCORR` connector, missing-value parsing, provenance, and global sample CSV. |
| NASA POWER daily water context | Verified | Live API request checked 14 Nov 2026 with `PRECTOTCORR`, `SFMC`, `RZMC`, `EVPTRNS` through the tested AG community. The official HY community value was rejected with HTTP 422 by the current daily endpoint, so the code preserves the verified AG request and null soil-moisture values rather than silently changing sources. |
| NASA POWER monthly climate analogues | Verified | Live monthly request shape checked; `/api/intelligence/climate-analogs` fetches one field point and up to five user-chosen candidate points over the same period. It compares monthly seasonal profiles, not future climates. |
| NASA POWER future projections | Verified with data gap | Live Projection API returned HTTP 200 for the illustrative Kashmir point, but every requested T2M/PRECTOTCORR scenario value was the NASA missing sentinel. The connector preserves these as `null`, reports coverage counts, and does not fabricate a scenario summary. |
| NASA GIBS visual layers | Verified | Live point-scale WMS layers for MODIS Terra/Aqua, VIIRS, MODIS 8-day NDVI, GPM IMERG and SMAP L4; zoom and map bounds are request-driven. The display maps are not decoded into measurements. |
| Interactive location and field setup | Implemented | Global coordinate entry, map point selection by pointer/keyboard, zoom, farmer-supplied GeoJSON boundary overlay, approximate polygon area, and browser-local field save/load. Boundary is not used for satellite extraction and is not uploaded. |
| NASA GIBS layer legends | Verified | Official WMS capabilities were fetched; the advertised MODIS NDVI legend was retrieved as PNG. Layers without an advertised legend show a clear message. |
| Printable field report | Implemented | Browser print view summarizes selected field, area/boundary status, NASA POWER period/data quality, rotation sequence, and limitations. |
| NASA API caching and observation provenance | Implemented | Successful POWER/GIBS results use bounded process-local TTL caches; point-series records carry provider, product, URL, date, coordinates, variable, units, resolution note, processing and missingness status. |
| Global resource samples | Implemented | Dated NASA POWER CSV and five GIBS browse images, manifest, download-status register, and ZIP bundle in `data/resource_samples/` and `data/`. These are samples, not full global archives. |
| Field intelligence | Implemented | `/api/intelligence/vegetation` analyzes dated numeric index observations from eligible NASA Landsat/MODIS/VIIRS or listed ESA Sentinel-2 sources; median/MAD summaries; no disease diagnosis. |
| Smart water | Implemented | NASA POWER point hydrology context plus farmer-entered area, demand, irrigation, and dry/normal/wet rainfall assumptions; transparent water-balance arithmetic. |
| Rotation engine | Tested | Three-season rule rankings, configurable normalized weights, adjacent-family hard constraint for alternatives, input validation, explicit practice proxy and caveats. |
| Bare-window analysis | Implemented | `/api/intelligence/bare-windows` groups low-index observation periods; labels possible low vegetation, never confirmed fallow. |
| Climate twins | Implemented | Historical NASA POWER monthly-profile analogues at candidate coordinates; not future forecasts. |
| Zone analysis | Implemented | Deterministic clustering for supplied georeferenced sample points; does not invent boundaries or upscale imagery. |
| Farmer memory and feedback | Implemented | Beta prior/posterior update and browser-local feedback history. Feedback is subjective. |
| RotationRisk | Implemented | Ranking sensitivity across four preference profiles; explicitly withholds confidence estimates. |
| Analysis user interface | Implemented | `/tools` page connects all module endpoints; unsupported values are not prefilled as evidence. |
| Backend test suite | Tested | 40 unit/API tests covering module calculations, input validation, cache behavior, GIBS map/legend handling and mocked NASA parsing. |
| Frontend tests | Tested | 4 Node built-in tests for global map bounds, coordinate projection, GeoJSON validation and approximate polygon area. |
| Schema and RLS | Implemented | 20 owner-scoped domain tables, indexes, constraints and RLS policies in `database/schema.sql`; not applied to a live project. |
| Frontend production build and dependency audit | Tested | Next.js 15.5.29 production build succeeded in the actual frontend folder; `npm audit` reported zero vulnerabilities. |
| Submission documentation | Implemented | Summary, details, provenance, methodology, limitations, model-evaluation note, demo script and SI disclosure. |

## Still requires account or team action

| Area | Status | Required action |
|---|---|---|
| Supabase persistence/authentication | In progress | Optional Supabase sign-in and RLS-scoped feedback persistence are wired in `/tools`; browser-local storage remains the no-account fallback. Apply the SQL schema and set `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `frontend/.env.local`, then verify with a project. No project credentials were provided. |
| Authenticated NASA archive downloads | Blocked | Set up a local Earthdata bearer token after signing in. Earthdata Login credentials are not collected here. Raw SRTM, ECOSTRESS, GLDAS, GEDI, Landsat and MODIS/VIIRS product granules have product, time, geographic and licensing choices; there is no single meaningful “download everything” global file. |
| Partner data services | Not integrated | ESA Sentinel-2 and Copernicus ERA5 are challenge-listed partner resources, not NASA data. Access credentials, product selection and storage are not configured. |
| Public deployment and repository | Blocked | Requires team-controlled GitHub, hosting, DNS/domain choices, and Supabase accounts. No deployment or publication was performed. |
| Competition submission | Not submitted | Team must review the originality, source declarations, SI disclosure, terms and final presentation, then submit personally. |

## Scientific validation still needed

No labeled farm outcomes, local crop calendars, field boundaries, soil laboratory results or expert-verified crop suitability ranges were supplied. Therefore no supervised model was trained, no accuracy is claimed, crop scores are comparison aids, and confidence intervals are not reported. NASA POWER pixels and GIBS browse maps are not field sensor measurements.
