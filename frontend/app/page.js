"use client";
import { useEffect, useRef, useState } from "react";
import { getMapBounds, parseBoundaryGeoJSON, projectCoordinate } from "./field-utils.mjs";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
const CROPS = [["potato","Potato"],["rice","Rice"],["maize","Maize"],["wheat","Wheat"],["mustard","Mustard"],["pea","Field pea"]];
const DEMO_FIELDS = [
  {id:"demo-kashmir",name:"Demo field · Kashmir",latitude:33.7311,longitude:75.1480,current_crop:"potato",water_availability:"moderate",priority:"balanced",soil_texture:"Loam",soil_ph:"6.4",organic_matter:"1.8",boundary_geojson:{type:"Polygon",coordinates:[[[75.142,33.728],[75.154,33.728],[75.154,33.734],[75.142,33.734],[75.142,33.728]]]}},
  {id:"demo-punjab",name:"Demo field · Punjab",latitude:30.9010,longitude:75.8573,current_crop:"wheat",water_availability:"limited",priority:"water",soil_texture:"Sandy loam",soil_ph:"7.2",organic_matter:"0.8",boundary_geojson:{type:"Polygon",coordinates:[[[75.851,30.898],[75.863,30.898],[75.863,30.904],[75.851,30.904],[75.851,30.898]]]}},
  {id:"demo-karnataka",name:"Demo field · Karnataka",latitude:15.3173,longitude:75.7139,current_crop:"maize",water_availability:"moderate",priority:"soil",soil_texture:"Clay loam",soil_ph:"6.8",organic_matter:"1.2",boundary_geojson:{type:"Polygon",coordinates:[[[75.7079,15.3143],[75.7199,15.3143],[75.7199,15.3203],[75.7079,15.3203],[75.7079,15.3143]]]}}
].map(field=>({...field,area_hectares:parseBoundaryGeoJSON(JSON.stringify(field.boundary_geojson)).areaHectares}));
const DEFAULT_DEMO = DEMO_FIELDS[0];

function coordinatesFromGoogleMaps(value) {
  const text=value.trim();
  const matches=[
    text.match(/@\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/),
    text.match(/!3d\s*(-?\d+(?:\.\d+)?)!4d\s*(-?\d+(?:\.\d+)?)/),
    text.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/)
  ];
  let found=matches.find(Boolean);
  if(!found){try{const url=new URL(text);const query=url.searchParams.get("q")||url.searchParams.get("query");if(query)found=query.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);}catch{}}
  if(!found)return null;
  const latitude=Number(found[1]),longitude=Number(found[2]);
  return Number.isFinite(latitude)&&Math.abs(latitude)<=90&&Number.isFinite(longitude)&&Math.abs(longitude)<=180?{latitude,longitude}:null;
}

async function readJson(response, fallback) {
  const value = await response.json();
  if (!response.ok) throw new Error(value.error || fallback);
  return value;
}

