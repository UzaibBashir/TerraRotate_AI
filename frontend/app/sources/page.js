"use client";
import {useEffect,useState} from "react";
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
const nasa=[
 ["SMAP","https://earthdata.nasa.gov/data/platforms/space-based-platforms/smap","Global; coarse pixels"],
 ["GPM / IMERG","https://gpm.nasa.gov/data","Near-global; product/data gaps"],
 ["Landsat","https://earthexplorer.usgs.gov/","Global land coverage"],
 ["MODIS","https://lpdaac.usgs.gov/products/","Global/near-global; product-specific"],
 ["VIIRS","https://search.earthdata.nasa.gov/search?q=VIIRS","Global/near-global; product-specific"],
 ["NASA POWER — climate and projection APIs","https://power.larc.nasa.gov/","Global; parameter-specific coverage"],
 ["SRTM","https://earthdata.nasa.gov/data/instruments/srtm","Near-global land; latitude limits"],
 ["ECOSTRESS","https://ecostress.jpl.nasa.gov/data","ISS swaths; intermittent coverage"],
 ["NLDAS / GLDAS","https://earthdata.nasa.gov/","GLDAS global; NLDAS North America"],
 ["GEDI","https://gedi.umd.edu/data","Sampled footprints; not wall-to-wall"],
];
const other=[
 ["USDA Ag Data Commons","https://www.nal.usda.gov/services/agdatacommons","Dataset-dependent; U.S. emphasis"],["USDA Web Soil Survey","https://websoilsurvey.nrcs.usda.gov/app/","United States only"],["USDA CropScape Cropland Data Layer","https://nassgeodata.gmu.edu/CropScape/","United States only"],["PRISM Climate Data","https://prism.oregonstate.edu/","United States only"],["SSURGO / STATSGO2","https://www.nrcs.usda.gov/resources/data-and-reports/soils","United States only"],["NAIP","https://naip-usdaonline.hub.arcgis.com/","United States only"],["USGS NLCD","https://www.usgs.gov/centers/eros/science/national-land-cover-database","United States only"],["FAO GAEZ","https://gaez.fao.org/","Global; generalized suitability"],["CoCoRaHS","https://www.cocorahs.org/Maps","United States / Canada"],["USGS NWIS","https://waterdata.usgs.gov/nwis","United States only"],["USDA AMS Market News","https://www.ams.usda.gov/market-news","United States markets"],["USDA NASS QuickStats","https://quickstats.nass.usda.gov/","United States only"],["OpenET","https://openetdata.org/","Western United States"],["USFS LANDFIRE","https://landfire.gov/","United States only"],
];
const esa=[["Copernicus Sentinel-2","https://dataspace.copernicus.eu/","Global land coverage"],["ERA5 ECMWF Reanalysis","https://cds.climate.copernicus.eu/datasets/reanalysis-era5-single-levels?tab=overview","Global climate reanalysis"]];
const globalResources=[
 ["SMAP","NASA","Near-global; coarse pixel","Connected as GIBS map only; no soil-moisture pixel is extracted."],
 ["GPM / IMERG","NASA","Near-global; product gaps","Connected as GIBS precipitation-rate map only."],
 ["MODIS / VIIRS","NASA mission/instrument data","Global/near-global land, product-specific","Connected as browse imagery; no image colors are decoded. Numeric vegetation inputs require user-supplied sourced values."],
 ["Landsat","NASA mission; USGS distribution","Global land coverage","Eligible input source family; no Landsat archive is downloaded by this prototype."],
 ["NASA POWER","NASA","Global, parameter-specific grids","Connected numeric daily and monthly APIs, including water-cycle context."],
 ["SRTM","NASA / USGS","Near-global land with latitude limits","Suitable terrain candidate; raster not downloaded or analyzed."],
 ["ECOSTRESS","NASA JPL","Swath coverage, not wall-to-wall","Candidate only; product/date/overpass selection needed."],
 ["GLDAS","NASA data system","Global; product-dependent","Candidate only; no gridded file connected."],
 ["GEDI","NASA mission","Sampled footprints to about 51.6°N/S","Context only in applicable footprints; no granule connected."],
 ["FAO GAEZ","FAO (non-NASA)","Global generalized suitability","Challenge-listed contextual candidate; not currently integrated."],
 ["Copernicus Sentinel-2","ESA partner","Global land coverage","Listed partner candidate; no scene connected."],
 ["ERA5","ECMWF / Copernicus partner listing","Global reanalysis","Listed partner candidate; no climate file connected."],
];
function LinkList({items}){return <ul>{items.map(([name,url,scope])=><li key={name}><a href={url} target="_blank" rel="noreferrer">{name}</a>{scope&&<span style={{color:"#617268",fontSize:13}}> — {scope}</span>}</li>)}</ul>}

