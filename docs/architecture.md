# Architecture

`frontend/` is a Next.js JavaScript application. It calls an independent Flask REST API in `backend/`. The NASA POWER adapter is separate from the deterministic rotation service. The browser does not contact the NASA API directly. Environment variables set API URL and CORS origins.

Current flow: farmer-selected coordinates and priorities → Flask `/api/climate` queries NASA POWER and returns provenance/quality metadata; Flask `/api/rotations` validates inputs and ranks three rule-based sequences; frontend presents observations, explanations, and data limits.

Supabase persistence/authentication and field boundary mapping are not wired into the running services yet. `database/schema.sql` prepares owner-scoped tables and row-level security for later integration. The public demo remains ephemeral and does not write private farmer data.
