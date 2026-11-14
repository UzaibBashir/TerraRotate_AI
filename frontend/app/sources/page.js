const nasa=[
 ["SMAP","https://earthdata.nasa.gov/data/platforms/space-based-platforms/smap"],
 ["GPM / IMERG","https://gpm.nasa.gov/data"],
 ["Landsat","https://earthexplorer.usgs.gov/"],
 ["MODIS","https://lpdaac.usgs.gov/products/"],
 ["VIIRS","https://search.earthdata.nasa.gov/search?q=VIIRS"],
 ["NASA POWER — climate and projection APIs","https://power.larc.nasa.gov/"],
 ["SRTM","https://earthdata.nasa.gov/data/instruments/srtm"],
 ["ECOSTRESS","https://ecostress.jpl.nasa.gov/data"],
 ["NLDAS / GLDAS","https://earthdata.nasa.gov/"],
 ["GEDI","https://gedi.umd.edu/data"],
];
const other=[
 ["USDA Ag Data Commons","https://www.nal.usda.gov/services/agdatacommons"],["USDA Web Soil Survey","https://websoilsurvey.nrcs.usda.gov/app/"],["USDA CropScape Cropland Data Layer","https://nassgeodata.gmu.edu/CropScape/"],["PRISM Climate Data","https://prism.oregonstate.edu/"],["SSURGO / STATSGO2","https://www.nrcs.usda.gov/resources/data-and-reports/soils"],["NAIP","https://naip-usdaonline.hub.arcgis.com/"],["USGS NLCD","https://www.usgs.gov/centers/eros/science/national-land-cover-database"],["FAO GAEZ","https://gaez.fao.org/"],["CoCoRaHS","https://www.cocorahs.org/Maps"],["USGS NWIS","https://waterdata.usgs.gov/nwis"],["USDA AMS Market News","https://www.ams.usda.gov/market-news"],["USDA NASS QuickStats","https://quickstats.nass.usda.gov/"],["OpenET","https://openetdata.org/"],["USFS LANDFIRE","https://landfire.gov/"],
];
const esa=[["Copernicus Sentinel-2","https://dataspace.copernicus.eu/"],["ERA5 ECMWF Reanalysis","https://cds.climate.copernicus.eu/datasets/reanalysis-era5-single-levels?tab=overview"]];
function LinkList({items}){return <ul>{items.map(([name,url])=><li key={name}><a href={url} target="_blank" rel="noreferrer">{name}</a></li>)}</ul>}

export default function Sources(){return <main style={{maxWidth:980,margin:"48px auto",padding:24,fontFamily:"Arial,sans-serif",lineHeight:1.65,color:"#17261f"}}>
  <a href="/">← Back to field overview</a><p style={{color:"#52734f",fontWeight:700,letterSpacing:".12em",fontSize:12,marginTop:30}}>DATA TRANSPARENCY</p><h1>Sources and evidence limits</h1>
  <p>The official Field Shift Resources tab lists 24 resource cards: 22 under “NASA Data & Resources” and 2 ESA partner resources. These are optional resources, not 24 mandatory integrations. The provider is identified for every entry.</p>
  <section style={{background:"#f1f6ec",padding:20,borderRadius:12,margin:"22px 0"}}><h2 style={{marginTop:0}}>NASA data currently connected</h2>
    <p><b>NASA POWER Daily API:</b> daily <code>T2M</code> air temperature and <code>PRECTOTCORR</code> precipitation at the user-entered coordinates. These are gridded context, not measurements inside a field.</p>
    <p><b>NASA POWER Projection API:</b> monthly temperature and precipitation values from the multi-model ensemble for SSP1-2.6, SSP2-4.5, and SSP3-7.0. These are 0.25° climate scenarios, not field forecasts.</p>
    <p><b>NASA GIBS:</b> MODIS Terra/Aqua and Suomi NPP VIIRS true-color; GPM IMERG precipitation-rate; and SMAP L4 surface-soil-moisture visualizations for a selected region/date. These are rendered context maps, not numeric point observations, NDVI calculations, or crop diagnoses.</p>
    <p><a href="https://power.larc.nasa.gov/docs/services/api/temporal/daily/" target="_blank" rel="noreferrer">NASA POWER daily API docs</a> · <a href="https://power.larc.nasa.gov/docs/services/api/projection/" target="_blank" rel="noreferrer">NASA POWER projection API docs</a> · <a href="https://nasa-gibs.github.io/gibs-api-docs/access-basics/" target="_blank" rel="noreferrer">NASA GIBS API docs</a></p>
  </section>
  <section><h2>NASA resources listed by the challenge</h2><p>NASA POWER supplies the numeric daily climate observations. NASA GIBS currently displays listed SMAP, GPM/IMERG, MODIS, and VIIRS layers as rendered visualizations; it does not extract numeric values from these maps. Landsat, SRTM, ECOSTRESS, NLDAS/GLDAS, and GEDI are not connected. The current GIBS views are public and do not require Earthdata Login. User passwords or tokens must never be pasted into the app or chat.</p><LinkList items={nasa}/></section>
  <section><h2>Other challenge resources</h2><p>These are not NASA datasets. Many are limited to the United States or North America and are not used in the Kashmir demonstration. Soil remains farmer-entered.</p><LinkList items={other}/></section>
  <section><h2>ESA partner resources</h2><p>Listed partner resources; not currently connected.</p><LinkList items={esa}/></section>
  <section><h2>Farmer inputs and rotation comparisons</h2><p>Coordinates, crop, water availability, soil texture, pH, organic matter, and priorities are entered by the user. Soil values are preserved as farmer-provided context but not scored because locally verified crop suitability ranges are incomplete. Rotation scores are transparent rules, not probabilities, yields, or measured soil effects.</p><p>TerraRotate is an independent prototype; NASA does not endorse it.</p></section>
</main>}
