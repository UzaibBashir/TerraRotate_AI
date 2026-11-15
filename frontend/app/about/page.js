export const metadata = {
  title: "About TerraRotate AI",
  description: "Learn about TerraRotate AI, the farmer-led crop-rotation decision-support prototype and the al-Uzma team.",
};

const pillars = [
  ["Understand the field", "Start with a location, current crop, water availability, priorities and optional farmer-entered soil context."],
  ["Bring evidence together", "See NASA POWER climate and water-cycle context alongside NASA GIBS visual layers from MODIS, VIIRS, GPM IMERG and SMAP."],
  ["Explain the options", "Compare transparent crop-rotation baselines and explore focused tools for water, vegetation, climate analogues and farmer feedback."],
];

const teamWork = [
  ["Learn", "We study the available NASA resources, crop-rotation methods and evidence limits before turning them into product decisions."],
  ["Teach", "We translate technical data into plain-language explanations, visible assumptions and reports that farmers can inspect."],
  ["Build", "We connect the Next.js interface, Flask API and research tools into a practical prototype that keeps uncertainty visible."],
];

const featureGuide = [
  ["Field overview", "The home page is the main workflow. Enter a field name, coordinates, current crop, water availability and planning priority. Load one of the sample regions to see the experience immediately, or save your own field in this browser. The optional boundary tools accept GeoJSON or coordinates copied from Google Maps and estimate the area."],
  ["Climate and rotation report", "Run the field analysis to retrieve NASA POWER daily temperature and precipitation context. The report compares transparent three-season crop rotations, explains the strongest trade-offs and shows the values and coverage used. Treat the ranking as a conversation starter, not a guaranteed harvest forecast."],
  ["NASA map", "Use the map controls to choose a date, layer and location. MODIS and VIIRS show regional imagery or vegetation context; GPM IMERG shows estimated precipitation; SMAP shows broad surface-moisture context. These are browse visualizations and their colors are not converted into field measurements."],
  ["Analysis tools", "Open Analysis tools for farmer-readable image descriptions and seven input-driven modules: vegetation patterns, water-budget scenarios, possible low-vegetation windows, historical climate analogues, sample-point clustering, farmer feedback and rotation-ranking sensitivity. Replace the synthetic examples with your own sourced values before interpreting a result."],
  ["Rotation research", "The research page contains a separate FAOSTAT-trained national yield model and a proposed crop-outcome modeling plan. It helps explore historical national yield context, but it does not know a field’s soil, management or crop sequence and is not used for field recommendations."],
  ["Data sources", "The Data sources page explains which NASA and partner resources are connected, what each resource contributes, the downloadable sample files and where coverage or missingness limits interpretation."],
];

const limitations = [
  "The current rotation rules are an explainable baseline, not a locally validated agronomic model.",
  "NASA POWER grids and NASA GIBS browse images are regional or coarse compared with many individual farms.",
  "Satellite images are visual context only; the application does not diagnose crop health or extract measurements from image colors.",
  "Demo fields, sample values and the illustrative crop catalog need replacement or local review before real decisions.",
  "The yield experiment is national-scale and historical. It is not a field-level yield forecast.",
  "Browser-saved fields and feedback are local to the device unless a team-configured Supabase project is enabled.",
  "Public deployment, broader field-outcome validation and some candidate resource integrations remain future work.",
];

const roadmap = [
  ["Validate with farmers", "Test the explanations and rotation priorities with growers and agronomists in different regions, then refine crop profiles and decision rules."],
  ["Connect stronger local evidence", "Add carefully selected soil, weather, water and field-history integrations with clear provenance, units, coverage and consent."],
  ["Evaluate outcomes", "Compare recommendations with real field outcomes and expert review before making stronger performance claims."],
  ["Improve access and collaboration", "Harden deployment, add secure accounts and sharing, support more languages and improve accessibility for different devices and connectivity levels."],
];

