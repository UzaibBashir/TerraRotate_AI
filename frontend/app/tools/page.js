"use client";
import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "https://terrarotate-api.onrender.com/api";
const modules = [
  ["vegetation","Field intelligence & vegetation","/intelligence/vegetation","Upload numeric vegetation observations (one row per date). NASA GIBS browse images cannot be used as values."],
  ["water","Water budget","/intelligence/water","NASA POWER HY data is retrieved for the coordinates. Rainfall scenarios, crop demand, area and irrigation are your planning inputs."],
  ["rotation","RotationRisk sensitivity","/intelligence/rotation-risk", "Compare the leading rotation across four preference settings. This does not produce a confidence estimate."],
  ["bare","Possible bare windows","/intelligence/bare-windows","Uses dated vegetation values and reports possible low-vegetation windows only."],
  ["climate","Historical climate analogues","/intelligence/climate-analogs","Uses NASA POWER monthly history for your field point and up to five candidate points. Analogues are not future predictions."],
  ["zones","Sample-point zones","/intelligence/zones","Cluster georeferenced measurements you provide. Results are not contiguous field boundaries."],
  ["memory","Farmer feedback memory","/intelligence/farmer-feedback","Bayesian Beta update for subjective feedback. Saved locally by default, or to your Supabase account when configured."],
];

const demoInputs = {
  vegetation: `{"source":"Synthetic demo values (not observed NASA data)","index":"NDVI","resolution":"Illustrative sample only","observations":[{"date":"2026-05-01","value":0.28},{"date":"2026-06-01","value":0.46},{"date":"2026-07-01","value":0.63},{"date":"2026-08-01","value":0.58}]}`,
  bare: `{"source":"Synthetic demo values (not observed NASA data)","index":"NDVI","resolution":"Illustrative sample only","low_threshold":0.2,"observations":[{"date":"2026-03-01","value":0.12},{"date":"2026-04-01","value":0.18},{"date":"2026-05-01","value":0.34},{"date":"2026-06-01","value":0.57}]}`,
  water: `{"latitude":42.03,"longitude":-93.62,"area_hectares":74.1,"crop_demand_mm":300,"irrigation_mm":40,"expected_rainfall_mm":{"dry":30,"normal":80,"wet":140}}`,
  climate: `{"field":{"latitude":42.03,"longitude":-93.62},"candidates":[{"name":"Demo candidate · Beauce, France","latitude":48.2,"longitude":1.6},{"name":"Demo candidate · Paraná, Brazil","latitude":-24.95,"longitude":-53.45}],"start_year":1991,"end_year":2020}`,
  zones: `{"zone_count":2,"features":["ndvi"],"source":"Synthetic demo measurements (not satellite observations)","resolution":"Illustrative sample points","points":[{"latitude":42.028,"longitude":-93.624,"ndvi":0.31},{"latitude":42.03,"longitude":-93.62,"ndvi":0.46},{"latitude":42.032,"longitude":-93.616,"ndvi":0.68},{"latitude":42.034,"longitude":-93.625,"ndvi":0.27}]}`
};
const hint = `Choose a module, then use “Load demo input” to try it. Demo vegetation and zone values are synthetic and are not satellite measurements. Water and climate examples use the illustrative Iowa sample coordinates; those modules fetch NASA POWER data when run.`;

