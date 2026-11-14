# Implementation status — 14 Nov 2026

| Area | Status | Evidence / remaining work |
|---|---|---|
| Challenge objective research | Verified | Official challenge Details and Resources tabs reviewed |
| Official Resources tab verification | Verified | Open official tab showed 24 resources: 22 NASA-data section entries and 2 ESA partner entries |
| NASA resource allowlist | Verified | Exact visible challenge resources, links and provider types recorded in `docs/nasa_resource_allowlist.md` |
| Flask foundation | Tested | App factory, health endpoint, CORS, REST routes; covered by backend tests |
| NASA POWER daily data | Implemented | Listed source; daily point request and attribution; backend tests cover parsing and missing values |
| NASA POWER future climate scenarios | Implemented | Projection API monthly ensemble and three SSP pathways; live response unavailable from this environment |
| NASA GIBS imagery: MODIS / VIIRS / MODIS NDVI / GPM IMERG / SMAP | Implemented | Backend WMS proxy and five visually checked global browse samples; scientific map layers are display-only; full source granules are not downloaded |
| Global sample downloads | Implemented | NASA POWER daily CSV for six sample locations plus five global GIBS PNG/JPEG maps; per-file provenance in `data/resource_samples/download_manifest.json` |
| Rotation baseline | Tested | Input validation, baseline plus two alternatives, explanations and caveats |
| Next.js dashboard | Implemented | Location, crop, water and priority inputs; package install blocked by unavailable registry/cache, so build not verified |
| Crop catalog | In progress | Broad starter classes; local expert validation needed |
| Supabase schema | Implemented | Owner-scoped tables and RLS in `database/schema.sql`; not applied to a Supabase project |
| Supabase runtime integration | Not started | No project URL/keys supplied; no persistence claim |
| Eight advanced modules | Not started | To follow validated sources and methods; no decorative placeholders |
| Backend automated tests | Tested | `python -m unittest discover -s tests -v`: 18 tests passed, including mocked GIBS and POWER projection responses |
| Frontend build / live integration | Blocked | npm registry is inaccessible in this environment and packages are not cached; live NASA POWER/GIBS endpoints could not be reached by verification tools |
| Public deployment / submission package | Not started | Requires user-owned accounts and team review |