export default function About() {
  return <main className="shell">
    <header className="topbar">
      <a className="brand" href="/">◒ TERRAROTATE AI</a>
      <nav className="nav">
        <a href="/">Field overview</a>
        <a href="/tools">Analysis tools</a>
        <a href="/model">Rotation research</a>
        <span>About</span>
      </nav>
      <div className="topbar-actions"><a className="nav-sources" href="/sources">Data sources</a><span>OUR PROJECT</span></div>
    </header>

    <section className="hero about-hero">
      <div>
        <div className="eyebrow">ABOUT TERRAROTATE AI</div>
        <h1>Better farm decisions start with better questions.</h1>
        <p>TerraRotate AI is a farmer-led prototype for exploring climate-aware crop-rotation choices with evidence that is understandable, inspectable and honest about its limits.</p>
      </div>
      <div className="hero-badge">Explainable decision support</div>
    </section>

    <section className="content about-content">
      <section className="about-intro">
        <div>
          <span className="tag">THE BIG IDEA</span>
          <h2>Make complex Earth and climate data useful at field level.</h2>
        </div>
        <p>Farm planning is local, but the strongest public datasets are often regional or global. TerraRotate puts those datasets beside the farmer’s own context instead of pretending that a satellite image or a coarse grid can replace local knowledge. The result is a starting point for discussion: a clear comparison of possible rotations, the evidence behind it and the checks still needed in the field.</p>
      </section>

      <section className="about-grid">
        {pillars.map(([title, text], index) => <article className="card about-card" key={title}>
          <span className="step-number">{index + 1}</span>
          <h2>{title}</h2>
          <p className="sub">{text}</p>
        </article>)}
      </section>

      <section className="card about-section">
        <span className="tag">HOW THE APPLICATION WORKS</span>
        <h2>From field context to an explainable plan</h2>
        <div className="about-process">
          <div><b>01 · Describe</b><p>Choose a field or sample location, record the current crop, water availability and planning priority, then add a boundary or soil context if you have it.</p></div>
          <div><b>02 · Compare</b><p>The app combines farmer inputs with live NASA POWER climate context and transparent rotation rules to rank possible three-season sequences.</p></div>
          <div><b>03 · Investigate</b><p>Use analysis tools to explore water budgets, supplied vegetation values, historical climate analogues, sample-point patterns and subjective feedback.</p></div>
          <div><b>04 · Verify</b><p>Read the sources, missingness and limitations, then confirm important observations with local measurements and agronomic expertise.</p></div>
        </div>
      </section>

      <section className="card about-section about-guide">
        <span className="tag">EXPLORATION GUIDE</span>
        <h2>How to explore TerraRotate AI</h2>
        <p className="sub">You can browse without an account. Start with a demo, then replace each illustrative input with evidence from your own field.</p>
        <div className="feature-guide">{featureGuide.map(([title, text]) => <details key={title}>
          <summary>{title}</summary>
          <p>{text}</p>
        </details>)}</div>
      </section>

      <section className="about-split">
        <article className="card about-section">
          <span className="tag">OUR TEAM</span>
          <h2>al-Uzma</h2>
          <p className="sub">Learn · Teach · Build</p>
          <p>We are a team bringing together research, communication and software building to explore how open Earth-observation resources can support more thoughtful farm planning. We designed TerraRotate as a learning prototype: useful enough to explore, but careful enough to show where evidence ends.</p>
          <div className="team-list">{teamWork.map(([title, text]) => <div key={title}><b>{title}</b><span>{text}</span></div>)}</div>
        </article>
        <article className="card about-section">
          <span className="tag">WHAT WE BELIEVE</span>
          <h2>Useful does not have to mean overconfident.</h2>
          <p className="sub">The application is designed around a few commitments:</p>
          <ul className="about-list">
            <li>Show the source and scope of each important dataset.</li>
            <li>Keep visual browse imagery separate from numeric analysis.</li>
            <li>Report missing observations instead of filling them silently.</li>
            <li>Make assumptions and comparison rules visible.</li>
            <li>Leave the final decision with farmers and their advisers.</li>
          </ul>
        </article>
      </section>

      <section className="about-split">
        <article className="card about-section about-boundary">
          <span className="tag">LIMITATIONS</span>
          <h2>Use the results with care</h2>
          <p className="sub">Knowing what the prototype cannot establish is part of using it well.</p>
          <ul className="about-list">{limitations.map(item => <li key={item}>{item}</li>)}</ul>
        </article>
        <article className="card about-section about-future">
          <span className="tag">WHAT COMES NEXT</span>
          <h2>How we plan to improve it</h2>
          <div className="roadmap">{roadmap.map(([title, text]) => <div key={title}><b>{title}</b><p>{text}</p></div>)}</div>
        </article>
      </section>

      <section className="card about-section about-boundary">
        <span className="tag">A PROTOTYPE, NOT A PROMISE</span>
        <h2>Make the next decision locally</h2>
        <p>TerraRotate is designed to help you ask better questions and identify what to verify next. It does not diagnose crop disease, claim field-level sensor precision, guarantee yield, or replace local agronomic advice. Check important conclusions with local measurements and a qualified agricultural adviser.</p>
        <div className="about-links"><a className="btn" href="/">Explore your field</a><a className="btn secondary" href="/sources">Read our data sources</a></div>
      </section>

      <footer className="foot">TerraRotate AI is an independent prototype by al-Uzma. NASA and the other data providers do not endorse its recommendations.</footer>
    </section>
  </main>;
}
