import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const workspaceDir = "C:/Users/uzbi6/Desktop/Vault/TerraRotate_AI";
const SKILL_DIR = "C:/Users/uzbi6/.codex/plugins/cache/openai-primary-runtime/presentations/26.1112.11217/skills/presentations";
const RUNTIME_PYTHON = "C:/Users/uzbi6/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe";
process.env.RUNTIME_NODE_MODULES = "C:/Users/uzbi6/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules";
const buildDir = path.join(workspaceDir, ".presentation_build");
const outputDir = path.join(workspaceDir, "demo/presentation");
const FINAL_PPTX = path.join(outputDir, "TerraRotate_AI_challenge_demo_v2.pptx");
const candidatePath = path.join(buildDir, "candidate.pptx");
const W=1280,H=720;
const C={paper:"#F4F7F1",ink:"#19352B",green:"#275B43",green2:"#548063",lime:"#D7EA91",white:"#FFFFFF",muted:"#66756E",line:"#DCE5DC",pale:"#EAF0E8",rust:"#AE604E"};
const presentation=Presentation.create({slideSize:{width:W,height:H}});

function rect(slide,x,y,w,h,fill,r=16,stroke="none"){
  return slide.shapes.add({geometry:r?"roundRect":"rect",name:"surface",position:{left:x,top:y,width:w,height:h},fill,line:{style:"solid",fill:stroke,width:stroke==="none"?0:1},borderRadius:r?"rounded-2xl":undefined});
}
function text(slide,value,x,y,w,h,size,color=C.ink,bold=false,opts={}){
  const shape=slide.shapes.add({geometry:"textbox",name:"text",position:{left:x,top:y,width:w,height:h},fill:"none",line:{style:"solid",fill:"none",width:0}});
  shape.text=value;
  shape.text.style={typeface:"Arial",fontSize:size,color,bold,alignment:opts.align||"left",verticalAlignment:opts.valign||"middle",autoFit:"shrinkText",wrap:true};
  return shape;
}
function base(title,kicker="TERRAROTATE AI · FIELD SHIFT"){
  const s=presentation.slides.add(); s.background.fill=C.paper;
  text(s,kicker.toUpperCase(),72,30,820,22,12,C.green2,true);
  text(s,title,72,60,1135,62,34,C.ink,true);
  rect(s,72,132,58,5,C.lime,0);
  text(s,"al-Uzma · Learn · Teach · Build",72,674,700,18,11,C.muted,false);
  text(s,String(presentation.slides.items.length).padStart(2,"0"),1170,674,38,18,11,C.muted,true,{align:"right"});
  return s;
}
function note(slide,content){slide.speakerNotes.text=content;}
function pill(slide,label,x,y,w,color=C.pale,textColor=C.green){rect(slide,x,y,w,28,color,14);text(slide,label,x+10,y,w-20,28,12,textColor,true);}

// 1 — identity and problem framing
{
  const s=presentation.slides.add();s.background.fill=C.green;
  rect(s,815,0,465,720,"#214A38",0);rect(s,1002,0,278,720,"#2C6047",0);
  rect(s,72,72,62,6,C.lime,0);
  text(s,"TERRAROTATE AI",72,112,760,68,42,C.white,true);
  text(s,"Crop-rotation choices\nwith climate evidence in view",72,205,740,150,40,C.white,true);
  text(s,"An explainable, farmer-led prototype for the NASA Space Apps Challenge 2026 — Field Shift.",76,390,630,82,20,"#D6E4DA",false);
  pill(s,"NASA data · farmer context · visible limits",76,512,365,"#D7EA91",C.ink);
  text(s,"KASHMIR EXAMPLE · GLOBAL LOCATION INPUT",76,653,570,18,12,"#D6E4DA",true);
  text(s,"01",1146,653,58,22,13,C.white,true,{align:"right"});
  note(s,"Project and challenge context: https://www.spaceappschallenge.org/2026/challenges/adapting-farms-with-nasa-data/ . Team name is provided in the project brief. Default Kashmir coordinates are illustrative, not a verified farm.");
}

// 2 — user need
{
  const s=base("Farm decisions need local context");
  text(s,"A rotation choice depends on more than a satellite layer.",72,157,1080,42,23,C.green,true);
  const items=[
    ["Weather context","Temperature and rainfall vary across seasons and places."],
    ["Field knowledge","Soil, water access, planting windows and crop history come from the farmer."],
    ["Clear trade-offs","Options should show why they rank and what evidence is missing."],
  ];
  items.forEach((it,i)=>{const x=72+i*378;rect(s,x,236,350,242,C.white,18,C.line);rect(s,x,236,350,8,i===1?C.lime:C.green2,4);text(s,`0${i+1}`,x+24,270,48,25,14,C.green2,true);text(s,it[0],x+24,310,300,34,22,C.ink,true);text(s,it[1],x+24,360,300,78,17,C.muted,false);});
  rect(s,72,522,1136,86,C.pale,14);text(s,"TerraRotate supports farmer judgment; it does not diagnose disease or predict yield.",96,542,1080,44,19,C.green,true);
  note(s,"Challenge objective and project constraints are summarized from the official Field Shift page and master project brief: https://www.spaceappschallenge.org/2026/challenges/adapting-farms-with-nasa-data/ .");
}