const farmerGuides = {
  vegetation: { what:"Tracks how green vegetation readings change across the dates you provide. A low reading or unusual change is a clue to check, not proof of a crop problem.", use:"Compare the dates with crop stage, field notes, and recent weather. Investigate unusual readings in the field before changing irrigation or inputs.", limits:"Only the supplied dates are analyzed. Cloud cover, mixed pixels, crop type, and growth stage can affect readings. This tool cannot diagnose disease or nutrient deficiency." },
  water: { what:"Compares your planned crop water need with rainfall and irrigation under dry, typical, and wet rainfall assumptions. It also shows the equivalent water volume for the field.", use:"Try realistic rainfall and crop-demand estimates for your season, then compare the three scenarios when planning irrigation or discussing water needs.", limits:"Rainfall scenarios, crop demand, irrigation, and field area are planning inputs. The balance does not account for runoff, soil storage, delivery losses, or crop-stage timing. NASA soil moisture is a coarse regional estimate, not a field sensor." },
  rotation: { what:"Checks whether the leading crop rotation stays the same when the tool emphasizes water, soil, crop diversity, or a balanced preference.", use:"A rotation that appears under several preferences may be less sensitive to those priorities. Review the crop sequence and local planting constraints before choosing.", limits:"This compares four preset preferences. Stability is not a probability, a yield forecast, or a guarantee of success." },
  bare: { what:"Groups supplied dates when vegetation readings fall below your chosen threshold into possible low-vegetation periods.", use:"Compare flagged dates with planting, harvest, and field records to understand what was happening on the ground.", limits:"Sparse readings cannot confirm bare soil, fallow, or harvest. Gaps between observations are not filled in." },
  climate: { what:"Compares historical monthly temperature and rainfall patterns at your field with the candidate locations you enter, then ranks the closest matches.", use:"Use similar locations as a starting point for asking local growers or advisers about practices that may be relevant to your climate.", limits:"A historical match is not a future climate prediction. The result only compares the candidate places supplied and uses gridded climate data." },
  zones: { what:"Groups the sample measurements you provide into clusters with similar values and locations.", use:"Use the groups to organize follow-up sampling or field checks, then compare them with soil and crop observations.", limits:"Clusters are based only on supplied sample points and selected measurements. They are not mapped management zones or surveyed field boundaries." },
  memory: { what:"Keeps a simple count of whether you found recommendations helpful, so your feedback can be summarized over time.", use:"Rate recommendations based on your experience. Treat the summary as your opinion history, not evidence that a recommendation improved the crop.", limits:"Feedback is subjective. It is stored in this browser unless an account is configured." }
};
const labels = {module:"Analysis",source:"Data source",resolution:"Image resolution",period:"Date range",start:"Start",end:"End",observation_count:"Dates analyzed",observations:"Readings by date",date:"Date",value:"NDVI reading",median_index:"Typical NDVI reading",first_to_last_change:"Change from first to last reading",possible_low_vegetation_dates:"Dates with low vegetation readings",robust_outlier_dates:"Unusual reading dates",missing_data:"Missing dates",interpretation:"How to read this result",threshold:"Low-reading threshold",windows:"Possible low-vegetation periods",sample_count:"Readings in this period",observed_span_days:"Days between first and last reading",label:"Note",data_gaps:"Data notes",area_hectares:"Field size",scenarios:"Rainfall scenarios",dry:"Dry season estimate",normal:"Typical rainfall estimate",wet:"Wet season estimate",rainfall_mm:"Rainfall",irrigation_mm_farmer_estimate:"Planned irrigation",estimated_supply_mm:"Estimated water available",demand_mm_farmer_estimate:"Estimated crop water need",deficit_mm:"Possible water shortfall",surplus_mm:"Water above estimated need",deficit_volume_m3:"Shortfall across the field",supply_volume_m3:"Water supply across the field",nasa_context:"NASA regional water context",soil_moisture_summary:"Recent regional soil-moisture estimate",mean_surface_volumetric_content:"Surface soil moisture",mean_root_zone_volumetric_content:"Root-zone soil moisture",note:"Data note",provenance:"Where estimates came from",rainfall_scenarios:"Rainfall assumptions",demand:"Crop water need",irrigation:"Irrigation",top_rotation_by_priority:"Leading rotation by priority",water:"Water priority",soil:"Soil priority",diversity:"Diversity priority",balanced:"Balanced priority",rank_stability:"How often each rotation ranked first",confidence:"Confidence",analogs:"Closest historical climate matches",name:"Location",similarity_score:"Similarity score",distance:"Climate difference score",compared_months:"Months compared",candidate_count:"Locations compared",field_period:"Historical period",note:"Note",coordinates:"Coordinates",features:"Compared climate measures",profile:"Climate profile",temperature_c:"Temperature",precipitation_mm_day:"Daily rainfall",zone_count:"Number of groups",zones:"Measurement groups",center:"Group center",mean:"Average",count:"Samples",features:"Measurements compared",posterior:"Updated feedback summary",prior:"Starting feedback summary",alpha:"Helpful rating weight",beta:"Not-helpful rating weight",mean:"Share rated helpful",credible_interval_95:"Uncertainty range",feedback_count:"Feedback ratings",observation:"Feedback meaning",persistence:"Storage",helpful:"Helpful ratings",not_helpful:"Not-helpful ratings"};
const units = {area_hectares:"ha",rainfall_mm:"mm",irrigation_mm_farmer_estimate:"mm",estimated_supply_mm:"mm",demand_mm_farmer_estimate:"mm",deficit_mm:"mm",surplus_mm:"mm",deficit_volume_m3:"m³",supply_volume_m3:"m³",temperature_c:"°C",precipitation_mm_day:"mm/day",observed_span_days:"days",mean_surface_volumetric_content:"m³/m³",mean_root_zone_volumetric_content:"m³/m³"};
function humanLabel(key){return labels[key]||key.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase());}
function readable(value,key="") {
  if(value===null||value===undefined)return "Not available";
  if(typeof value==="boolean")return value?"Yes":"No";
  if(typeof value==="number")return `${Number.isInteger(value)?value:Number(value.toFixed(3))}${units[key]?` ${units[key]}`:""}`;
  if(typeof value==="string")return value.replaceAll("_"," ");
  if(Array.isArray(value)) {
    if(!value.length)return "None reported";
    if(value.every(item=>typeof item!=="object"||item===null))return <ul className="readable-list">{value.map((item,i)=><li key={i}>{readable(item,key)}</li>)}</ul>;
    return <div className="readable-nested">{value.map((item,i)=><section className="readable-item" key={i}><b>{item.name||item.label||`Item ${i+1}`}</b>{readableObject(item)}</section>)}</div>;
  }
  if(typeof value==="object")return readableObject(value);
  return String(value);
}
function readableObject(obj){return <dl className="readable-data">{Object.entries(obj).map(([key,value])=><div key={key}><dt>{humanLabel(key)}</dt><dd>{readable(value,key)}</dd></div>)}</dl>;}

