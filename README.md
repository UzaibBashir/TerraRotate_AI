# TerraRotate AI

Explainable, farmer-led exploration of climate-aware crop-rotation options for NASA Space Apps Challenge 2026 — Field Shift.

## Working increment

- Next.js dashboard for coordinates, crop, water availability, and farmer priority.
- Flask API queries NASA POWER daily point data (`T2M`, `PRECTOTCORR`) with provenance and missingness.
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

Open `http://localhost:3000`. Climate retrieval needs network access to NASA POWER. The rotation API works independently, but the dashboard reports climate retrieval errors clearly.

## Documentation

Read `docs/implementation_status.md`, `docs/nasa_resource_allowlist.md`, `docs/data_sources.md`, `docs/data_provenance.md`, and `docs/limitations.md`.

TerraRotate AI is an independent prototype. NASA does not endorse it or its recommendations.
