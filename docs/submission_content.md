# Challenge submission draft

## Project name

**TerraRotate AI**  
*Explainable climate-smart crop-rotation decision support*  
Team: al-Uzma (Learn · Teach · Build)

## Summary (draft; 132 words)

TerraRotate AI is a farmer-led prototype for exploring crop-rotation choices with climate and Earth-observation context. A user selects a location, current crop, water availability and priorities. NASA POWER supplies gridded daily climate and water-cycle context; NASA GIBS displays NASA MODIS, VIIRS, GPM IMERG and SMAP map layers. The app keeps browse images separate from numeric analysis and identifies missing observations instead of filling them in. Its analysis tools compare rotation options with visible rules, build a farmer-entered water budget, summarize sourced vegetation time series, flag possible low-vegetation windows, compare historical NASA POWER climate profiles, cluster supplied sample points, and update subjective farmer feedback. TerraRotate does not diagnose crop disease, predict yield, or claim field-level sensor precision. It gives farmers an inspectable starting point and highlights what needs local verification. The demonstration location is illustrative; agronomic validation and public deployment remain future team work.

## Project details

TerraRotate supports the Field Shift challenge by putting gridded NASA climate data and NASA Earth-observation visualizations beside farmer-entered context. The Flask API performs the calculations; the Next.js interface explains inputs, sources and limitations. A weighted rule baseline produces three rotation comparisons. Separate tools use numeric vegetation values only when the user supplies an eligible product, use explicit user assumptions for water budgets, compare NASA POWER historical monthly profiles at candidate coordinates, and cluster measured sample points without creating parcel boundaries. Farmer feedback uses a Beta prior/posterior update in the same browser. These methods are exploratory baselines, not validated agronomic predictions. The present implementation uses English and offers an illustrative Kashmir coordinate while permitting global location input. Its design can support future regional crop profiles, but the current crop catalog needs local review. Public availability, Supabase runtime, numeric satellite-granule ingestion and field-outcome validation are not complete.

## NASA resources used

- Soil Moisture Active Passive (SMAP): https://earthdata.nasa.gov/data/platforms/space-based-platforms/smap — NASA GIBS L4 browse imagery is used for visual context; no value is extracted from image colors.
- Global Precipitation Measurement (GPM) / IMERG: https://gpm.nasa.gov/data — NASA GIBS precipitation-rate browse imagery is used for visual context.
- MODIS: https://lpdaac.usgs.gov/products/ — NASA GIBS true-color and 8-day NDVI visualizations are displayed; no numeric value is extracted from these images.
- Visible Infrared Imaging Radiometer Suite (VIIRS): https://search.earthdata.nasa.gov/search?q=VIIRS — NASA GIBS true-color visualization is displayed as context.
- NASA POWER: https://power.larc.nasa.gov/ — daily climate and water variables plus monthly historical climate profiles are used by live APIs. The separate POWER Projection API is present as a clearly labeled scenario panel; the team should confirm this product is eligible under the challenge listing before retaining it in final submitted data declarations.

The sample bundle includes dated global NASA POWER and NASA GIBS sample files, which are also actual accessed resources. See `data/resource_samples/download_manifest.json` for request-level provenance.

## Partner resources and software

- ESA Copernicus Sentinel-2 is listed in the resource register and accepted as a provenance label for user-supplied vegetation observations, but no Sentinel-2 file is currently bundled or analyzed.
- Frontend: Next.js https://nextjs.org/; React https://react.dev/; Tailwind CSS https://tailwindcss.com/.
- Backend: Python https://www.python.org/; Flask https://flask.palletsprojects.com/; Flask-CORS https://flask-cors.readthedocs.io/; Requests https://requests.readthedocs.io/.
- NASA service documentation: POWER API https://power.larc.nasa.gov/docs/services/api/; GIBS API https://nasa-gibs.github.io/gibs-api-docs/.
- No project photographs, AI-generated images, or protected NASA logos are included.

## SI-use disclosure and originality

Codex assisted with repository review, research, code drafting, tests and documentation. The team should update this statement to disclose all tools and actual human contributions before submission. Code and text are original project work with AI assistance; NASA data and open-source packages retain their source licenses and attribution. No AI-generated visual assets are included.

## Team review before submission

Confirm the challenge's exact accepted resource listing for POWER Projection, verify all data/product versions and licenses, replace any incomplete candidate declarations, add the team’s actual public project and demo links, review originality and SI-use statements, and submit personally. This draft does not certify originality or submit on behalf of the team.