export default function Tools() {
  const [selected,setSelected]=useState("vegetation"), [input,setInput]=useState(""), [output,setOutput]=useState(null), [error,setError]=useState(""), [busy,setBusy]=useState(false), [history,setHistory]=useState({helpful:0,not_helpful:0});
  const [email,setEmail]=useState(""),[password,setPassword]=useState(""),[session,setSession]=useState(null),[authMessage,setAuthMessage]=useState("");
  const [imageMode,setImageMode]=useState("farm_photo"),[photo,setPhoto]=useState(null),[imagePreview,setImagePreview]=useState(""),[imageResult,setImageResult]=useState(null),[imageError,setImageError]=useState(""),[imageBusy,setImageBusy]=useState(false),[visionAvailable,setVisionAvailable]=useState(null);
  const threeDaysAgo=new Date(Date.now()-3*86400000).toISOString().slice(0,10);
  const [satLat,setSatLat]=useState("33.7311"),[satLon,setSatLon]=useState("75.1480"),[satDate,setSatDate]=useState(threeDaysAgo),[satLayer,setSatLayer]=useState("modis_terra");
  const active=modules.find(m=>m[0]===selected);
  const supabaseUrl=process.env.NEXT_PUBLIC_SUPABASE_URL||"",supabaseKey=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||"";
  function userFromToken(token){try{return JSON.parse(atob(token.split(".")[1].replace(/-/g,"+").replace(/_/g,"/"))).sub;}catch{return null;}}
  async function loadFeedback(token){
    const owner=userFromToken(token);if(!owner)return;
    const response=await fetch(`${supabaseUrl}/rest/v1/farmer_feedback?select=rating&owner_id=eq.${encodeURIComponent(owner)}`,{headers:{apikey:supabaseKey,Authorization:`Bearer ${token}`}});
    if(!response.ok)throw new Error("Could not read your feedback history. Check that the Supabase schema and row security policies are applied.");
    const rows=await response.json();const next={helpful:rows.filter(x=>x.rating>=4).length,not_helpful:rows.filter(x=>x.rating<=2).length};setHistory(next);return next;
  }
  useEffect(()=>{try{setHistory(JSON.parse(localStorage.getItem("terrarotate_feedback")||'{"helpful":0,"not_helpful":0}'));const token=localStorage.getItem("terrarotate_supabase_session");if(token){setSession({access_token:token});}}catch{}},[]);
  useEffect(()=>{fetch(`${API}/intelligence/image-description/status`).then(r=>r.json()).then(d=>setVisionAvailable(Boolean(d.available))).catch(()=>setVisionAvailable(false));},[]);
  useEffect(()=>{if(session?.access_token&&supabaseUrl&&supabaseKey)loadFeedback(session.access_token).catch(e=>setAuthMessage(e.message));},[session?.access_token,supabaseUrl,supabaseKey]);
  async function authenticate(mode){
    setBusy(true);setAuthMessage("");
    try{
      const path=mode==="signup"?"/auth/v1/signup":"/auth/v1/token?grant_type=password";
      const response=await fetch(`${supabaseUrl}${path}`,{method:"POST",headers:{"Content-Type":"application/json",apikey:supabaseKey},body:JSON.stringify({email,password})});
      const data=await response.json();if(!response.ok)throw new Error(data.msg||data.message||data.error_description||"Supabase authentication failed");
      if(data.access_token){localStorage.setItem("terrarotate_supabase_session",data.access_token);setSession(data);setAuthMessage("Signed in. Feedback history is stored under your account.");}
      else setAuthMessage("Check your email for the confirmation step, then sign in.");
      setPassword("");
    }catch(e){setAuthMessage(e.message);}finally{setBusy(false);}
  }
  function choosePhoto(file){
    setImageResult(null);setImageError("");setPhoto(null);setImagePreview("");
    if(!file)return;
    if(!["image/jpeg","image/png","image/webp","image/gif"].includes(file.type)){setImageError("Choose a JPEG, PNG, WEBP, or GIF image.");return;}
    if(file.size>5*1024*1024){setImageError("Choose an image smaller than 5 MB.");return;}
    const reader=new FileReader();reader.onload=()=>{setPhoto({name:file.name,mime_type:file.type,image_data:reader.result});setImagePreview(reader.result);};reader.onerror=()=>setImageError("The image could not be opened. Please choose it again.");reader.readAsDataURL(file);
  }
  async function describeSelectedImage(){
    setImageBusy(true);setImageError("");setImageResult(null);
    try{
      let imageData,mimeType,context="";
      if(imageMode==="farm_photo"){
        if(!photo)throw new Error("Choose a farm photo first.");
        ({image_data:imageData,mime_type:mimeType}=photo);
      } else {
        const lat=Number(satLat),lon=Number(satLon);
        if(!Number.isFinite(lat)||lat < -90||lat>90||!Number.isFinite(lon)||lon < -180||lon>180)throw new Error("Enter a valid latitude and longitude.");
        if(!satDate)throw new Error("Choose an image date.");
        const query=new URLSearchParams({lat:String(lat),lon:String(lon),date:satDate,layer:satLayer,zoom:"2"});
        const imageResponse=await fetch(`${API}/imagery?${query}`);
        if(!imageResponse.ok){let problem={};try{problem=await imageResponse.json();}catch{}throw new Error(problem.error||"NASA imagery could not be loaded for that date and place.");}
        const blob=await imageResponse.blob();mimeType=blob.type||"image/jpeg";imageData=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error("The satellite image could not be read."));reader.readAsDataURL(blob);});
        context=`NASA GIBS ${satLayer.replaceAll("_"," ")} layer, ${satDate}, approximate center ${lat.toFixed(3)}, ${lon.toFixed(3)}.`;
        setImagePreview(imageData);
      }
      const response=await fetch(`${API}/intelligence/image-description`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({image_data:imageData,mime_type:mimeType,image_kind:imageMode,context})});
      const data=await response.json();if(!response.ok)throw new Error(data.error||"The image could not be described.");
      setImageResult(data);
    }catch(e){setImageError(e.message||"The image could not be described. Please try again.");}
    finally{setImageBusy(false);}
  }
  async function run(helpful) {
    setBusy(true);setError("");setOutput(null);
    try {
      let body={};
      if(selected==="rotation") body={};
      else if(selected==="memory") body={helpful,previous_feedback:history};
      else body=JSON.parse(input);
      const response=await fetch(API+active[2],{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      const data=await response.json();if(!response.ok)throw new Error(data.error||"Analysis unavailable");
      setOutput(data);
      if(selected==="memory") {
        if(session?.access_token&&supabaseUrl&&supabaseKey){
          const owner=userFromToken(session.access_token);if(!owner)throw new Error("Your sign-in session is invalid. Sign in again.");
          const saved=await fetch(`${supabaseUrl}/rest/v1/farmer_feedback`,{method:"POST",headers:{"Content-Type":"application/json",apikey:supabaseKey,Authorization:`Bearer ${session.access_token}`,Prefer:"return=minimal"},body:JSON.stringify({owner_id:owner,rating:helpful?5:1,notes:"Subjective helpful/not-helpful feedback for a recommendation."})});
          if(!saved.ok)throw new Error("Supabase did not save feedback. Apply database/schema.sql and verify row-level security.");
          await loadFeedback(session.access_token);
        } else {const next={helpful:history.helpful+(helpful?1:0),not_helpful:history.not_helpful+(helpful?0:1)};localStorage.setItem("terrarotate_feedback",JSON.stringify(next));setHistory(next);}
      }
    } catch(e){setError(e instanceof SyntaxError?"Enter valid JSON in the input box.":e.message);}
    finally{setBusy(false);}
  }
  return <main className="shell"><header className="topbar"><a className="brand" href="/">◒ TERRAROTATE AI</a><nav className="nav"><a href="/">Field overview</a><span>Analysis tools</span><a href="/sources">Data sources</a><a href="/model">Rotation research</a></nav><span>GLOBAL DEMO</span></header>
    <section className="hero"><div><div className="eyebrow">IMAGE-IN · FARMER-READABLE NOTES-OUT</div><h1>Analysis tools</h1><p>Choose a farm photo or NASA satellite view and get a clear written description.</p></div><div className="hero-badge">Visual description · not a diagnosis</div></section>
    <section className="content"><article className="card image-analysis-card"><div className="eyebrow">IMAGE DESCRIPTION</div><h2>Turn an image into clear notes</h2><p className="sub">Describe what is visible, then get a plain-language summary with useful context for a farmer.</p>
      <div className="field"><label htmlFor="image-kind">Image source</label><select id="image-kind" value={imageMode} onChange={e=>{setImageMode(e.target.value);setPhoto(null);setImagePreview("");setImageResult(null);setImageError("");}}><option value="farm_photo">A photo from my farm</option><option value="nasa_satellite">NASA satellite image</option></select></div>
      {imageMode==="farm_photo"?<div className="field"><label htmlFor="farm-photo">Choose a farm photo</label><input id="farm-photo" type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={e=>choosePhoto(e.target.files?.[0])}/><span className="status">JPEG, PNG, WEBP or GIF · up to 5 MB</span></div>:<><div className="row"><div className="field"><label htmlFor="sat-lat">Latitude</label><input id="sat-lat" type="number" min="-90" max="90" step="any" value={satLat} onChange={e=>setSatLat(e.target.value)}/></div><div className="field"><label htmlFor="sat-lon">Longitude</label><input id="sat-lon" type="number" min="-180" max="180" step="any" value={satLon} onChange={e=>setSatLon(e.target.value)}/></div></div><div className="row"><div className="field"><label htmlFor="sat-layer">NASA map layer</label><select id="sat-layer" value={satLayer} onChange={e=>setSatLayer(e.target.value)}><option value="modis_terra">Terra MODIS · natural color</option><option value="modis_aqua">Aqua MODIS · natural color</option><option value="viirs_snpp">Suomi NPP VIIRS · natural color</option><option value="modis_ndvi">Terra MODIS · vegetation index</option><option value="viirs_ndvi">Suomi NPP VIIRS · vegetation index</option><option value="imerg_precipitation">GPM · precipitation map</option><option value="smap_surface_moisture">SMAP · soil-moisture map</option></select></div><div className="field"><label htmlFor="sat-date">Image date</label><input id="sat-date" type="date" max={threeDaysAgo} value={satDate} onChange={e=>setSatDate(e.target.value)}/><span className="status">Availability depends on the layer and date.</span></div></div></>}
      <p className="privacy-note">When you choose “Describe image,” the image is sent to the OpenAI vision service configured for this app to create the description. TerraRotate does not store it; the provider’s data practices apply.</p>
      {visionAvailable===false&&<div className="banner">Image descriptions need a server-side AI key. Add OPENAI_API_KEY to the backend environment to enable this feature.</div>}
      <div className="row"><button className="btn" type="button" disabled={imageBusy||visionAvailable!==true||(imageMode==="farm_photo"&&!photo)} onClick={describeSelectedImage}>{imageBusy?"Reading image…":"Describe image"}</button>{imageMode==="farm_photo"&&photo&&<span className="status">Selected: {photo.name}</span>}</div>
      {imageError&&<div className="error" role="alert">{imageError}</div>}
      {imagePreview&&<img className="analysis-preview" src={imagePreview} alt="Image selected for description"/>}
      {imageResult&&<section className="image-description" aria-live="polite"><span className="tag">{imageResult.source}</span><h3>What the image appears to show</h3><p>{imageResult.description}</p><div className="banner">{imageResult.caution}</div></section>}
      <div className="image-guide"><h3>How to use this description</h3><p>Use it to notice visible patterns and plan what to check next. Confirm important observations in the field with local knowledge or an agricultural adviser.</p></div>
    </article>
    <details className="card legacy-tools"><summary>Other analysis tools</summary><p className="sub">These tools use field measurements and planning inputs instead of image descriptions.</p><div className="grid"><article className="card"><h2>Select a module</h2><p className="sub">Choose a module and load its clearly labeled demo input, or enter your own sourced data.</p><div className="field"><label>Analysis module</label><select value={selected} onChange={e=>{setSelected(e.target.value);setInput("");setOutput(null);setError("");}}>{modules.map(m=><option key={m[0]} value={m[0]}>{m[1]}</option>)}</select></div><div className="banner">{active[3]}</div>{selected!=="rotation"&&selected!=="memory"&&<><label className="field-label" htmlFor="analysis-json">Input data (JSON)</label><textarea id="analysis-json" className="json-input" value={input} onChange={e=>setInput(e.target.value)} placeholder="Choose ‘Load demo input’ to see an example, or enter JSON here." spellCheck="false"/>{demoInputs[selected]&&<div className="row"><button className="btn secondary" type="button" onClick={()=>{setInput(demoInputs[selected]);setOutput(null);setError("");}}>Load demo input</button><span className="status">Example values are labeled and editable.</span></div>}</>}
      <div className="row"><button className="btn" disabled={busy||selected==="memory"} onClick={()=>run()}>{busy?"Analyzing…":"Run analysis"}</button>{selected==="memory"&&<><button className="btn" disabled={busy} onClick={()=>run(true)}>Helpful</button><button className="btn secondary" disabled={busy} onClick={()=>run(false)}>Not helpful</button></>}</div>{selected==="memory"&&<><p className="status">{session?.access_token?"Signed-in Supabase account":"Browser-local demo"}: {history.helpful} helpful and {history.not_helpful} not-helpful responses.</p>
      {supabaseUrl&&supabaseKey?<div className="memory-auth"><p className="sub">Optional account sync through your Supabase project. The database tables and row-level security policy in <code>database/schema.sql</code> must be applied first.</p>{session?.access_token?<button className="btn secondary" onClick={()=>{localStorage.removeItem("terrarotate_supabase_session");setSession(null);setAuthMessage("Signed out.");}}>Sign out</button>:<><div className="field"><label>Email</label><input type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)}/></div><div className="field"><label>Password</label><input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)}/></div><div className="row"><button className="btn" disabled={busy||!email||!password} onClick={()=>authenticate("signin")}>Sign in</button><button className="btn secondary" disabled={busy||!email||!password} onClick={()=>authenticate("signup")}>Create account</button></div></>}{authMessage&&<div className="banner">{authMessage}</div>}</div>:<p className="status">Supabase is not configured; feedback stays in this browser.</p>}</>}{error&&<div className="error">{error}</div>}</article>
      <article className="card farmer-guide"><div className="eyebrow">A GUIDE FOR YOUR FIELD</div><h2>{active[1]}: what it means</h2><section><h3>What this tool checks</h3><p>{farmerGuides[selected].what}</p></section><section><h3>How you can use it</h3><p>{farmerGuides[selected].use}</p></section><section><h3>Keep in mind</h3><p>{farmerGuides[selected].limits}</p></section></article>
      <article className="card"><h2>Results in plain language</h2>{!output&&<div className="banner">Run this tool to see its findings explained here. The guide above explains what to look for and how to use the result.</div>}{output&&<><div className="banner">{output.interpretation||output.persistence||"Use this result as a starting point for field checks and local advice."}</div>{readableObject(output)}</>}</article></div>
      </details>
      <details className="card format-card"><summary>About the demo inputs</summary><p className="sub">Vegetation and zone samples are synthetic examples, not NASA measurements. Water and climate samples use the illustrative Iowa demo coordinates and request live NASA POWER data when you run them. Field names, boundaries, and soil details are illustrative examples rather than surveyed farm records. Replace demo values with real, sourced field data before interpreting results.</p><p className="sub">For image descriptions, TerraRotate sends the image to the server-side vision service only when you press “Describe image.”</p></details>
      <footer className="foot">Field and recommendation history are not persisted yet. Feedback stays in this browser by default, or syncs to the signed-in owner account when Supabase is configured. Use local agronomic expertise before making a farm decision.</footer></section></main>;
}
