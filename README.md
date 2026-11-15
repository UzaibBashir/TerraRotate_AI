# TerraRotate AI

Explainable, farmer-led exploration of climate-aware crop-rotation options for NASA Space Apps Challenge 2026 — Field Shift.

## Working increment

- Next.js dashboard for global coordinates, current crop, farmer-entered soil context, water availability, and priority. Interactive NASA GIBS map supports layer/date selection, zoom, click/keyboard location selection, a farmer-provided GeoJSON boundary overlay and NASA-advertised legends where available.
- Local field registration stores the farmer's field name, coordinates, boundary and area in this browser only. GeoJSON area is an approximate geodesic calculation. A printable field report summarizes loaded NASA POWER evidence and current rotation options.
- Flask API queries NASA POWER daily point data (`T2M`, `PRECTOTCORR`) with provenance and missingness.
- NASA GIBS displays listed SMAP L4 soil-moisture and GPM IMERG precipitation maps, MODIS 8-day NDVI, and MODIS/VIIRS imagery as separate visual evidence. These images are not converted into numeric field readings.
- NASA POWER supplies the numeric daily temperature and precipitation context; its multi-model climate-scenario view is separate.
- Small, dated global NASA POWER and GIBS samples are saved in `data/resource_samples/`; the manifest distinguishes sample assets from full archives that require product selection or authenticated access.
- [Download the sample bundle](data/terrarotate_global_resource_samples.zip) or inspect the [download manifest](data/resource_samples/download_manifest.json) and [24-resource download status](data/resource_samples/resource_download_status.csv).
- [Seven-slide challenge demo deck draft](demo/presentation/TerraRotate_AI_challenge_demo_v3.pptx). Replace the marked workflow panel with real app screenshots before competition submission.
- Transparent baseline rotation comparison with explanations and limitations.
- Experimental national crop-yield context model on `/model`, trained on FAOSTAT QCL yield history; evaluated on held-out years and kept separate from field-level rotation recommendations because it does not contain crop-sequence labels.
- Proposed crop-outcome modeling plan at `/model`; clearly labeled as research only, with no trained model, yield estimates, or predictive claims.
- Seven additional input-driven analysis tools at `/tools`: vegetation patterns, water-budget scenarios, possible low-vegetation windows, NASA POWER historical climate analogues, sample-point clustering, farmer feedback (browser-local by default, optional Supabase sync), and rotation ranking sensitivity.
- Successful NASA POWER/GIBS responses are cached in bounded in-memory TTL caches; cache entries are temporary and are not shared across separate server workers.
- Historical climate analogues use live NASA POWER monthly data at coordinates the user supplies. The request is limited to one field and five candidate points.
- Optional farmer-entered soil texture, pH and organic matter are carried as context, not scored.
- Soil is not inferred; demonstration coordinates are illustrative.

## Run locally

Backend (Python 3.10+):

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python run.py
```

Frontend (Node.js):

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`. Visit `/tools` for the analysis modules, `/sources` for data provenance and limits, and `/model` for the proposed rotation research plan. Vegetation and zone analysis require real, sourced numeric input; example schemas are not observations. NASA POWER and GIBS requests need network access; the app reports errors rather than substituting observations. Current public GIBS imagery views do not require Earthdata Login.

Run backend checks:

```powershell
cd backend
python -m unittest discover -s tests -v
```

Run frontend utility tests (Node.js built-in test runner):

```powershell
cd frontend
npm test
```

The experimental model artifact is included under `backend/app/data/`. To retrain it, download the official FAOSTAT QCL normalized ZIP into `data/faostat_qcl.zip`, install backend requirements, then run `python scripts/train_faostat_yield_model.py` from the repository root. The source archive is not committed. Training results and limitations are documented in `docs/model_evaluation.md`.

The farmer-feedback tool works in browser-local mode by default. To enable optional Supabase account sync, create `frontend/.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from your own project, apply `database/schema.sql`, restart Next.js, and use the sign-in controls on `/tools`. The schema uses row-level security; never put a Supabase service-role key in the browser. Supabase is not connected to a live project yet. Public hosting and competition submission are not configured.

Image descriptions on `/tools` support uploaded farm photos and NASA GIBS map images. To enable them, set `OPENAI_API_KEY` in the **backend service environment** (never as a `NEXT_PUBLIC_` variable); optionally set `OPENAI_VISION_MODEL` to a vision-capable model available to your account. The page sends an image only after the user presses “Describe image,” and shows a notice before upload. The selected NASA layer/date/location is retrieved from NASA GIBS first; the rendered map is described as regional visual context, not decoded into measurements.

## Documentation

Read `docs/implementation_status.md`, `docs/nasa_resource_allowlist.md`, `docs/data_sources.md`, `docs/data_provenance.md`, `docs/methodology.md`, `docs/model_evaluation.md`, `docs/submission_content.md`, and `docs/limitations.md`.

TerraRotate AI is an independent prototype. NASA does not endorse it or its recommendations.
