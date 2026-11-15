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
    <section className="hero"><div><div className="eyebrow">EVIDENCE-IN · EXPLANATION-OUT</div><h1>Analysis tools</h1><p>Run each working baseline with sourced values and inspect its provenance, assumptions, and data gaps.</p></div><div className="hero-badge">No unsupported field diagnosis</div></section>
    <section className="content"><div className="grid"><article className="card"><h2>Select a module</h2><p className="sub">Choose a module and load its clearly labeled demo input, or enter your own sourced data.</p><div className="field"><label>Analysis module</label><select value={selected} onChange={e=>{setSelected(e.target.value);setInput("");setOutput(null);setError("");}}>{modules.map(m=><option key={m[0]} value={m[0]}>{m[1]}</option>)}</select></div><div className="banner">{active[3]}</div>{selected!=="rotation"&&selected!=="memory"&&<><label className="field-label" htmlFor="analysis-json">Input data (JSON)</label><textarea id="analysis-json" className="json-input" value={input} onChange={e=>setInput(e.target.value)} placeholder="Choose ‘Load demo input’ to see an example, or enter JSON here." spellCheck="false"/>{demoInputs[selected]&&<div className="row"><button className="btn secondary" type="button" onClick={()=>{setInput(demoInputs[selected]);setOutput(null);setError("");}}>Load demo input</button><span className="status">Example values are labeled and editable.</span></div>}</>}
      <div className="row"><button className="btn" disabled={busy||selected==="memory"} onClick={()=>run()}>{busy?"Analyzing…":"Run analysis"}</button>{selected==="memory"&&<><button className="btn" disabled={busy} onClick={()=>run(true)}>Helpful</button><button className="btn secondary" disabled={busy} onClick={()=>run(false)}>Not helpful</button></>}</div>{selected==="memory"&&<><p className="status">{session?.access_token?"Signed-in Supabase account":"Browser-local demo"}: {history.helpful} helpful and {history.not_helpful} not-helpful responses.</p>
      {supabaseUrl&&supabaseKey?<div className="memory-auth"><p className="sub">Optional account sync through your Supabase project. The database tables and row-level security policy in <code>database/schema.sql</code> must be applied first.</p>{session?.access_token?<button className="btn secondary" onClick={()=>{localStorage.removeItem("terrarotate_supabase_session");setSession(null);setAuthMessage("Signed out.");}}>Sign out</button>:<><div className="field"><label>Email</label><input type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)}/></div><div className="field"><label>Password</label><input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)}/></div><div className="row"><button className="btn" disabled={busy||!email||!password} onClick={()=>authenticate("signin")}>Sign in</button><button className="btn secondary" disabled={busy||!email||!password} onClick={()=>authenticate("signup")}>Create account</button></div></>}{authMessage&&<div className="banner">{authMessage}</div>}</div>:<p className="status">Supabase is not configured; feedback stays in this browser.</p>}</>}{error&&<div className="error">{error}</div>}</article>
      <article className="card farmer-guide"><div className="eyebrow">A GUIDE FOR YOUR FIELD</div><h2>{active[1]}: what it means</h2><section><h3>What this tool checks</h3><p>{farmerGuides[selected].what}</p></section><section><h3>How you can use it</h3><p>{farmerGuides[selected].use}</p></section><section><h3>Keep in mind</h3><p>{farmerGuides[selected].limits}</p></section></article>
      <article className="card"><h2>Results in plain language</h2>{!output&&<div className="banner">Run this tool to see its findings explained here. The guide above explains what to look for and how to use the result.</div>}{output&&<><div className="banner">{output.interpretation||output.persistence||"Use this result as a starting point for field checks and local advice."}</div>{readableObject(output)}</>}</article></div>
      <details className="card format-card"><summary>About the demo inputs</summary><p className="sub">Vegetation and zone samples are synthetic examples, not NASA measurements. Water and climate samples use the illustrative Iowa demo coordinates and request live NASA POWER data when you run them. Field names, boundaries, and soil details are illustrative examples rather than surveyed farm records. Replace demo values with real, sourced field data before interpreting results.</p><pre className="json-output">{hint}</pre></details>
      <footer className="foot">Field and recommendation history are not persisted yet. Feedback stays in this browser by default, or syncs to the signed-in owner account when Supabase is configured. Use local agronomic expertise before making a farm decision.</footer></section></main>;
}
