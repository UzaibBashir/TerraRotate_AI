# TerraRotate AI

Explainable, farmer-led exploration of climate-aware crop-rotation options for NASA Space Apps Challenge 2026 — Field Shift.

## Working increment

- Next.js dashboard for coordinates, crop, water availability, and farmer priority.
- Flask API queries NASA POWER daily point data (`T2M`, `PRECTOTCORR`) with provenance and missingness.
- NASA GIBS displays listed SMAP L4 soil-moisture and GPM IMERG precipitation maps, MODIS 8-day NDVI, and MODIS/VIIRS imagery as separate visual evidence. These images are not converted into numeric field readings.
- NASA POWER supplies the numeric daily temperature and precipitation context; its multi-model climate-scenario view is separate.
- Small, dated global NASA POWER and GIBS samples are saved in `data/resource_samples/`; the manifest distinguishes sample assets from full archives that require product selection or authenticated access.
- [Download the sample bundle](data/terrarotate_global_resource_samples.zip) or inspect the [download manifest](data/resource_samples/download_manifest.json) and [24-resource download status](data/resource_samples/resource_download_status.csv).
- Transparent baseline rotation comparison with explanations and limitations.
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

Open `http://localhost:3000`. NASA POWER and GIBS requests need network access; those panels report errors rather than substitute sample satellite observations. The current public GIBS imagery views do not require Earthdata Login.

## Documentation

Read `docs/implementation_status.md`, `docs/nasa_resource_allowlist.md`, `docs/data_sources.md`, `docs/data_provenance.md`, and `docs/limitations.md`.

TerraRotate AI is an independent prototype. NASA does not endorse it or its recommendations.
