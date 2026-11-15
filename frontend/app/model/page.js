"use client";
import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "https://terrarotate-api.onrender.com/api";

export default function ModelPage() {
  const [options, setOptions] = useState(null), [country, setCountry] = useState(""), [crop, setCrop] = useState(""), [metrics, setMetrics] = useState(null);
  const [result, setResult] = useState(null), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  useEffect(() => {
    Promise.all([
      fetch(`${API}/model/yield/options`).then(async r => { const d=await r.json(); if(!r.ok) throw Error(d.error||"Model data unavailable"); return d; }),
      fetch(`${API}/model/yield/status`).then(r=>r.json()),
    ]).then(([opts,status])=>{
      setOptions(opts); setMetrics(status.metrics);
      const india=opts.countries.find(x=>x.name==="India")||opts.countries[0];
      setCountry(india?.code||"");
      const rice=opts.crops.find(x=>x.name.toLowerCase().includes("rice"));
      setCrop(rice?.code||opts.crops[0]?.code||"");
    }).catch(e=>setError(e.message));
  }, []);
  const availableCrops = options?.crops.filter(x => options.crop_codes_by_country?.[country]?.includes(x.code)) || [];
  async function estimate(e) {
    e.preventDefault(); setBusy(true); setError(""); setResult(null);
    try {
      const response=await fetch(`${API}/model/yield/predict`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({country_code:country,crop_code:crop})});
      const data=await response.json(); if(!response.ok) throw Error(data.error||"Estimate unavailable"); setResult(data);
    } catch(e) { setError(e.message); } finally { setBusy(false); }
  }
  const maxValue=result?Math.max(...result.recent_history.map(x=>x.yield_t_ha),result.estimated_yield_t_ha,0.1):1;
  return <main className="shell">
    <header className="topbar"><a className="brand" href="/">◒ TERRAROTATE AI</a><nav className="nav"><a href="/">Field overview</a><a href="/tools">Analysis tools</a><a href="/sources">Data sources</a><span>Yield model</span></nav><span>EXPERIMENTAL MODEL</span></header>
    <section className="hero"><div><div className="eyebrow">FAOSTAT TRAINED · NATIONAL SCALE</div><h1>Crop yield history, made explorable</h1><p>Explore an experimental estimate for next year’s national crop yield, based on FAO reported history. This adds broad context to rotation research; it does not predict a field’s harvest.</p></div><div className="hero-badge">Research use only</div></section>
    <div className="content">
      <div className="banner"><b>Scope:</b> National yield trends only. The training data has no crop sequence, field soil, irrigation, or farm management labels, so the model cannot estimate the effect of a rotation or recommend a field-specific crop.</div>
      <section className="grid">
        <article className="card"><span className="tag">TRY AN ESTIMATE</span><h2>Select a country and crop</h2><p className="sub">The estimate is in tonnes per hectare (t/ha), for the year after the latest reported observation available for that country and crop.</p>
          <form onSubmit={estimate}>
            <div className="row"><div className="field"><label htmlFor="yield-country">Country</label><select id="yield-country" value={country} onChange={e=>{const code=e.target.value;setCountry(code);const next=options?.crops.filter(x=>options.crop_codes_by_country?.[code]?.includes(x.code))||[];setCrop(next.find(x=>x.name.toLowerCase().includes("rice"))?.code||next[0]?.code||"");setResult(null);}} disabled={!options}>{options?.countries.map(x=><option key={x.code} value={x.code}>{x.name}</option>)}</select></div><div className="field"><label htmlFor="yield-crop">Crop</label><select id="yield-crop" value={crop} onChange={e=>setCrop(e.target.value)} disabled={!options||availableCrops.length===0}>{availableCrops.map(x=><option key={x.code} value={x.code}>{x.name}</option>)}</select></div></div>
            <button className="btn" disabled={busy||!options}>{busy?"Estimating…":"Estimate national yield"}</button>
          </form>
          {error&&<p className="error" role="alert">{error}</p>}
          {result&&<div className="recommendations" aria-live="polite"><span className="tag">{result.country} · {result.crop} · {result.target_year}</span><div className="stats"><div className="stat"><b>{result.estimated_yield_t_ha}</b><span>Model estimate · t/ha</span></div><div className="stat"><b>{result.baseline_estimate_t_ha}</b><span>Simple prior-year baseline · t/ha</span></div><div className="stat"><b>{result.validation_mae_t_ha}</b><span>Held-out model MAE · t/ha</span></div></div><p className="sub" style={{marginTop:14}}>{result.interpretation}</p>{!result.beats_baseline&&<div className="banner">On the held-out years, this model’s average error was higher than the simple prior-year baseline. Treat the estimate as exploratory and compare it with the reported history.</div>}
            <h3>Recent reported yields</h3><div style={{display:"grid",gap:7,marginTop:12}}>{result.recent_history.map(row=><div key={row.year} style={{display:"grid",gridTemplateColumns:"44px 1fr 64px",gap:8,alignItems:"center",fontSize:12}}><span>{row.year}</span><div style={{height:12,background:"#edf2ed",borderRadius:8,overflow:"hidden"}}><div style={{height:"100%",width:`${Math.max(2,row.yield_t_ha/maxValue*100)}%`,background:"#1f6247",borderRadius:8}} /></div><b>{row.yield_t_ha} t/ha</b></div>)}</div>
          </div>}
        </article>
        <article className="card"><span className="tag">HOW IT WORKS</span><h2>Trained on past national yields</h2><p className="sub">The regression model uses country, crop, year, the previous year’s yield, and a recent-yield average. It learned from FAOSTAT annual crop-yield observations and was evaluated on later years it did not train on.</p>
          {metrics&&<div className="stats"><div className="stat"><b>{metrics.training_rows.toLocaleString()}</b><span>Training records · {metrics.training_years[0]}–{metrics.training_years[1]}</span></div><div className="stat"><b>{metrics.test_rows.toLocaleString()}</b><span>Held-out records · {metrics.test_years[0]}–{metrics.test_years[1]}</span></div><div className="stat"><b>{metrics.countries} / {metrics.crops}</b><span>Countries / crops represented</span></div></div>}
          {metrics&&<div className="banner">Held-out MAE: {metrics.mae_t_ha} t/ha. Prior-year baseline MAE: {metrics.persistence_baseline_mae_t_ha} t/ha. {metrics.beats_persistence_baseline?"The model outperformed this simple baseline on the held-out set.":"The model did not outperform this simple baseline on the held-out set."}</div>}
          <p className="sub">The holdout uses the latest five data years available in the downloaded source. Performance varies by crop and country; the overall score is not a guarantee for an individual selection.</p>
          <p><a href="https://www.fao.org/faostat/en/#data/QCL" target="_blank" rel="noreferrer">FAOSTAT: Crops and livestock products ↗</a></p>
        </article>
      </section>
      <section className="card format-card"><h2>How this fits TerraRotate</h2><p className="sub">Use this as a separate regional context panel while reviewing crop options. It currently does not change TerraRotate’s rule-based rotation ranking because FAOSTAT does not say which preceding crop, soil, or management practice produced each yield observation.</p><p className="sub">To train a genuine rotation-effect model, the next data need is multi-season field or trial records that connect crop sequences to yields, locations, and management, followed by location-separated validation.</p></section>
      <footer className="foot">Data: FAOSTAT QCL, accessed 15 Nov 2026. Annual national yield statistics are observational and can be revised. The displayed estimate is not a farm forecast or agronomic recommendation. TerraRotate AI is independent; FAO and NASA do not endorse it.</footer>
    </div>
  </main>;
}
