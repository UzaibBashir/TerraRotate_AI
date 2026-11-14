# TerraRotate AI

Explainable, farmer-led exploration of climate-aware crop-rotation options for NASA Space Apps Challenge 2026 — Field Shift.

## Working increment

- Next.js dashboard for coordinates, crop, water availability, and farmer priority.
- Flask API queries NASA POWER daily point data (`T2M`, `PRECTOTCORR`) with provenance and missingness.
- NASA GIBS displays listed SMAP L4 soil-moisture and GPM IMERG precipitation maps, MODIS 8-day NDVI, and MODIS/VIIRS imagery as separate visual evidence. These images are not converted into numeric field readings.
- NASA POWER supplies the numeric daily temperature and precipitation context; its multi-model climate-scenario view is separate.
- Small, dated global NASA POWER and GIBS samples are saved in `data/resource_samples/`; the manifest distinguishes sample assets from full archives that require product selection or authenticated access.
- [Download the sample bundle](data/terrarotate_global_resource_samples.zip) or inspect the [download manifest](data/resource_samples/download_manifest.json) and [24-resource download status](data/resource_samples/resource_download_status.csv).
- [Seven-slide challenge demo deck draft](demo/presentation/TerraRotate_AI_challenge_demo_v3.pptx). Replace the marked workflow panel with real app screenshots before competition submission.
- Transparent baseline rotation comparison with explanations and limitations.
- Seven additional input-driven analysis tools at `/tools`: vegetation patterns, water-budget scenarios, possible low-vegetation windows, NASA POWER historical climate analogues, sample-point clustering, browser-local farmer feedback, and rotation ranking sensitivity.
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

Open `http://localhost:3000`. Visit `http://localhost:3000/tools` for the analysis modules. Vegetation and zone analysis require real, sourced numeric input; example schemas are not observations. NASA POWER and GIBS requests need network access; the app reports errors rather than substituting observations. Current public GIBS imagery views do not require Earthdata Login.

Run backend checks:

```powershell
cd backend
python -m unittest discover -s tests -v
```

The farmer-feedback tool works in browser-local mode by default. To enable optional Supabase account sync, create `frontend/.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from your own project, apply `database/schema.sql`, restart Next.js, and use the sign-in controls on `/tools`. The schema uses row-level security; never put a Supabase service-role key in the browser. Supabase is not connected to a live project yet. Public hosting and competition submission are not configured.

## Documentation

Read `docs/implementation_status.md`, `docs/nasa_resource_allowlist.md`, `docs/data_sources.md`, `docs/data_provenance.md`, `docs/methodology.md`, `docs/model_evaluation.md`, `docs/submission_content.md`, and `docs/limitations.md`.

TerraRotate AI is an independent prototype. NASA does not endorse it or its recommendations.
