"use client";
import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
const modules = [
  ["vegetation","Field intelligence & vegetation","/intelligence/vegetation","Upload numeric vegetation observations (one row per date). NASA GIBS browse images cannot be used as values."],
  ["water","Water budget","/intelligence/water","NASA POWER HY data is retrieved for the coordinates. Rainfall scenarios, crop demand, area and irrigation are your planning inputs."],
  ["rotation","RotationRisk sensitivity","/intelligence/rotation-risk", "Compare the leading rotation across four preference settings. This does not produce a confidence estimate."],
  ["bare","Possible bare windows","/intelligence/bare-windows","Uses dated vegetation values and reports possible low-vegetation windows only."],
  ["climate","Historical climate analogues","/intelligence/climate-analogs","Uses NASA POWER monthly history for your field point and up to five candidate points. Analogues are not future predictions."],
  ["zones","Sample-point zones","/intelligence/zones","Cluster georeferenced measurements you provide. Results are not contiguous field boundaries."],
  ["memory","Farmer feedback memory","/intelligence/farmer-feedback","Bayesian Beta update for subjective feedback. Saved locally by default, or to your Supabase account when configured."],
];

const hint = `Examples (replace with your real, sourced observations):
Vegetation / bare windows:
{"source":"NASA MODIS MOD13Q1 v061","index":"NDVI","resolution":"state native grid","observations":[{"date":"YYYY-MM-DD","value":0.42}]}

Water:
{"latitude":33.73,"longitude":75.15,"area_hectares":1,"crop_demand_mm":300,"irrigation_mm":40,"expected_rainfall_mm":{"dry":30,"normal":80,"wet":140}}

Climate analogues (provide real candidate coordinates):
{"field":{"latitude":33.73,"longitude":75.15},"candidates":[{"name":"Candidate site","latitude":34,"longitude":76}],"start_year":1991,"end_year":2020}

Zones:
{"zone_count":2,"features":["ndvi"],"source":"NASA product and version","resolution":"native pixel size","points":[{"latitude":33.7,"longitude":75.1,"ndvi":0.4},{"latitude":33.71,"longitude":75.11,"ndvi":0.7},{"latitude":33.72,"longitude":75.12,"ndvi":0.5}]}

RotationRisk: no input is required.
Feedback: {"helpful":true}`;

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
  return <main className="shell"><header className="topbar"><a className="brand" href="/">◒ TERRAROTATE AI</a><nav className="nav"><a href="/">Field overview</a><span>Analysis tools</span><a href="/sources">Data sources</a></nav><span>GLOBAL DEMO</span></header>
    <section className="hero"><div><div className="eyebrow">EVIDENCE-IN · EXPLANATION-OUT</div><h1>Analysis tools</h1><p>Run each working baseline with sourced values and inspect its provenance, assumptions, and data gaps.</p></div><div className="hero-badge">No unsupported field diagnosis</div></section>
    <section className="content"><div className="grid"><article className="card"><h2>Select a module</h2><p className="sub">Every data-dependent module requires evidence you provide. No sample values are silently used.</p><div className="field"><label>Analysis module</label><select value={selected} onChange={e=>{setSelected(e.target.value);setOutput(null);setError("");}}>{modules.map(m=><option key={m[0]} value={m[0]}>{m[1]}</option>)}</select></div><div className="banner">{active[3]}</div>{selected!=="rotation"&&<><label className="field-label" htmlFor="analysis-json">Input data (JSON)</label><textarea id="analysis-json" className="json-input" value={input} onChange={e=>setInput(e.target.value)} placeholder={hint} spellCheck="false"/></>}
      <div className="row"><button className="btn" disabled={busy||selected==="memory"} onClick={()=>run()}>{busy?"Analyzing…":"Run analysis"}</button>{selected==="memory"&&<><button className="btn" disabled={busy} onClick={()=>run(true)}>Helpful</button><button className="btn secondary" disabled={busy} onClick={()=>run(false)}>Not helpful</button></>}</div>{selected==="memory"&&<><p className="status">{session?.access_token?"Signed-in Supabase account":"Browser-local demo"}: {history.helpful} helpful and {history.not_helpful} not-helpful responses.</p>
      {supabaseUrl&&supabaseKey?<div className="memory-auth"><p className="sub">Optional account sync through your Supabase project. The database tables and row-level security policy in <code>database/schema.sql</code> must be applied first.</p>{session?.access_token?<button className="btn secondary" onClick={()=>{localStorage.removeItem("terrarotate_supabase_session");setSession(null);setAuthMessage("Signed out.");}}>Sign out</button>:<><div className="field"><label>Email</label><input type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)}/></div><div className="field"><label>Password</label><input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)}/></div><div className="row"><button className="btn" disabled={busy||!email||!password} onClick={()=>authenticate("signin")}>Sign in</button><button className="btn secondary" disabled={busy||!email||!password} onClick={()=>authenticate("signup")}>Create account</button></div></>}{authMessage&&<div className="banner">{authMessage}</div>}</div>:<p className="status">Supabase is not configured; feedback stays in this browser.</p>}</>}{error&&<div className="error">{error}</div>}</article>
      <article className="card"><h2>Result and evidence notes</h2>{!output&&<div className="banner">Results appear here after an analysis runs.</div>}{output&&<><div className="banner">{output.interpretation||output.persistence||"Exploratory result; review the assumptions before use."}</div><pre className="json-output">{JSON.stringify(output,null,2)}</pre></>}</article></div>
      <details className="card format-card"><summary>Input format examples</summary><p className="sub">These are schemas only. Replace all example values with real data and preserve source, date, product version, and native resolution.</p><pre className="json-output">{hint}</pre></details>
      <footer className="foot">Field and recommendation history are not persisted yet. Feedback stays in this browser by default, or syncs to the signed-in owner account when Supabase is configured. Use local agronomic expertise before making a farm decision.</footer></section></main>;
}