export default function Home() {
  const [lat,setLat]=useState("33.7311"), [lon,setLon]=useState("75.1480");
  const [fieldName,setFieldName]=useState(DEFAULT_DEMO.name), [fieldArea,setFieldArea]=useState(DEFAULT_DEMO.area_hectares.toFixed(3));
  const [boundaryText,setBoundaryText]=useState(()=>JSON.stringify(DEFAULT_DEMO.boundary_geojson,null,2)), [boundary,setBoundary]=useState(()=>({rings:DEFAULT_DEMO.boundary_geojson.coordinates,area:DEFAULT_DEMO.area_hectares})), [boundaryError,setBoundaryError]=useState("");
  const [boundaryMethod,setBoundaryMethod]=useState("geojson"), [googleMapSearch,setGoogleMapSearch]=useState(""), [googleMapInput,setGoogleMapInput]=useState("");
  const boundaryFileRef=useRef(null);
  const [savedFields,setSavedFields]=useState([]), [fieldMessage,setFieldMessage]=useState("");
  const [crop,setCrop]=useState(DEFAULT_DEMO.current_crop), [water,setWater]=useState(DEFAULT_DEMO.water_availability), [priority,setPriority]=useState(DEFAULT_DEMO.priority);
  const [soilTexture,setSoilTexture]=useState(DEFAULT_DEMO.soil_texture), [soilPh,setSoilPh]=useState(DEFAULT_DEMO.soil_ph), [organicMatter,setOrganicMatter]=useState(DEFAULT_DEMO.organic_matter);
  const [climate,setClimate]=useState(null), [result,setResult]=useState(null), [busy,setBusy]=useState(false);
  const [error,setError]=useState(""), [climateError,setClimateError]=useState("");
  const [layer,setLayer]=useState("modis_terra"), [imageDate,setImageDate]=useState(new Date(Date.now()-3*86400000).toISOString().slice(0,10)), [zoom,setZoom]=useState(1);
  const [imageUrl,setImageUrl]=useState(""), [imageError,setImageError]=useState("");
  const [imageryBusy,setImageryBusy]=useState(false);
  const [legendUrl,setLegendUrl]=useState(""), [legendError,setLegendError]=useState(false);
  const [projection,setProjection]=useState(null), [projectionError,setProjectionError]=useState(""), [projectionBusy,setProjectionBusy]=useState(false);

  useEffect(()=>{try{setSavedFields(JSON.parse(localStorage.getItem("terrarotate_fields")||"[]"));}catch{setSavedFields([]);}},[]);
  useEffect(()=>{loadImagery();},[]);

  const centerLat=Number(lat), centerLon=Number(lon);
  const bounds=Number.isFinite(centerLat)&&Number.isFinite(centerLon)?getMapBounds(centerLat,centerLon,zoom):getMapBounds(0,0,zoom);

  function selectMapPoint(event){
    if(!imageUrl)return;
    const box=event.currentTarget.getBoundingClientRect(), x=(event.clientX-box.left)/box.width, y=(event.clientY-box.top)/box.height;
    const nextLon=bounds.west+x*(bounds.east-bounds.west), nextLat=bounds.north-y*(bounds.north-bounds.south);
    setImageError("");
    setImageryBusy(true);
    setLat(nextLat.toFixed(5));setLon(nextLon.toFixed(5));setClimate(null);setResult(null);setProjection(null);
    setImageError("");setImageryBusy(true);
    setImageUrl(`${API}/imagery?lat=${encodeURIComponent(nextLat)}&lon=${encodeURIComponent(nextLon)}&layer=${encodeURIComponent(layer)}&date=${encodeURIComponent(imageDate)}&zoom=${zoom}`);
  }
  function updateCoordinate(axis,value){
    axis==="lat"?setLat(value):setLon(value);setImageUrl("");setClimate(null);setResult(null);setProjection(null);
  }
  function useGoogleMapsLocation(){
    const point=coordinatesFromGoogleMaps(googleMapInput);
    if(!point){setBoundaryError("Could not find coordinates. Paste a pair like 33.7311, 75.1480 or a Google Maps link that contains coordinates.");return;}
    setLat(String(point.latitude));setLon(String(point.longitude));setBoundary(null);setBoundaryText("");setFieldArea("");setBoundaryError("");setImageUrl("");setClimate(null);setResult(null);setProjection(null);
    setFieldMessage("Google Maps location added. Add the field area or its GeoJSON boundary if you have it.");
  }
  function moveMapPoint(event){
    const step=event.shiftKey ? .1 : .01;
    if(!["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(event.key))return;
    event.preventDefault();const nextLat=Math.max(-90,Math.min(90,centerLat+(event.key==="ArrowUp"?step:event.key==="ArrowDown"?-step:0)));
    const nextLon=Math.max(-180,Math.min(180,centerLon+(event.key==="ArrowRight"?step:event.key==="ArrowLeft"?-step:0)));
    setLat(nextLat.toFixed(5));setLon(nextLon.toFixed(5));setClimate(null);setResult(null);
    setImageUrl(`${API}/imagery?lat=${encodeURIComponent(nextLat)}&lon=${encodeURIComponent(nextLon)}&layer=${encodeURIComponent(layer)}&date=${encodeURIComponent(imageDate)}&zoom=${zoom}`);
  }

  function parseBoundary(){
    setBoundaryError("");
    try{
      const polygon=parseBoundaryGeoJSON(boundaryText);
      setBoundary({rings:polygon.rings,area:polygon.areaHectares});setFieldArea(polygon.areaHectares.toFixed(3));setFieldMessage("Boundary loaded. Area is an approximate geodesic calculation from your supplied polygon.");
    }catch(e){setBoundary(null);setBoundaryError(e.message||"Boundary GeoJSON is invalid.");}
  }

  async function importBoundaryFile(event){
    const file=event.target.files?.[0];if(!file)return;
    setBoundaryError("");
    try{const text=await file.text();const polygon=parseBoundaryGeoJSON(text);setBoundaryText(text);setBoundary({rings:polygon.rings,area:polygon.areaHectares});setFieldArea(polygon.areaHectares.toFixed(3));setFieldMessage(`Boundary added from ${file.name}. Estimated area: ${polygon.areaHectares.toFixed(3)} hectares.`);}
    catch(e){setBoundary(null);setBoundaryError(`${file.name}: ${e.message||"Could not read this boundary."}`);}
    event.target.value="";
  }

  function saveField(){
    const latitude=Number(lat),longitude=Number(lon),area=fieldArea===""?null:Number(fieldArea);
    if(!fieldName.trim()||!Number.isFinite(latitude)||latitude < -90||latitude>90||!Number.isFinite(longitude)||longitude < -180||longitude>180||(area!==null&&(!Number.isFinite(area)||area<=0))){setFieldMessage("Enter a field name, valid coordinates, and a positive area if provided.");return;}
    const field={id:crypto.randomUUID(),name:fieldName.trim(),latitude,longitude,area_hectares:area,boundary_geojson:boundary?{type:"Polygon",coordinates:boundary.rings}:null,current_crop:crop,water_availability:water,priority,soil_texture:soilTexture,soil_ph:soilPh,organic_matter:organicMatter,saved_at:new Date().toISOString()};
    const next=[field,...savedFields.filter(item=>item.name!==field.name)].slice(0,20);setSavedFields(next);localStorage.setItem("terrarotate_fields",JSON.stringify(next));setFieldMessage("Field saved on this device only. It has not been uploaded to a server.");
  }

  function loadSavedField(id){
    const field=[...DEMO_FIELDS,...savedFields].find(item=>item.id===id);if(!field)return;
    setFieldName(field.name);setLat(String(field.latitude));setLon(String(field.longitude));setFieldArea(field.area_hectares==null?"":String(field.area_hectares));
    if(field.boundary_geojson){const polygon=parseBoundaryGeoJSON(JSON.stringify(field.boundary_geojson));setBoundary({rings:polygon.rings,area:polygon.areaHectares});setBoundaryText(JSON.stringify(field.boundary_geojson,null,2));}else{setBoundary(null);setBoundaryText("");}
    setCrop(field.current_crop||DEFAULT_DEMO.current_crop);setWater(field.water_availability||DEFAULT_DEMO.water_availability);setPriority(field.priority||DEFAULT_DEMO.priority);
    setSoilTexture(field.soil_texture||"");setSoilPh(field.soil_ph||"");setOrganicMatter(field.organic_matter||"");
    setBoundaryError("");setGoogleMapInput("");setClimate(null);setResult(null);setProjection(null);setImageUrl("");
    setFieldMessage(field.id.startsWith("demo-")?"Illustrative demo loaded with location, outline, crop, water and soil details. These example values are not farm records.":"Saved field and details loaded from this device.");
  }

  async function analyze() {
    setBusy(true); setError(""); setClimateError(""); setClimate(null); setResult(null);
    const climateRequest=fetch(`${API}/climate?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`).then(r=>readJson(r,"NASA climate data unavailable"));
    const soil={texture:soilTexture,ph:soilPh,organic_matter_percent:organicMatter};
    const rotationRequest=fetch(`${API}/rotations`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({current_crop:crop,water_availability:water,priority,soil})}).then(r=>readJson(r,"Could not compare rotations"));
    const [c,r]=await Promise.allSettled([climateRequest,rotationRequest]);
    if(c.status==="fulfilled") setClimate(c.value); else setClimateError(c.reason.message);
    if(r.status==="fulfilled") setResult(r.value); else setError(r.reason.message);
    setBusy(false);
  }

  function loadImagery() {
    setImageError("");setImageryBusy(true);
    setImageUrl(`${API}/imagery?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&layer=${encodeURIComponent(layer)}&date=${encodeURIComponent(imageDate)}&zoom=${zoom}`);
    setLegendError(false);setLegendUrl(`${API}/imagery/legend?layer=${encodeURIComponent(layer)}`);
  }

  async function loadProjection() {
    setProjectionBusy(true); setProjectionError(""); setProjection(null);
    try {
      const data=await readJson(await fetch(`${API}/climate/projection?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&start_year=2041&end_year=2060`),"Projection data unavailable");
      setProjection(data);
    } catch(e) { setProjectionError(e.message); }
    finally { setProjectionBusy(false); }
  }

  const rows=climate?.rows||[];
  const temps=rows.map(x=>x.temperature_c).filter(x=>x!==null);
  const rain=rows.map(x=>x.precipitation_mm_day).filter(x=>x!==null);
  const avg=temps.length?(temps.reduce((a,b)=>a+b,0)/temps.length).toFixed(1):"—";
  const precip=rain.length?rain.reduce((a,b)=>a+b,0).toFixed(1):"—";
  const scenarios=(projection?.scenarios||[]).map(name=>{
    const t=(projection.rows||[]).filter(x=>x.scenario===name&&x.parameter==="T2M").map(x=>x.value).filter(Number.isFinite);
    const p=(projection.rows||[]).filter(x=>x.scenario===name&&x.parameter==="PRECTOTCORR").map(x=>x.value).filter(Number.isFinite);
    return {name,temperature:t.length?(t.reduce((a,b)=>a+b,0)/t.length).toFixed(1):"—",precipitation:p.length?(p.reduce((a,b)=>a+b,0)/p.length).toFixed(2):"—"};
  });

  return <main className="shell">
    <header className="topbar"><a className="brand" href="/">◒ TERRAROTATE <span style={{fontWeight:400}}>AI</span></a><nav className="nav"><span>Field overview</span><a href="/tools">Analysis tools</a><a href="/sources">Data sources</a></nav><div style={{fontSize:12,color:"#66756e"}}>GLOBAL DEMO · KASHMIR EXAMPLE</div></header>
    <section className="hero"><div><div className="eyebrow">FIELD SHIFT · FARM ADAPTATION</div><h1>Plan the next season<br/>with the evidence in view.</h1><p>Explore NASA climate and Earth imagery alongside field details and farmer priorities. Every comparison shows its reasoning and information gaps.</p></div><div className="hero-badge">Decision support · farmer-led</div></section>
    <section className="content">
      <article className="card field-card">
        <div className="row field-head"><div><h2>Field registration · local demo</h2><p className="sub">A complete example is loaded by default. Choose a sample below to fill in its location, boundary, crop, water and soil details, then select <b>Analyze field</b>. Demo values are illustrative; fields you save stay in this browser.</p></div><div className="field saved-field"><label htmlFor="saved-field">Sample and saved fields</label><select id="saved-field" value="" onChange={e=>loadSavedField(e.target.value)}><option value="">Choose a field</option><optgroup label="Demo fields">{DEMO_FIELDS.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</optgroup>{savedFields.length>0&&<optgroup label="Saved on this device">{savedFields.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</optgroup>}</select></div></div>
        <div className="row"><div className="field"><label htmlFor="field-name">Field name</label><input id="field-name" value={fieldName} onChange={e=>setFieldName(e.target.value)} maxLength={120}/></div><div className="field"><label htmlFor="field-area">Field area (hectares)</label><input id="field-area" type="number" min="0.001" step="any" value={fieldArea} onChange={e=>setFieldArea(e.target.value)} placeholder="Optional; or calculate from boundary"/></div></div>
        <div className="row"><div className="field boundary-entry"><label>Choose how to add your field <span className="optional">· optional</span></label><div className="boundary-tabs" role="tablist" aria-label="Field boundary method"><button type="button" role="tab" aria-selected={boundaryMethod==="geojson"} className={boundaryMethod==="geojson"?"active":""} onClick={()=>setBoundaryMethod("geojson")}>GeoJSON</button><button type="button" role="tab" aria-selected={boundaryMethod==="google"} className={boundaryMethod==="google"?"active":""} onClick={()=>setBoundaryMethod("google")}>Google Maps</button></div>
          {boundaryMethod==="geojson"?<><p className="sub">Upload a field outline file, or open the paste option below. We’ll show the outline and estimate its area.</p><input ref={boundaryFileRef} className="visually-hidden" type="file" accept=".json,.geojson,application/geo+json,application/json" onChange={importBoundaryFile} aria-label="Choose a GeoJSON boundary file"/><button className="btn" type="button" onClick={()=>boundaryFileRef.current?.click()}>Choose GeoJSON file</button><span className="file-hint">.geojson or .json</span><details className="boundary-advanced"><summary>Or copy and paste GeoJSON</summary><p className="sub">Paste a GeoJSON Polygon or Feature. Coordinates use longitude, latitude order.</p><textarea id="boundary-geojson" className="json-input boundary-input" value={boundaryText} onChange={e=>setBoundaryText(e.target.value)} placeholder='{"type":"Polygon","coordinates":[[[75.10,33.70],[75.12,33.70],[75.12,33.72],[75.10,33.72],[75.10,33.70]]]}' spellCheck="false"/><button className="btn secondary" type="button" onClick={parseBoundary}>Check pasted boundary</button></details></>:<><p className="sub">Open Google Maps, find or drop a pin on your field, then copy the coordinates and paste them here.</p><div className="google-search"><label htmlFor="google-map-search">Search for your field or nearby place</label><input id="google-map-search" value={googleMapSearch} onChange={e=>setGoogleMapSearch(e.target.value)} placeholder="Village, address, or place name"/><a className="btn google-link" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(googleMapSearch||`${lat},${lon}`)}`} target="_blank" rel="noopener noreferrer">Open Google Maps ↗</a><label htmlFor="google-map-coordinates">Paste coordinates or a Google Maps link</label><input id="google-map-coordinates" value={googleMapInput} onChange={e=>setGoogleMapInput(e.target.value)} placeholder="e.g. 33.7311, 75.1480"/><button className="btn" type="button" onClick={useGoogleMapsLocation}>Use this field location</button></div><p className="sub google-help">On a computer, right-click the field and select the coordinates. On a phone, press and hold the field on the map to drop a pin, then copy its coordinates.</p></>}
          {boundary&&<div className="boundary-success" role="status"><b>Boundary added</b><span>Estimated size: {boundary.area.toFixed(3)} hectares</span></div>}{boundaryError&&<div className="error" role="alert">{boundaryError}</div>}</div><div className="field map-field"><label>Interactive NASA map · select point</label><p className="sub">Choose a NASA layer and date, then load the map. Click to choose a location; arrow keys move the point, and Shift moves in larger steps. Zoom and layer imagery are visual context only.</p>
          <div className="row"><div className="field"><label htmlFor="map-layer">NASA data layer</label><select id="map-layer" value={layer} onChange={e=>{setLayer(e.target.value);setImageUrl("");setLegendUrl("");}}><optgroup label="Vegetation index browse layers"><option value="modis_ndvi">Terra MODIS · 8-day NDVI</option><option value="viirs_ndvi">Suomi NPP VIIRS · 8-day NDVI</option></optgroup><optgroup label="Other NASA browse layers"><option value="modis_terra">Terra MODIS · true color</option><option value="modis_aqua">Aqua MODIS · true color</option><option value="viirs_snpp">Suomi NPP VIIRS · true color</option><option value="imerg_precipitation">GPM IMERG · precipitation rate</option><option value="smap_surface_moisture">SMAP L4 · surface soil moisture</option></optgroup></select></div><div className="field"><label htmlFor="map-date">Observation/composite date</label><input id="map-date" type="date" value={imageDate} max={new Date().toISOString().slice(0,10)} onChange={e=>{setImageDate(e.target.value);setImageUrl("");}}/><span className="status">VIIRS NDVI is an 8-day composite; date availability varies.</span></div></div>
          <div className="row"><div className="field"><label htmlFor="map-zoom">Map zoom · 1× to 4×</label><select id="map-zoom" value={zoom} onChange={e=>{setZoom(Number(e.target.value));setImageUrl("");}}><option value={1}>1× regional</option><option value={2}>2×</option><option value={3}>3×</option><option value={4}>4× local view</option></select></div><div className="field"><label>&nbsp;</label><button className="btn" onClick={loadImagery}>Load NASA imagery</button></div></div>
          {imageError&&<div className="error" role="alert">{imageError}</div>}
          <div className="map-frame" role="button" tabIndex={0} aria-label="NASA imagery map. Click or use arrow keys to choose a location." onClick={selectMapPoint} onKeyDown={moveMapPoint}>
          {imageUrl?<img src={imageUrl} alt="NASA GIBS imagery for the selected location" onLoad={()=>setImageryBusy(false)} onError={()=>{setImageryBusy(false);setImageError("NASA GIBS has no image for this layer and date. Choose another date.");setImageUrl("");}}/>:<div className="map-empty">{imageError|| (imageryBusy?"Loading NASA GIBS imagery…":"Load NASA imagery above to enable point selection.")}</div>}
          <svg className="map-overlay" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">{boundary?.rings?.length>0&&<path d={boundary.rings.map(ring=>`M ${ring.map(point=>projectCoordinate(point,bounds)).join(" L ")} Z`).join(" ")} fill="#d6ef8344" fillRule="evenodd" stroke="#e9ffab" strokeWidth="0.45"/>}<circle cx={((centerLon-bounds.west)/(bounds.east-bounds.west)*100)} cy={((bounds.north-centerLat)/(bounds.north-bounds.south)*100)} r="1.35" fill="#f5cf4a" stroke="#17261f" strokeWidth=".5"/></svg>
          <span className="map-attribution">NASA GIBS · {bounds.south.toFixed(2)} to {bounds.north.toFixed(2)}° lat</span>
        </div>{legendUrl&&<div className="map-legend"><b>NASA product legend</b>{!legendError?<img src={legendUrl} alt={`${layer} official NASA GIBS layer legend`} onError={()=>setLegendError(true)}/>:<span>GIBS did not return a separate legend for this layer. Color is product-specific; do not read it as a field measurement.</span>}</div>}<p className="status">Selected point: {Number.isFinite(centerLat)?centerLat.toFixed(5):"—"}, {Number.isFinite(centerLon)?centerLon.toFixed(5):"—"} · illustrative until you register a real field.</p></div></div>
        <div className="row"><button className="btn" onClick={saveField}>Save field on this device</button><button className="btn secondary print-button" onClick={()=>window.print()}>Print field report</button></div>{fieldMessage&&<div className="banner" role="status">{fieldMessage}</div>}
      </article>
      <section className="print-report" aria-label="Printable field report"><h2>TerraRotate AI · Field report</h2><p><b>{fieldName||"Unnamed field"}</b> · {fieldArea?`${fieldArea} hectares`:"area not supplied"} · {lat}, {lon}</p><p>NASA POWER period: {climate?.period?.start||"not analyzed"} to {climate?.period?.end||"not analyzed"}. Data status: {climate?`${climate.quality.days_with_any_value} days with values`:"no climate observations loaded"}.</p><p>Field boundary: {boundary?"GeoJSON polygon; approximate area displayed":"not supplied"}. Rotation recommendations: {result?.recommendations?.map(r=>r.sequence.join(" → ")).join("; ")||"not generated"}.</p><p>Interpretation: decision-support summary only; verify inputs and recommendations with local agricultural expertise.</p></section>
      <div className="grid">
        <article className="card">
          <h2>Field conditions</h2><p className="sub">Enter a point anywhere in the world. Demonstration coordinates are illustrative and do not represent a verified farm.</p>
        <div className="row"><div className="field"><label>Latitude</label><input value={lat} onChange={e=>updateCoordinate("lat",e.target.value)} type="number" step="any"/></div><div className="field"><label>Longitude</label><input value={lon} onChange={e=>updateCoordinate("lon",e.target.value)} type="number" step="any"/></div></div>
          <div className="row"><div className="field"><label>Current crop</label><select value={crop} onChange={e=>setCrop(e.target.value)}>{CROPS.map(([v,n])=><option value={v} key={v}>{n}</option>)}</select></div><div className="field"><label>Water availability</label><select value={water} onChange={e=>setWater(e.target.value)}><option value="limited">Limited</option><option value="moderate">Moderate</option><option value="abundant">Abundant</option></select></div></div>
          <div className="field" style={{maxWidth:360,marginBottom:18}}><label>Your main priority</label><select value={priority} onChange={e=>setPriority(e.target.value)}><option value="balanced">Balanced</option><option value="water">Conserve water</option><option value="soil">Support soil function</option><option value="diversity">Increase crop diversity</option></select></div>
          <h3 style={{fontSize:13}}>Soil details (optional, farmer entered)</h3><p className="sub">Included as context; not scored until locally suitable crop ranges are verified.</p>
          <div className="row"><div className="field"><label>Soil texture</label><select value={soilTexture} onChange={e=>setSoilTexture(e.target.value)}><option value="">Not provided</option><option>Sand</option><option>Sandy loam</option><option>Loam</option><option>Clay loam</option><option>Clay</option></select></div><div className="field"><label>Soil pH</label><input type="number" min="0" max="14" step="0.1" value={soilPh} onChange={e=>setSoilPh(e.target.value)}/></div></div>
          <div className="field" style={{maxWidth:220,marginBottom:18}}><label>Organic matter (%)</label><input type="number" min="0" max="100" step="0.1" value={organicMatter} onChange={e=>setOrganicMatter(e.target.value)}/></div>
          <button className="btn" disabled={busy} onClick={analyze}>{busy?"Loading field evidence…":"Analyze field"}</button>
          {error&&<div className="error">{error}</div>}{climateError&&<div className="error">{climateError}. No substitute or sample observations were used.</div>}
          {climate&&<><div className="banner">NASA POWER · Daily point data · {climate.period.start} to {climate.period.end}. Gridded regional context, not a field sensor reading.</div><div className="stats"><div className="stat"><b>{avg}°C</b><span>Mean air temperature</span></div><div className="stat"><b>{precip} mm</b><span>Accumulated precipitation</span></div><div className="stat"><b>{climate.quality.days_with_any_value}/{climate.quality.expected_days}</b><span>Days with observations</span></div></div></>}
        </article>
        <article className="card"><h2>Rotation comparison</h2><p className="sub">Three options ranked with crop-family diversity, broad water classes, a legume proxy, and your priority.</p>
          {!result&&<div className="banner">Enter field context and select <b>Analyze field</b> to compare rotations.</div>}
          {result&&<><div className="banner">Rule baseline · normalized comparison scores, not probabilities, yields, or validated agronomic ratings.</div>{Object.keys(result.soil_inputs||{}).length>0&&<div className="banner">Farmer-entered soil context: {Object.entries(result.soil_inputs).map(([k,v])=>`${k.replaceAll("_"," ")}: ${v}`).join(" · ")}. Not scored.</div>}<div className="recommendations">{result.recommendations.map((r,i)=><div className="rec" key={r.sequence.join("-")}><div className="score">{r.score}</div><div><span className="tag">{r.title}</span><h3>{r.sequence.map(c=>c[0].toUpperCase()+c.slice(1)).join(" → ")}</h3><p>{r.explanation} {r.caveats[0]}</p></div></div>)}</div></>}
        </article>
      </div>
      <div className="grid" style={{marginTop:20}}>
      <article className="card"><h2>NASA future climate scenarios</h2><p className="sub">Compare NASA POWER multi-model ensemble monthly climate scenarios for 2041–2060 at this point. These are regional climate contexts, not farm forecasts.</p><button className="btn" disabled={projectionBusy} onClick={loadProjection}>{projectionBusy?"Loading scenarios…":"Compare scenarios"}</button>{projectionError&&<div className="error">{projectionError}</div>}{projection&&<><div className="banner">{projection.provider} · {projection.model} ensemble · {projection.period.start_year}–{projection.period.end_year}. Scenario differences are not crop-yield predictions. Available values: {projection.quality?.values_available??"unknown"}/{projection.quality?.expected_values??"unknown"}.</div>{projection.data_gaps?.map(gap=><div className="error" key={gap} role="status">{gap}</div>)}<div className="stats">{scenarios.map(s=><div className="stat" key={s.name}><b>{s.temperature}°C</b><span>{s.name.toUpperCase()} mean temperature · mean precipitation {s.precipitation} mm/day</span></div>)}</div></>}</article></div>
      <div className="grid" style={{marginTop:20}}><article className="card"><h2>What this view can tell you</h2><p className="sub">NASA POWER gridded meteorological estimates and NASA GIBS imagery provide regional context. Neither resolves exact conditions inside a small field.</p></article><article className="card"><h2>What to verify locally</h2><p className="sub">Soil test · water access · planting dates and local varieties · market constraints · pest and disease history. Soil is farmer-entered and not inferred.</p></article></div>
      <footer className="foot">Sources: NASA POWER for daily climate; NASA GIBS layers for MODIS/VIIRS, GPM IMERG and SMAP visual context. See <a href="/sources">all official challenge resources and data provenance</a>. TerraRotate AI is independent; NASA does not endorse it.</footer>
    </section>
  </main>;
}
