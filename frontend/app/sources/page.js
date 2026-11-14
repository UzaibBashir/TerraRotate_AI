const nasa=[
 ["SMAP","https://earthdata.nasa.gov/data/platforms/space-based-platforms/smap"],
 ["GPM / IMERG","https://gpm.nasa.gov/data"],
 ["Landsat","https://earthexplorer.usgs.gov/"],
 ["MODIS","https://lpdaac.usgs.gov/products/"],
 ["VIIRS","https://search.earthdata.nasa.gov/search?q=VIIRS"],
 ["NASA POWER — live connector","https://power.larc.nasa.gov/"],
 ["SRTM","https://earthdata.nasa.gov/data/instruments/srtm"],
 ["ECOSTRESS","https://ecostress.jpl.nasa.gov/data"],
 ["NLDAS / GLDAS","https://earthdata.nasa.gov/"],
 ["GEDI","https://gedi.umd.edu/data"],
];
const other=[
 ["USDA Ag Data Commons","https://www.nal.usda.gov/services/agdatacommons"],
 ["USDA Web Soil Survey","https://websoilsurvey.nrcs.usda.gov/app/"],
 ["USDA CropScape Cropland Data Layer","https://nassgeodata.gmu.edu/CropScape/"],
 ["PRISM Climate Data","https://prism.oregonstate.edu/"],
 ["SSURGO / STATSGO2","https://www.nrcs.usda.gov/resources/data-and-reports/soils"],
 ["NAIP","https://naip-usdaonline.hub.arcgis.com/"],
 ["USGS NLCD","https://www.usgs.gov/centers/eros/science/national-land-cover-database"],
 ["FAO GAEZ","https://gaez.fao.org/"],
 ["CoCoRaHS","https://www.cocorahs.org/Maps"],
 ["USGS NWIS","https://waterdata.usgs.gov/nwis"],
 ["USDA AMS Market News","https://www.ams.usda.gov/market-news"],
 ["USDA NASS QuickStats","https://quickstats.nass.usda.gov/"],
 ["OpenET","https://openetdata.org/"],
 ["USFS LANDFIRE","https://landfire.gov/"],
];
const esa=[["Copernicus Sentinel-2","https://dataspace.copernicus.eu/"],["ERA5 ECMWF Reanalysis","https://cds.climate.copernicus.eu/datasets/reanalysis-era5-single-levels?tab=overview"]];
function LinkList({items}){return <ul>{items.map(([name,url])=><li key={name}><a href={url} target="_blank" rel="noreferrer">{name}</a></li>)}</ul>}
export default function Sources(){return <main style={{maxWidth:980,margin:"48px auto",padding:"24px",fontFamily:"Arial,sans-serif",lineHeight:1.65,color:"#17261f"}}><a href="/">← Back to field overview</a><p style={{color:"#52734f",fontWeight:700,letterSpacing:".12em",fontSize:12,marginTop:30}}>DATA TRANSPARENCY</p><h1 style={{marginBottom:8}}>Sources and evidence limits</h1><p>The official Field Shift Resources tab was reviewed. It lists 24 resource cards: 22 in the “NASA Data & Resources” section and 2 ESA partner resources. These are optional challenge resources, not 24 required integrations. Each is classified by its actual provider below.</p><section style={{background:"#f1f6ec",padding:20,borderRadius:12,margin:"22px 0"}}><h2 style={{marginTop:0}}>NASA POWER — currently connected</h2><p>The backend requests daily <code>T2M</code> air-temperature and <code>PRECTOTCORR</code> precipitation estimates at the user-entered coordinates. The values are gridded climate context, not measurements from inside an individual field. Missing data stays missing; there is no satellite-product fallback.</p><p><a href="https://power.larc.nasa.gov/" target="_blank" rel="noreferrer">NASA POWER</a> · <a href="https://power.larc.nasa.gov/api/pages/" target="_blank" rel="noreferrer">Official API documentation</a></p></section><section><h2>NASA resources listed by the challenge</h2><p>Only NASA POWER is integrated in the current prototype. The remaining listed resources are reviewed but not connected; product-specific coverage, scale, access, or field-level interpretation needs additional work.</p><LinkList items={nasa}/></section><section><h2>Other resources listed by the challenge</h2><p>These are not NASA datasets. Several cover only the United States or North America and are not used for the Kashmir demonstration. Soil values are entered by the farmer, not imported from these services.</p><LinkList items={other}/></section><section><h2>ESA partner resources</h2><p>These are listed partner resources and are not connected in the current prototype.</p><LinkList items={esa}/></section><section><h2>Farmer inputs and rotation comparisons</h2><p>Coordinates, crop, water availability, soil texture, pH, organic matter, and priorities are entered by the user. The soil values are preserved as user-provided context but not scored because locally verified crop suitability ranges are incomplete. The rotation score is a transparent rule-based comparison, not a yield prediction, probability, measured soil benefit, or validated agronomic rating.</p><p>See <a href="https://www.spaceappschallenge.org/2026/challenges/adapting-farms-with-nasa-data/?tab=resources" target="_blank" rel="noreferrer">the official challenge Resources tab</a> and project documentation for the complete provenance register. TerraRotate is an independent prototype; NASA does not endorse it.</p></section></main>}