// 3 — NASA resources and evidence boundary
{
  const s=base("NASA data in the prototype");
  rect(s,72,164,548,410,C.white,18,C.line);rect(s,660,164,548,410,C.white,18,C.line);
  pill(s,"NUMERIC CONTEXT",96,188,152,C.pale,C.green);text(s,"NASA POWER",96,235,460,38,26,C.ink,true);
  text(s,"Daily climate and water-cycle parameters",96,286,455,32,17,C.green,true);
  text(s,"T2M · PRECTOTCORR · SFMC · RZMC · EVPTRNS\nMonthly T2M and precipitation for historical climate analogues.",96,333,455,94,16,C.muted,false);
  text(s,"Nearest grid point. Parameter grids differ; missing values stay missing. Evapotranspiration energy is not converted into water depth.",96,454,455,86,14,C.muted,false);
  pill(s,"VISUAL CONTEXT",684,188,152,C.pale,C.green);text(s,"NASA GIBS",684,235,460,38,26,C.ink,true);
  text(s,"MODIS · VIIRS · GPM IMERG · SMAP",684,286,470,32,17,C.green,true);
  text(s,"Browse maps show regional products and dates. The application does not decode their colors into NDVI, rainfall, or field soil moisture.",684,333,455,95,16,C.muted,false);
  text(s,"The map’s native product grid and footprint limit what can be inferred about a small field.",684,454,455,86,14,C.muted,false);
  text(s,"NASA POWER daily and monthly APIs · NASA GIBS browse layers",72,597,1120,45,13,C.muted,false);
  note(s,"NASA POWER daily and monthly API docs: https://power.larc.nasa.gov/docs/services/api/temporal/daily/ and https://power.larc.nasa.gov/docs/services/api/temporal/monthly/ . NASA POWER hydrology methodology: https://power.larc.nasa.gov/docs/methodology/data/sources_hydrology/ . NASA GIBS API docs: https://nasa-gibs.github.io/gibs-api-docs/access-basics/ . Challenge resource register: https://www.spaceappschallenge.org/2026/challenges/adapting-farms-with-nasa-data/?tab=resources .");
}

// 4 — eight modules
{
  const s=base("Eight connected analysis tools");
  const modules=[
    ["01","Field signal","Sourced NDVI patterns"],["02","Water budget","NASA context + farmer plan"],["03","Rotation engine","Weighted 3-season rules"],["04","Bare windows","Possible low vegetation"],
    ["05","Climate twins","Historical POWER analogues"],["06","Sample zones","Measured points only"],["07","Farmer memory","Browser / optional Supabase"],["08","RotationRisk","Ranking sensitivity"],
  ];
  modules.forEach((m,i)=>{const col=i%4,row=Math.floor(i/4),x=72+col*288,y=173+row*196;rect(s,x,y,262,155,C.white,16,C.line);text(s,m[0],x+18,y+17,42,24,13,C.green2,true);text(s,m[1],x+18,y+55,225,32,18,C.ink,true);text(s,m[2],x+18,y+96,225,40,13,C.muted,false);});
  text(s,"Inputs keep their source, resolution and limits attached.",72,590,1050,34,18,C.green,true);
  note(s,"The eight module summaries describe implemented baseline services. Method definitions and scientific limitations: repository docs/methodology.md and docs/model_evaluation.md. NASA and partner resource attribution is in https://www.spaceappschallenge.org/2026/challenges/adapting-farms-with-nasa-data/?tab=resources .");
}

// 5 — honest workflow diagram in lieu of unverified screenshot
{
  const s=base("Workflow: evidence to farmer review");
  const steps=[
    ["1","Field context","Location · crop · water · soil"],
    ["2","NASA evidence","POWER values · GIBS maps"],
    ["3","Explainable tools","Rotation · water · analogues"],
    ["4","Farmer review","Check locally · decide"],
  ];
  steps.forEach((it,i)=>{const x=72+i*286;rect(s,x,229,244,190,i===3?"#E7EFD7":C.white,18,C.line);rect(s,x+22,250,36,36,i===3?C.lime:C.pale,18);text(s,it[0],x+22,250,36,36,14,C.green,true,{align:"center"});text(s,it[1],x+22,301,205,34,20,C.ink,true);text(s,it[2],x+22,353,205,48,14,C.muted,false);if(i<3){rect(s,x+252,316,26,3,C.green2,0);}}
  );
  rect(s,72,468,1136,102,"#FFF8E9",14,"#E8D8B9");text(s,"Deck screenshot step",94,485,260,25,14,C.rust,true);text(s,"Replace this workflow panel with genuine captures of / and /tools from the running team demo before competition submission.",94,520,1070,34,16,C.ink,false);
  note(s,"This is an editable workflow diagram, not a screenshot. Authentic interface captures remain to be inserted by the team after launching the demo. The application's run instructions are in README.md; the local screenshot helper timed out during this preparation.");
}

