# Three-minute demonstration script

## 0:00–0:25 — Challenge and scope

“TerraRotate helps farmers compare crop-rotation options while keeping NASA regional context, farmer inputs, and assumptions visible. The Kashmir coordinates shown are illustrative. This prototype does not diagnose disease or predict yield.”

## 0:25–0:55 — Field overview

Open the dashboard. Enter a location, current crop, water availability and priority; add soil only if the team has an actual farmer-entered example. Run the climate and rotation panels. Point out NASA POWER’s date range, missingness and regional-grid caveat, then compare the three rules-based rotation alternatives and their stated limitations.

## 0:55–1:20 — NASA observations

Choose one of the available NASA GIBS layers (MODIS, VIIRS, MODIS NDVI, IMERG or SMAP) and load an available date. State that this is a rendered browse map, not a numeric pixel readout. If the scenario panel is shown, explain that it is an ensemble scenario context and not a field forecast; confirm eligibility of this exact product before final submission.

## 1:20–2:30 — Analysis tools

Open `/tools`. Demonstrate the water budget using team-approved, explicitly labeled planning assumptions and point out the NASA POWER water-cycle context. Open historical climate analogues and compare the field with one or two candidate coordinates using NASA POWER monthly history. Show RotationRisk’s sensitivity result and its “insufficient evidence” confidence message. If numeric vegetation input is available, enter it only with product, version, dates and native resolution; otherwise explain the working interface without inserting placeholder observations. Briefly show possible bare-window labels, point-zone clustering and browser-local farmer feedback.

## 2:30–3:00 — Responsible use

“These scores are transparent comparisons, not measured agronomic outcomes. Soil and planning assumptions come from the farmer; vegetation inputs need sourced values. NASA maps are regional context. Supabase, public hosting, numeric satellite granule ingestion and local agronomic validation remain team follow-up.”

## Before recording

Start the Flask API and Next.js frontend using the README instructions. Check outbound NASA API availability. Use only real team-approved inputs; label illustrative assumptions verbally and on screen. Do not show an unconfigured Supabase UI as if persistent farmer memory were connected. Capture screenshots from the running application for the final competition deck; the current source project has not yet passed a Next.js production build on this Windows host.
