"use client";
import { useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
const CROPS = [["potato","Potato"],["rice","Rice"],["maize","Maize"],["wheat","Wheat"],["mustard","Mustard"],["pea","Field pea"]];

async function readJson(response, fallback) {
  const value = await response.json();
  if (!response.ok) throw new Error(value.error || fallback);
  return value;
}

export default function Home() {
  const [lat,setLat]=useState("33.7311"), [lon,setLon]=useState("75.1480");
  const [crop,setCrop]=useState("potato"), [water,setWater]=useState("moderate"), [priority,setPriority]=useState("balanced");
  const [soilTexture,setSoilTexture]=useState(""), [soilPh,setSoilPh]=useState(""), [organicMatter,setOrganicMatter]=useState("");
  const [climate,setClimate]=useState(null), [result,setResult]=useState(null), [busy,setBusy]=useState(false);
  const [error,setError]=useState(""), [climateError,setClimateError]=useState("");
  const [layer,setLayer]=useState("modis_terra"), [imageDate,setImageDate]=useState(new Date(Date.now()-3*86400000).toISOString().slice(0,10));
  const [imageUrl,setImageUrl]=useState(""), [imageError,setImageError]=useState("");
  const [projection,setProjection]=useState(null), [projectionError,setProjectionError]=useState(""), [projectionBusy,setProjectionBusy]=useState(false);

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
    setImageError("");
    setImageUrl(`${API}/imagery?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&layer=${encodeURIComponent(layer)}&date=${encodeURIComponent(imageDate)}`);
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
    const t=(projection.rows||[]).filter(x=>x.scenario===name&&x.parameter==="T2M").map(x=>x.value);
    const p=(projection.rows||[]).filter(x=>x.scenario===name&&x.parameter==="PRECTOTCORR").map(x=>x.value);
    return {name,temperature:t.length?(t.reduce((a,b)=>a+b,0)/t.length).toFixed(1):"—",precipitation:p.length?(p.reduce((a,b)=>a+b,0)/p.length).toFixed(2):"—"};
  });

  return <main className="shell">
    <header className="topbar"><div className="brand">◒ TERRAROTATE <span style={{fontWeight:400}}>AI</span></div><nav className="nav"><span>Field overview</span><span>Rotations</span><a href="/sources">Data sources</a></nav><div style={{fontSize:12,color:"#66756e"}}>DEMO · KASHMIR</div></header>
    <section className="hero"><div><div className="eyebrow">FIELD SHIFT · FARM ADAPTATION</div><h1>Plan the next season<br/>with the evidence in view.</h1><p>Explore NASA climate and Earth imagery alongside field details and farmer priorities. Every comparison shows its reasoning and information gaps.</p></div><div className="hero-badge">Decision support · farmer-led</div></section>
    <section className="content">
      <div className="grid">
        <article className="card">
          <h2>Field conditions</h2><p className="sub">Enter a point anywhere in the world. Demonstration coordinates are illustrative and do not represent a verified farm.</p>
          <div className="row"><div className="field"><label>Latitude</label><input value={lat} onChange={e=>setLat(e.target.value)} type="number" step="any"/></div><div className="field"><label>Longitude</label><input value={lon} onChange={e=>setLon(e.target.value)} type="number" step="any"/></div></div>
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
      <div className="grid" style={{marginTop:20}}><article className="card"><h2>NASA Earth observations · imagery layers</h2><p className="sub">NASA GIBS renders the selected dataset around this point. SMAP and GPM/IMERG provide soil-moisture and rainfall context; these map images are visualizations only, not numeric field readings or inputs to the rotation score.</p>
        <div className="row"><div className="field"><label>NASA data layer</label><select value={layer} onChange={e=>setLayer(e.target.value)}><option value="modis_terra">Terra MODIS · true color</option><option value="modis_aqua">Aqua MODIS · true color</option><option value="viirs_snpp">Suomi NPP VIIRS · true color</option><option value="modis_ndvi">Terra MODIS · 8-day NDVI map</option><option value="imerg_precipitation">GPM IMERG · precipitation rate</option><option value="smap_surface_moisture">SMAP L4 · surface soil moisture</option></select></div><div className="field"><label>Observation date</label><input type="date" value={imageDate} max={new Date().toISOString().slice(0,10)} onChange={e=>setImageDate(e.target.value)}/></div></div>
        <button className="btn" onClick={loadImagery}>Load NASA imagery</button>{imageError&&<div className="error">{imageError}</div>}{imageUrl&&<img src={imageUrl} alt={`NASA GIBS ${layer} visualization for the selected region and date`} onError={()=>setImageError("NASA GIBS has no image available for this layer and date. Choose another date.")} style={{display:"block",width:"100%",marginTop:16,borderRadius:10,background:"#edf1ee",minHeight:180,objectFit:"cover"}}/>}
        <p className="status">NASA Global Imagery Browse Services · MODIS, VIIRS, GPM IMERG, or SMAP. Product availability varies by date. NDVI, soil moisture, and precipitation maps are not decoded into numeric measurements.</p>
      </article>
      <article className="card"><h2>NASA future climate scenarios</h2><p className="sub">Compare NASA POWER multi-model ensemble monthly climate scenarios for 2041–2060 at this point. These are regional climate contexts, not farm forecasts.</p><button className="btn" disabled={projectionBusy} onClick={loadProjection}>{projectionBusy?"Loading scenarios…":"Compare scenarios"}</button>{projectionError&&<div className="error">{projectionError}</div>}{projection&&<><div className="banner">{projection.provider} · {projection.model} ensemble · {projection.period.start_year}–{projection.period.end_year}. Scenario differences are not crop-yield predictions.</div><div className="stats">{scenarios.map(s=><div className="stat" key={s.name}><b>{s.temperature}°C</b><span>{s.name.toUpperCase()} mean temperature · mean precipitation {s.precipitation} mm/day</span></div>)}</div></>}</article></div>
      <div className="grid" style={{marginTop:20}}><article className="card"><h2>What this view can tell you</h2><p className="sub">NASA POWER gridded meteorological estimates and NASA GIBS imagery provide regional context. Neither resolves exact conditions inside a small field.</p></article><article className="card"><h2>What to verify locally</h2><p className="sub">Soil test · water access · planting dates and local varieties · market constraints · pest and disease history. Soil is farmer-entered and not inferred.</p></article></div>
      <footer className="foot">Sources: NASA POWER for daily climate; NASA GIBS layers for MODIS/VIIRS, GPM IMERG and SMAP visual context. See <a href="/sources">all official challenge resources and data provenance</a>. TerraRotate AI is independent; NASA does not endorse it.</footer>
    </section>
  </main>;
}