// 6 — uncertainty and RotationRisk
{
  const s=base("RotationRisk explains trade-offs, not certainty");
  const x0=72,y0=183;
  text(s,"Three ranked alternatives",x0,y0,500,32,22,C.ink,true);
  ["Current crop continued","Alternative rotation","Alternative rotation"].forEach((label,i)=>{const y=238+i*90;rect(s,x0,y,500,68,C.white,12,C.line);pill(s,String.fromCharCode(65+i),x0+16,y+19,40,i===0?C.pale:"#EEF2E9",C.green);text(s,label,x0+78,y+16,390,38,17,C.ink,true);});
  rect(s,652,183,556,330,C.green,18);text(s,"What changes the ranking?",680,212,490,33,22,C.white,true);
  const factors=[["Water availability",.35],["Crop diversity",.25],["Legume practice proxy",.20],["Farmer priority",.20]];
  factors.forEach((f,i)=>{const y=275+i*47;text(s,f[0],680,y,230,24,14,"#E2EBE4",false);rect(s,930,y+8,210,9,"#406A53",5);rect(s,930,y+8,210*f[1]/.35,9,C.lime,5);});
  text(s,"Sensitivity is shown across four priority presets.",680,464,470,26,14,"#E2EBE4",false);
  rect(s,72,530,1136,74,C.pale,14);text(s,"Confidence: Insufficient evidence for a reliable confidence estimate.",94,548,1090,37,18,C.green,true);
  note(s,"Rotation scores and sensitivity methods are described in docs/methodology.md and docs/model_evaluation.md. The numeric weight bars on this slide represent the documented default weights (0.35 water, 0.25 diversity, 0.20 legume practice proxy, 0.20 preference); they are not validated effect sizes. No crop yields, probability or model confidence is presented.");
}

// 7 — outcome and remaining work
{
  const s=base("Working prototype, clear next steps");
  const left=["32 backend tests pass","NASA POWER water and monthly endpoints checked live","GIBS sample maps bundled","Seven analysis tools connect to Flask routes"];
  const right=["Add real app screenshots","Configure and verify Supabase","Select authenticated NASA granules by product/region/date","Complete agronomic review, public deploy and team submission"];
  rect(s,72,173,535,355,C.white,18,C.line);rect(s,673,173,535,355,C.white,18,C.line);
  text(s,"Ready in this repository",98,198,480,34,20,C.green,true);text(s,"Team follow-up",699,198,470,34,20,C.rust,true);
  left.forEach((v,i)=>{const y=259+i*59;rect(s,100,y+7,11,11,C.green2,6);text(s,v,123,y,445,36,15,C.ink,false);});
  right.forEach((v,i)=>{const y=259+i*59;rect(s,701,y+7,11,11,C.rust,6);text(s,v,724,y,445,40,15,C.ink,false);});
  text(s,"TerraRotate AI · al-Uzma (Learn · Teach · Build)",72,574,1080,32,18,C.ink,true);
  text(s,"Independent challenge prototype · NASA does not endorse the project",72,614,1110,25,13,C.muted,false);
  note(s,"Current test result: 31 automated backend tests pass. NASA POWER live hydrology and monthly data request checks were made on 14 Nov 2026. The global sample bundle contains small dated examples, not complete archives. Remaining actions and criteria are in docs/implementation_status.md. Official resources register: https://www.spaceappschallenge.org/2026/challenges/adapting-farms-with-nasa-data/?tab=resources . SI disclosure draft: docs/si_disclosure.md .");
}

await fs.mkdir(buildDir,{recursive:true}); await fs.mkdir(outputDir,{recursive:true});
for (let i=0;i<presentation.slides.items.length;i++) {
  const slide=presentation.slides.items[i];
  const png=await presentation.export({slide,format:"png",scale:1});
  await fs.writeFile(path.join(buildDir,`slide-${String(i+1).padStart(2,"0")}.png`),new Uint8Array(await png.arrayBuffer()));
}
await (await PresentationFile.exportPptx(presentation)).save(candidatePath);
const {finalizePresentation}=await import(pathToFileURL(path.join(SKILL_DIR,"container_tools/artifact_tool_utils.mjs")).href);
const result=await finalizePresentation({
  explicitTotalSlideCount:7,
  requiredNativeTableOwnerSlides:[],
  requiredNativeChartOwnerSlides:[],
  workspaceDir,candidatePath,finalPath:FINAL_PPTX,
  pythonExecutable:RUNTIME_PYTHON,
  integrityValidatorPath:path.join(SKILL_DIR,"container_tools/inspect_presentation_package_integrity.py"),
  layoutValidatorPath:path.join(SKILL_DIR,"container_tools/inspect_presentation_layout_geometry.py"),
  layoutArgs:["--expected-slide-size-emu","12192000,6858000","--validate-bullet-geometry","--validate-heading-fit"],
  fontPolicy:{basis:"design",families:["Arial"]},
  verifyArtifactToolImport:true,
  receiptPath:path.join(buildDir,"TerraRotate_AI_challenge_demo_v2.validation.json"),
});
console.log(JSON.stringify({finalPath:FINAL_PPTX,slides:presentation.slides.items.length,result},null,2));
