# Architecture

`frontend/` is a Next.js JavaScript application. It calls an independent Flask REST API in `backend/`. NASA POWER historical/projection adapters, a NASA GIBS imagery proxy, and the deterministic rotation service are separate. The browser does not call NASA data endpoints directly. Environment variables set API URL and CORS origins.

Current flow: farmer-selected coordinates and priorities → Flask `/api/climate` queries NASA POWER daily observations; `/api/climate/projection` fetches monthly ensemble climate scenarios; `/api/imagery` proxies MODIS/VIIRS corrected-reflectance browse images from NASA GIBS; `/api/rotations` validates inputs and ranks three rule-based sequences. Each response is attributed in the frontend.

Supabase persistence/authentication and field boundary mapping are not wired into the running services yet. `database/schema.sql` prepares owner-scoped tables and row-level security for later integration. The public demo remains ephemeral and does not write private farmer data.