export default function Sources(){
  const [samples,setSamples]=useState(null);
  useEffect(()=>{fetch(`${API}/resource-samples`).then(r=>r.ok?r.json():Promise.reject()).then(setSamples).catch(()=>setSamples({error:true}));},[]);
  return <main style={{maxWidth:980,margin:"48px auto",padding:24,fontFamily:"Arial,sans-serif",lineHeight:1.65,color:"#17261f"}}>
  <a href="/">← Back to field overview</a><p style={{color:"#52734f",fontWeight:700,letterSpacing:".12em",fontSize:12,marginTop:30}}>DATA TRANSPARENCY</p><h1>Sources and evidence limits</h1>
  <p>The official Field Shift Resources tab lists 24 resource cards: 22 under “NASA Data & Resources” and 2 ESA partner resources. These are optional resources, not 24 mandatory integrations. The provider is identified for every entry.</p>
  <section style={{background:"#f1f6ec",padding:20,borderRadius:12,margin:"22px 0"}}><h2 style={{marginTop:0}}>NASA data currently connected</h2>
    <p><b>NASA POWER daily APIs:</b> daily <code>T2M</code> / <code>PRECTOTCORR</code> climate context and daily <code>SFMC</code>, <code>RZMC</code>, <code>EVPTRNS</code> water-cycle parameters. Native grids vary by parameter; missing soil-moisture observations remain missing. Evaporation is shown as energy flux and is not converted to water depth.</p>
    <p><b>NASA POWER Monthly API:</b> historical monthly <code>T2M</code> and <code>PRECTOTCORR</code> for user-selected field and candidate coordinates, used for historical climate analogues. These are not future-climate predictions.</p>
    <p><b>NASA POWER Projection API:</b> a separately labeled 0.25° multi-model scenario panel for SSP1-2.6, SSP2-4.5, and SSP3-7.0. This panel is not used to score crops; the team should confirm this exact projection product is eligible under the challenge's listed POWER resource before final submission.</p>
    <p><b>NASA GIBS:</b> MODIS Terra/Aqua and Suomi NPP VIIRS true-color; Terra MODIS 8-day NDVI; GPM IMERG precipitation-rate; and SMAP L4 surface-soil-moisture visualizations for a selected region/date. These are rendered context maps, not numeric point observations or crop diagnoses.</p>
    <p><a href="https://power.larc.nasa.gov/docs/services/api/temporal/daily/" target="_blank" rel="noreferrer">NASA POWER daily API docs</a> · <a href="https://power.larc.nasa.gov/docs/services/api/temporal/monthly/" target="_blank" rel="noreferrer">NASA POWER monthly API docs</a> · <a href="https://power.larc.nasa.gov/docs/services/api/projection/" target="_blank" rel="noreferrer">NASA POWER projection API docs</a> · <a href="https://nasa-gibs.github.io/gibs-api-docs/access-basics/" target="_blank" rel="noreferrer">NASA GIBS API docs</a></p>
  </section>
  <section style={{background:"#f7f8f4",padding:20,borderRadius:12,margin:"22px 0"}}><h2 style={{marginTop:0}}>Downloadable sample files in this project</h2>
    <p>These are small, dated examples for inspection and prototyping. They are not complete archives and the sample imagery is for visual context, not field measurements.</p>
    {samples?.files?.length>0?<ul>{samples.files.map(file=><li key={file.name}><a href={`${API}${file.url}`}>{file.name}</a> <span style={{color:"#617268",fontSize:13}}>— {(file.bytes/1024).toFixed(0)} KB</span></li>)}</ul>:samples?.error?<p>The sample download service is unavailable. The files remain in <code>data/resource_samples/</code> in the project.</p>:<p>Loading project sample list…</p>}
    {samples?.retrieved_date&&<p style={{color:"#617268",fontSize:13}}>Retrieved {samples.retrieved_date}. Full dataset download and integration status is recorded in <code>data/resource_samples/resource_download_status.csv</code>.</p>}
  </section>
  <section><h2>How to read global coverage</h2><p><b>Global/near-global</b> means a resource may support a location-aware global product, subject to the selected product’s actual coverage, time range, resolution, access conditions, and gaps. It does not mean every place/date is covered or that a pixel measures a small field. Regional resources can still be enabled conditionally when a farmer’s location falls inside their coverage.</p></section>
  <section><h2>Global-project resource flags</h2><p>These challenge-listed resources can support the global scope under the coverage limits shown. “Candidate” means the project reviewed the resource but has not connected or downloaded its analysis-ready data.</p><div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:14}}><thead><tr>{["Resource","Provider","Global coverage","Project status"].map(h=><th key={h} style={{textAlign:"left",padding:10,borderBottom:"2px solid #dce5dc"}}>{h}</th>)}</tr></thead><tbody>{globalResources.map(([name,provider,coverage,status])=><tr key={name}>{[name,provider,coverage,status].map((value,i)=><td key={i} style={{padding:10,verticalAlign:"top",borderBottom:"1px solid #e4eae6",fontWeight:i===0?700:400}}>{value}</td>)}</tr>)}</tbody></table></div><p style={{fontSize:13,color:"#617268"}}>This product-specific flag does not guarantee data for every location/date or field-scale pixels. Region-specific challenge resources are listed below and should be enabled only inside their coverage.</p></section>
  <section><h2>NASA resources listed by the challenge</h2><p>NASA POWER supplies numeric climate and water-cycle parameters. NASA GIBS displays SMAP, GPM/IMERG, MODIS NDVI, MODIS, and VIIRS as rendered visualizations; it does not extract numeric values from those maps. The analysis tools accept numeric vegetation values only when the user supplies date, product, version and native resolution. Other globally relevant entries below are not currently connected. Public POWER and GIBS APIs shown here do not require Earthdata Login.</p><LinkList items={nasa}/></section>
  <section><h2>Other challenge resources</h2><p>These are non-NASA sources. Global resources can broaden the project; regional entries should be selected only when the field is within their coverage. Soil remains farmer-entered unless a clearly applicable, verified source is later added.</p><LinkList items={other}/></section>
  <section><h2>ESA partner resources</h2><p>These challenge-listed partner resources can support the global version where coverage and access allow. They are not currently connected and must be attributed as partner data, not NASA data.</p><LinkList items={esa}/></section>
  <section><h2>Farmer inputs and rotation comparisons</h2><p>Coordinates, crop, water availability, soil texture, pH, organic matter, water-plan scenarios, candidate climate locations, and priorities are user supplied. Soil values are context only. Rotation scores are transparent rules, not probabilities, yields, or measured soil effects. Open <a href="/tools">analysis tools</a> to review all module assumptions.</p><p>TerraRotate is an independent prototype; NASA does not endorse it.</p></section>
</main>}
