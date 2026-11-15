"use client";
import { useEffect, useRef, useState } from "react";
import { getMapBounds, parseBoundaryGeoJSON, projectCoordinate } from "./field-utils.mjs";
import { API } from "./api-config.mjs";

const CROPS = [["potato","Potato"],["rice","Rice"],["maize","Maize"],["wheat","Wheat"],["mustard","Mustard"],["pea","Field pea"]];
const MAP_GUIDES = {
  modis_ndvi:{label:"Plant cover · Terra MODIS",description:"This image estimates how green and active plant cover is across the landscape. It can help you compare broad changes over time around your field.",reading:"Use the NASA legend to compare colors for this date. More green often means more active vegetation, but crop type, season, bare soil, clouds, and the map’s pixel size affect what you see."},
  viirs_ndvi:{label:"Plant cover · VIIRS",description:"This image estimates how green and active plant cover is across the landscape. VIIRS gives a broad regional view that can be useful for noticing seasonal patterns.",reading:"Use the NASA legend to compare colors for this date. More green often means more active vegetation, but crop type, season, bare soil, clouds, and the map’s pixel size affect what you see."},
  modis_terra:{label:"Satellite photo · Terra MODIS",description:"This is a satellite view of the land around your selected point. It shows broad landscape features such as fields, towns, water, and vegetation where the image is clear.",reading:"Treat it like a regional photo. Clouds, haze, season, and the map’s resolution can hide details; color alone does not tell you whether a crop is healthy."},
  modis_aqua:{label:"Satellite photo · Aqua MODIS",description:"This is a satellite view of the land around your selected point. It shows broad landscape features such as fields, towns, water, and vegetation where the image is clear.",reading:"Treat it like a regional photo. Clouds, haze, season, and the map’s resolution can hide details; color alone does not tell you whether a crop is healthy."},
  viirs_snpp:{label:"Satellite photo · VIIRS",description:"This is a satellite view of the land around your selected point. It shows broad landscape features such as fields, towns, water, and vegetation where the image is clear.",reading:"Treat it like a regional photo. Clouds, haze, season, and the map’s resolution can hide details; color alone does not tell you whether a crop is healthy."},
  imerg_precipitation:{label:"Rainfall estimate · GPM IMERG",description:"This layer shows estimated rainfall rate from satellite observations around the selected date. It is useful for seeing regional rain patterns.",reading:"Rainfall rate is not the same as total rain received by your field. Check local rain gauges or weather records for farm decisions; the map may be coarse or have gaps."},
  smap_surface_moisture:{label:"Surface moisture estimate · SMAP",description:"This layer estimates moisture in the upper soil across a broad area. It can give background context about wetter or drier conditions around your location.",reading:"The map covers areas much larger than a typical field and is not a soil test or a sensor reading from your land. Do not use its colors to judge the moisture of one field."}
};
const IMAGE_METADATA = {
  modis_terra:{id:"MODIS_Terra_CorrectedReflectance_TrueColor",product:"Terra MODIS Corrected Reflectance (True Color)",resolution:"250 m visualization layer",cadence:"Daily corrected-reflectance browse image; cloud and coverage vary by date"},
  modis_aqua:{id:"MODIS_Aqua_CorrectedReflectance_TrueColor",product:"Aqua MODIS Corrected Reflectance (True Color)",resolution:"250 m visualization layer",cadence:"Daily corrected-reflectance browse image; cloud and coverage vary by date"},
  viirs_snpp:{id:"VIIRS_SNPP_CorrectedReflectance_TrueColor",product:"Suomi NPP VIIRS Corrected Reflectance (True Color)",resolution:"500 m visualization layer",cadence:"Daily corrected-reflectance browse image; cloud and coverage vary by date"},
  modis_ndvi:{id:"MODIS_Terra_NDVI_8Day",product:"Terra MODIS 8-day NDVI",resolution:"Product grid; see NASA layer metadata",cadence:"8-day vegetation-index composite"},
  viirs_ndvi:{id:"VIIRS_SNPP_NDVI_8Day",product:"Suomi NPP VIIRS 8-day NDVI",resolution:"500 m-class global product grid; browse image only",cadence:"8-day composite; select a composite date"},
  imerg_precipitation:{id:"IMERG_Precipitation_Rate",product:"GPM IMERG precipitation rate",resolution:"0.1 degree source grid; daily browse visualization",cadence:"Date-specific precipitation-rate browse image; product accumulation period may differ"},
  smap_surface_moisture:{id:"SMAP_L4_Analyzed_Surface_Soil_Moisture",product:"SMAP L4 analyzed surface soil moisture",resolution:"9 km source product; browse visualization",cadence:"Date-specific browse image; temporal coverage can vary by product"}
};
const DEMO_FIELDS = [
  {id:"demo-iowa",name:"Demo field · Iowa, USA",latitude:42.0300,longitude:-93.6200,current_crop:"maize",water_availability:"abundant",priority:"balanced",soil_texture:"Loam",soil_ph:"6.5",organic_matter:"3.0",boundary_geojson:{type:"Polygon",coordinates:[[[-93.626,42.027],[-93.614,42.027],[-93.614,42.033],[-93.626,42.033],[-93.626,42.027]]]}},
  {id:"demo-beauce",name:"Demo field · Beauce, France",latitude:48.2000,longitude:1.6000,current_crop:"wheat",water_availability:"limited",priority:"water",soil_texture:"Silty loam",soil_ph:"7.1",organic_matter:"2.0",boundary_geojson:{type:"Polygon",coordinates:[[[1.594,48.197],[1.606,48.197],[1.606,48.203],[1.594,48.203],[1.594,48.197]]]}},
  {id:"demo-parana",name:"Demo field · Paraná, Brazil",latitude:-24.9500,longitude:-53.4500,current_crop:"maize",water_availability:"moderate",priority:"soil",soil_texture:"Clay loam",soil_ph:"5.8",organic_matter:"2.5",boundary_geojson:{type:"Polygon",coordinates:[[[-53.456,-24.953],[-53.444,-24.953],[-53.444,-24.947],[-53.456,-24.947],[-53.456,-24.953]]]}}
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
  const body = await response.text();
  let value;
  try { value = JSON.parse(body); }
  catch {
    const error = new Error(`The API returned a web page instead of report data (HTTP ${response.status}).`);
    error.isHtmlResponse = /^\s*(<!doctype\s+html|<html)/i.test(body) || response.headers.get("content-type")?.includes("text/html");
    throw error;
  }
  if (!response.ok) throw new Error(value.error || fallback);
  return value;
}

function blobAsBase64(blob) {
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(String(reader.result||"").split(",")[1]||"");
    reader.onerror=()=>reject(new Error("Could not prepare this image for explanation."));
    reader.readAsDataURL(blob);
  });
}

function fallbackImageReport({lat,lon,layer,date,zoom,climate}) {
  const meta=IMAGE_METADATA[layer]||IMAGE_METADATA.modis_terra;
  const pointLat=Number(lat),pointLon=Number(lon),bounds=getMapBounds(pointLat,pointLon,zoom);
  const row=climate?.rows?.find(item=>String(item.date).replaceAll("-","")===date.replaceAll("-",""));
  const dailyValues=[
    ["T2M","Mean air temperature",row?.temperature_c,"°C"],
    ["PRECTOTCORR","Daily precipitation",row?.precipitation_mm_day,"mm/day"],
    ["SFMC","Surface soil moisture",null,"m³/m³"],
    ["RZMC","Root-zone soil moisture",null,"m³/m³"],
    ["EVPTRNS","Evapotranspiration energy",null,"MJ/m²/day"]
  ];
  return {
    image:{provider:"NASA Global Imagery Browse Services (GIBS)",layer_key:layer,product:meta.product,layer_id:meta.id,nominal_resolution:meta.resolution,cadence:meta.cadence,date,zoom,
      coordinates:{latitude:pointLat,longitude:pointLon},bounds,image_dimensions:{width:900,height:600},pixel_values_available:false,
      pixel_values_note:"This is a rendered browse image. The hosted report service is not yet available, so raw pixel science values cannot be extracted from this picture."},
    readings:dailyValues.map(([parameter,label,value,unit])=>({parameter,label,value:value??null,unit,status:value==null?"unavailable":"available",source:"NASA POWER"})),
    reading_note:row?"Temperature and rainfall are separate NASA POWER daily estimates for this date and the nearest grid point. Moisture and evapotranspiration values need the updated report service. None of these values are read from image colors.":"The currently available climate endpoint does not include this image date. Numeric readings are shown as unavailable rather than estimated."
  };
}

export default function Home() {
  const [lat,setLat]=useState("42.0300"), [lon,setLon]=useState("-93.6200");
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
  const [availableDates,setAvailableDates]=useState([]), [datesBusy,setDatesBusy]=useState(true);
  const [imageryBusy,setImageryBusy]=useState(false);
  const [imageAnalysisAvailable,setImageAnalysisAvailable]=useState(null), [imageAnalysisBusy,setImageAnalysisBusy]=useState(false);
  const [imageDescription,setImageDescription]=useState(""), [imageDescriptionError,setImageDescriptionError]=useState(""), [imageDescriptionCaution,setImageDescriptionCaution]=useState("");
  const [imageReport,setImageReport]=useState(null), [reportBusy,setReportBusy]=useState(false), [reportError,setReportError]=useState("");
  const [legendUrl,setLegendUrl]=useState(""), [legendError,setLegendError]=useState(false);
  const [projection,setProjection]=useState(null), [projectionError,setProjectionError]=useState(""), [projectionBusy,setProjectionBusy]=useState(false);

  useEffect(()=>{try{setSavedFields(JSON.parse(localStorage.getItem("terrarotate_fields")||"[]"));}catch{setSavedFields([]);}},[]);
  useEffect(()=>{fetch(`${API}/intelligence/image-description/status`).then(r=>readJson(r,"Image explanation service unavailable")).then(data=>setImageAnalysisAvailable(Boolean(data.available))).catch(()=>setImageAnalysisAvailable(false));},[]);
  useEffect(()=>{
    let cancelled=false;
    setDatesBusy(true);setAvailableDates([]);setImageUrl("");setImageError("");setImageryBusy(true);
    fetch(`${API}/imagery/dates?layer=${encodeURIComponent(layer)}`).then(r=>readJson(r,"NASA GIBS dates unavailable")).then(data=>{
      if(cancelled)return;
      const dates=data.dates||[];setAvailableDates(dates);setDatesBusy(false);
      if(!dates.length){setImageryBusy(false);setImageError("NASA GIBS has no available dates for this layer.");return;}
      const selected=dates.includes(imageDate)?imageDate:dates[0];setImageDate(selected);
      setImageUrl(`${API}/imagery?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&layer=${encodeURIComponent(layer)}&date=${encodeURIComponent(selected)}&zoom=${zoom}`);
    }).catch(error=>{if(!cancelled){setDatesBusy(false);setImageryBusy(false);setImageError(error.message);}});
    return ()=>{cancelled=true;};
  },[layer]);

  useEffect(()=>{
    if(!imageUrl){setImageReport(null);setReportError("");setImageDescription("");setImageDescriptionError("");setImageDescriptionCaution("");return;}
    let cancelled=false;
    setReportBusy(true);setReportError("");
    const query=new URLSearchParams({lat,lon,layer,date:imageDate,zoom:String(zoom)});
    fetch(`${API}/imagery/report?${query}`).then(r=>readJson(r,"Image details are unavailable")).then(data=>{
      if(!cancelled)setImageReport(data);
    }).catch(async error=>{
      if(cancelled)return;
      if(error.isHtmlResponse){
        try{
          const climateData=await readJson(await fetch(`${API}/climate?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`),"Existing climate data is unavailable");
          if(!cancelled)setImageReport({...fallbackImageReport({lat,lon,layer,date:imageDate,zoom,climate:climateData}),report_notice:"The hosted report endpoint is not updated yet. Showing image details and any matching temperature and rainfall readings available from the existing climate service."});
        }catch(fallbackError){if(!cancelled)setReportError(fallbackError.message);}
      }else if(!cancelled)setReportError(error.message);
    }).finally(()=>{if(!cancelled)setReportBusy(false);});
    return ()=>{cancelled=true;};
  },[imageUrl]);

  const centerLat=Number(lat), centerLon=Number(lon);
  const bounds=Number.isFinite(centerLat)&&Number.isFinite(centerLon)?getMapBounds(centerLat,centerLon,zoom):getMapBounds(0,0,zoom);
  const mapGuide=MAP_GUIDES[layer]||MAP_GUIDES.modis_terra;
  const fieldReportDetails=[
    ["Field",fieldName||"Not provided"],
    ["Area",fieldArea?`${fieldArea} hectares`:"Not provided"],
    ["Latitude",lat||"Not provided"],
    ["Longitude",lon||"Not provided"],
    ["Current crop",CROPS.find(([value])=>value===crop)?.[1]||crop],
    ["Water available",({limited:"Limited",moderate:"Moderate",abundant:"Abundant"})[water]||water],
    ["Main priority",({balanced:"Balanced",water:"Conserve water",soil:"Support soil function",diversity:"Increase crop diversity"})[priority]||priority],
    ["Soil texture",soilTexture||"Not provided"],
    ["Soil pH",soilPh||"Not provided"],
    ["Organic matter",organicMatter?`${organicMatter}%`:"Not provided"]
  ];

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
    if(!point){setBoundaryError("Could not find coordinates. Paste a pair like 42.0300, -93.6200 or a Google Maps link that contains coordinates.");return;}
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
    setImageError("");setImageryBusy(true);setImageDescription("");setImageDescriptionError("");
    setImageUrl(`${API}/imagery?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&layer=${encodeURIComponent(layer)}&date=${encodeURIComponent(imageDate)}&zoom=${zoom}`);
    setLegendError(false);setLegendUrl(`${API}/imagery/legend?layer=${encodeURIComponent(layer)}`);
  }

  async function explainImage() {
    if(!imageUrl)return;
    setImageAnalysisBusy(true);setImageDescriptionError("");setImageDescription("");
    try{
      const imageResponse=await fetch(imageUrl);
      if(!imageResponse.ok)throw new Error("The satellite image could not be loaded for explanation.");
      const imageBlob=await imageResponse.blob();
      const image_data=await blobAsBase64(imageBlob);
      const context=`${mapGuide.label}; NASA layer ${layer}; date ${imageDate}; field ${fieldName}; location ${lat}, ${lon}; ${mapGuide.description}`;
      const data=await readJson(await fetch(`${API}/intelligence/image-description`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({image_data,mime_type:imageBlob.type||"image/png",image_kind:"nasa_satellite",context})}),"Image explanation unavailable");
      setImageDescription(data.description||"");
      setImageDescriptionCaution(data.caution||"");
    }catch(error){setImageDescriptionError(error.message||"Could not explain this image.");}
    finally{setImageAnalysisBusy(false);}
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
  const numericTemps=temps.map(Number).filter(Number.isFinite);
  const numericRain=rain.map(Number).filter(Number.isFinite);
  const reportTempMin=numericTemps.length?Math.min(...numericTemps).toFixed(1):"—";
  const reportTempMax=numericTemps.length?Math.max(...numericTemps).toFixed(1):"—";
  const reportRainTotal=numericRain.length?numericRain.reduce((a,b)=>a+b,0).toFixed(1):"—";
  const reportRainDays=numericRain.filter(value=>value>0).length;
  const reportCoverage=climate?.quality?.days_with_any_value??0;
  const reportBest=result?.recommendations?.[0];
  const reportScoreGap=result?.recommendations?.length>1?reportBest.score-result.recommendations[1].score:null;
  const cropName=CROPS.find(([value])=>value===crop)?.[1]||crop;
  const priorityName=({balanced:"Balanced",water:"Conserve water",soil:"Support soil function",diversity:"Increase crop diversity"})[priority]||priority;
  const reportArea=fieldArea||boundary?.area?.toFixed(3)||"not supplied";
  const reportClimateInsight=climate
    ? `${reportCoverage} of the available daily records contain at least one value. Mean temperature is ${avg} °C, with observed values from ${reportTempMin} to ${reportTempMax} °C. Recorded precipitation totals ${reportRainTotal} mm across ${reportRainDays} wet day${reportRainDays===1?"":"s"}.`
    : "Run the field analysis to add NASA POWER climate numericals to this report.";

  return <main className="shell">
    <header className="topbar"><a className="brand" href="/">◒ TERRAROTATE <span style={{fontWeight:400}}>AI</span></a><nav className="nav"><span>Field overview</span><a href="/tools">Analysis tools</a><a href="/model">Rotation research</a><a href="/about">About</a></nav><div className="topbar-actions"><a className="nav-sources" href="/sources">Data sources</a><span>GLOBAL DEMO · THREE SAMPLE REGIONS</span></div></header>
    <section className="hero"><div><div className="eyebrow">A CLEARER PLAN FOR YOUR FARM</div><h1>Make a plan for<br/>your next growing season.</h1><p>Tell us what you grow and how much water you have. We’ll compare crop rotations and show the climate information behind them.</p><div className="hero-actions"><button className="btn hero-cta" onClick={()=>document.getElementById("farm-details")?.scrollIntoView({behavior:"smooth",block:"start"})}>Start with your field <span aria-hidden="true">↓</span></button><span className="hero-note">Free to explore · No account needed</span></div></div><div className="hero-badge">Your farm · Your priorities</div></section>
    <section className="content">
      <article className="card field-card" id="farm-details">
        <div className="step-heading"><span className="step-number">1</span><div><h2>Tell us about your field</h2><p className="sub">Add your field name, area, and location. Use a sample if you just want to explore.</p></div><div className="field saved-field"><label htmlFor="saved-field">Load a sample or saved field</label><select id="saved-field" value="" onChange={e=>loadSavedField(e.target.value)}><option value="">Choose a field</option><optgroup label="Try a sample">{DEMO_FIELDS.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</optgroup>{savedFields.length>0&&<optgroup label="Saved on this device">{savedFields.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</optgroup>}</select></div></div>
        <div className="row"><div className="field"><label htmlFor="field-name">Field name</label><input id="field-name" value={fieldName} onChange={e=>setFieldName(e.target.value)} maxLength={120}/></div><div className="field"><label htmlFor="field-area">Field area (hectares)</label><input id="field-area" type="number" min="0.001" step="any" value={fieldArea} onChange={e=>setFieldArea(e.target.value)} placeholder="Optional; or calculate from boundary"/></div></div>
        <h3 className="section-label">Field location</h3><p className="sub">Use the coordinates for your field. These are used to look up local climate information.</p>
<div className="row"><div className="field"><label htmlFor="field-latitude">Latitude</label><input id="field-latitude" value={lat} onChange={e=>updateCoordinate("lat",e.target.value)} type="number" min="-90" max="90" step="any" placeholder="e.g. 42.03"/></div><div className="field"><label htmlFor="field-longitude">Longitude</label><input id="field-longitude" value={lon} onChange={e=>updateCoordinate("lon",e.target.value)} type="number" min="-180" max="180" step="any" placeholder="e.g. -93.62"/></div></div>
        <details className="optional-tools"><summary>Add a map boundary or satellite view <span>Optional</span></summary><div className="boundary-tools"><div className="field boundary-entry"><label>Choose how to add your field <span className="optional">· optional</span></label><div className="boundary-tabs" role="tablist" aria-label="Field boundary method"><button type="button" role="tab" aria-selected={boundaryMethod==="geojson"} className={boundaryMethod==="geojson"?"active":""} onClick={()=>setBoundaryMethod("geojson")}>GeoJSON</button><button type="button" role="tab" aria-selected={boundaryMethod==="google"} className={boundaryMethod==="google"?"active":""} onClick={()=>setBoundaryMethod("google")}>Google Maps</button></div>
          {boundaryMethod==="geojson"?<><p className="sub">Upload a field outline file, or open the paste option below. We’ll show the outline and estimate its area.</p><input ref={boundaryFileRef} className="visually-hidden" type="file" accept=".json,.geojson,application/geo+json,application/json" onChange={importBoundaryFile} aria-label="Choose a GeoJSON boundary file"/><button className="btn" type="button" onClick={()=>boundaryFileRef.current?.click()}>Choose GeoJSON file</button><span className="file-hint">.geojson or .json</span><details className="boundary-advanced"><summary>Or copy and paste GeoJSON</summary><p className="sub">Paste a GeoJSON Polygon or Feature. Coordinates use longitude, latitude order.</p><textarea id="boundary-geojson" className="json-input boundary-input" value={boundaryText} onChange={e=>setBoundaryText(e.target.value)} placeholder='{"type":"Polygon","coordinates":[[[-93.63,42.02],[-93.61,42.02],[-93.61,42.04],[-93.63,42.04],[-93.63,42.02]]]}' spellCheck="false"/><button className="btn secondary" type="button" onClick={parseBoundary}>Check pasted boundary</button></details></>:<><p className="sub">Open Google Maps, find or drop a pin on your field, then copy the coordinates and paste them here.</p><div className="google-search"><label htmlFor="google-map-search">Search for your field or nearby place</label><input id="google-map-search" value={googleMapSearch} onChange={e=>setGoogleMapSearch(e.target.value)} placeholder="Village, address, or place name"/><a className="btn google-link" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(googleMapSearch||`${lat},${lon}`)}`} target="_blank" rel="noopener noreferrer">Open Google Maps ↗</a><label htmlFor="google-map-coordinates">Paste coordinates or a Google Maps link</label><input id="google-map-coordinates" value={googleMapInput} onChange={e=>setGoogleMapInput(e.target.value)} placeholder="e.g. 42.0300, -93.6200"/><button className="btn" type="button" onClick={useGoogleMapsLocation}>Use this field location</button></div><p className="sub google-help">On a computer, right-click the field and select the coordinates. On a phone, press and hold the field on the map to drop a pin, then copy its coordinates.</p></>}
          {boundary&&<div className="boundary-success" role="status"><b>Boundary added</b><span>Estimated size: {boundary.area.toFixed(3)} hectares</span></div>}{boundaryError&&<div className="error" role="alert">{boundaryError}</div>}</div></div>
        </details>
        {fieldMessage&&<div className="banner" role="status">{fieldMessage}</div>}
      </article>
      <section className="print-report" aria-label="Printable field report">
        <div className="print-report-header"><div><span className="eyebrow">TERRAROTATE AI · DECISION SUPPORT</span><h2>Field yield and rotation report</h2><p className="print-report-lede">A measured, evidence-led snapshot for planning the next growing season. This report is not a guaranteed yield forecast.</p></div><div className="print-report-date">Prepared {new Date().toLocaleDateString()}</div></div>
        <div className="print-report-meta"><b>{fieldName||"Unnamed field"}</b><span>{reportArea} ha</span><span>{lat||"—"}, {lon||"—"}</span><span>Crop: {cropName}</span><span>Priority: {priorityName}</span></div>
        <h3>Executive insight</h3>
        <p>{reportBest?`The highest-ranked three-season sequence is ${reportBest.sequence.map(c=>CROPS.find(([value])=>value===c)?.[1]||c).join(" → ")} with a normalized score of ${reportBest.score}/100${reportScoreGap!==null?`, ${reportScoreGap} point${reportScoreGap===1?"":"s"} ahead of the next recommendation`:""}.`:"No rotation recommendation is available yet."} {reportClimateInsight}</p>
        <div className="print-metrics"><div><b>{avg} °C</b><span>Mean temperature</span></div><div><b>{reportRainTotal} mm</b><span>Recorded precipitation</span></div><div><b>{reportCoverage}</b><span>Days with values</span></div><div><b>{reportBest?`${reportBest.score}/100`:"—"}</b><span>Top rotation score</span></div></div>
        <div className="print-report-columns">
          <div><h3>1 · Field context</h3><dl className="print-details"><dt>Location</dt><dd>{lat||"Not provided"}, {lon||"Not provided"}</dd><dt>Area</dt><dd>{reportArea} hectares</dd><dt>Water availability</dt><dd>{{limited:"Limited",moderate:"Moderate",abundant:"Abundant"}[water]||water}</dd><dt>Soil context</dt><dd>{soilTexture||"Not provided"}{soilPh?` · pH ${soilPh}`:""}{organicMatter?` · ${organicMatter}% organic matter`:""}</dd><dt>Boundary</dt><dd>{boundary?"Supplied polygon; area is approximate":"Not supplied"}</dd></dl></div>
          <div><h3>2 · Climate evidence</h3><dl className="print-details"><dt>NASA POWER period</dt><dd>{climate?.period?.start||"Not analyzed"} to {climate?.period?.end||"Not analyzed"}</dd><dt>Temperature range</dt><dd>{reportTempMin} to {reportTempMax} °C</dd><dt>Wet days</dt><dd>{reportRainDays}</dd><dt>Data completeness</dt><dd>{climate?`${reportCoverage} days with at least one value`:"No observations loaded"}</dd></dl></div>
        </div>
        <h3>3 · Rotation comparison</h3>
        {result?.recommendations?.length?<table className="print-table"><thead><tr><th>Rank</th><th>Three-season sequence</th><th>Score</th><th>Why it appears here</th></tr></thead><tbody>{result.recommendations.map((recommendation,index)=><tr key={recommendation.sequence.join("-")}><td>{index+1}</td><td><b>{recommendation.sequence.map(c=>CROPS.find(([value])=>value===c)?.[1]||c).join(" → ")}</b></td><td>{recommendation.score}/100</td><td>{recommendation.explanation}</td></tr>)}</tbody></table>:<p>Run the field analysis to generate rotation comparisons.</p>}
        <div className="print-report-columns">
          <div><h3>4 · Suggested actions</h3><ol className="print-list"><li>Use the top sequence as a planning hypothesis, then confirm planting windows, cultivar fit, market access, and machinery capacity locally.</li><li>Validate the water assumption with an irrigation plan or recent field observations; rainfall totals are regional context, not delivered water.</li><li>Take a representative soil test before changing nutrient or crop plans, especially where soil pH or organic matter is missing.</li></ol></div>
          <div><h3>5 · Cautions and limitations</h3><ul className="print-list"><li>Scores are normalized comparisons, not probabilities, yield tonnes, or validated agronomic ratings.</li><li>NASA POWER and satellite products describe broad or gridded conditions and may not represent this exact field.</li><li>Check recommendations with a qualified agronomist before making an input, planting, or financial decision.</li></ul></div>
        </div>
        {projection&&<><h3>Future climate context · 2041–2060</h3><div className="print-scenarios">{scenarios.map(s=><div key={s.name}><b>{s.name.toUpperCase()}</b><span>{s.temperature} °C mean · {s.precipitation} mm/day mean precipitation</span></div>)}</div></>}
        <p className="print-report-source">Sources: NASA POWER daily climate and projection services; TerraRotate transparent rotation baseline. Generated from the values currently loaded in this browser.</p>
      </section>
      <div className="grid">
        <article className="card" id="field-conditions">
          <div className="step-heading"><span className="step-number">2</span><div><h2>Growing conditions</h2><p className="sub">Choose what matters most to you. Soil details are optional.</p></div></div>

          <div className="row"><div className="field"><label htmlFor="current-crop">Current crop</label><select id="current-crop" value={crop} onChange={e=>setCrop(e.target.value)}>{CROPS.map(([v,n])=><option value={v} key={v}>{n}</option>)}</select></div><div className="field"><label htmlFor="water-availability">Water available</label><select id="water-availability" value={water} onChange={e=>setWater(e.target.value)}><option value="limited">Limited</option><option value="moderate">Moderate</option><option value="abundant">Abundant</option></select></div></div>
          <div className="field" style={{maxWidth:360,marginBottom:18}}><label htmlFor="farm-priority">Your main priority</label><select id="farm-priority" value={priority} onChange={e=>setPriority(e.target.value)}><option value="balanced">Balanced</option><option value="water">Conserve water</option><option value="soil">Support soil function</option><option value="diversity">Increase crop diversity</option></select></div>
          <div className="conditions-group"><h3 className="section-label">Soil details <span className="optional">Optional · used as context only</span></h3><p className="sub">Add what you know from a soil test; you can leave these blank.</p>
          <div className="row"><div className="field"><label htmlFor="soil-texture">Soil texture</label><select id="soil-texture" value={soilTexture} onChange={e=>setSoilTexture(e.target.value)}><option value="">Not provided</option><option>Sand</option><option>Sandy loam</option><option>Loam</option><option>Clay loam</option><option>Clay</option></select></div><div className="field"><label htmlFor="soil-ph">Soil pH</label><input id="soil-ph" type="number" min="0" max="14" step="0.1" value={soilPh} placeholder="Optional" onChange={e=>setSoilPh(e.target.value)}/></div></div>
          <div className="field" style={{maxWidth:220,marginBottom:18}}><label htmlFor="organic-matter">Organic matter (%)</label><input id="organic-matter" type="number" min="0" max="100" step="0.1" value={organicMatter} placeholder="Optional" onChange={e=>setOrganicMatter(e.target.value)}/></div>
          </div>
          <button className="btn" disabled={busy} onClick={analyze}>{busy?"Loading field evidence…":"Analyze field"}</button>
          {error&&<div className="error">{error}</div>}{climateError&&<div className="error">{climateError}. No substitute or sample observations were used.</div>}
          {climate&&<><div className="banner">NASA POWER · Daily point data · {climate.period.start} to {climate.period.end}. Gridded regional context, not a field sensor reading.</div><div className="stats"><div className="stat"><b>{avg}°C</b><span>Mean air temperature</span></div><div className="stat"><b>{precip} mm</b><span>Accumulated precipitation</span></div><div className="stat"><b>{climate.quality.days_with_any_value}/{climate.quality.expected_days}</b><span>Days with observations</span></div></div></>}
        </article>
        <article className="card" id="rotation-results"><div className="step-heading"><span className="step-number">3</span><div><h2>Compare rotation ideas</h2><p className="sub">Three possible crop sequences, ranked around your chosen priority.</p></div></div>
          {!result&&<div className="banner">Enter field context and select <b>Analyze field</b> to compare rotations.</div>}
          {result&&<><div className="banner">Rule baseline · normalized comparison scores, not probabilities, yields, or validated agronomic ratings.</div>{Object.keys(result.soil_inputs||{}).length>0&&<div className="banner">Farmer-entered soil context: {Object.entries(result.soil_inputs).map(([k,v])=>`${k.replaceAll("_"," ")}: ${v}`).join(" · ")}. Not scored.</div>}<div className="recommendations">{result.recommendations.map((r,i)=><div className="rec" key={r.sequence.join("-")}><div className="score">{r.score}</div><div><span className="tag">{r.title}</span><h3>{r.sequence.map(c=>c[0].toUpperCase()+c.slice(1)).join(" → ")}</h3><p>{r.explanation} {r.caveats[0]}</p></div></div>)}</div></>}
        </article>
      </div>
      <div className="grid" style={{marginTop:20}}>
      <article className="card"><h2>NASA future climate scenarios</h2><p className="sub">Compare NASA POWER multi-model ensemble monthly climate scenarios for 2041–2060 at this point. These are regional climate contexts, not farm forecasts.</p><button className="btn" disabled={projectionBusy} onClick={loadProjection}>{projectionBusy?"Loading scenarios…":"Compare scenarios"}</button>{projectionError&&<div className="error">{projectionError}</div>}{projection&&<><div className="banner">{projection.provider} · {projection.model} ensemble · {projection.period.start_year}–{projection.period.end_year}. Scenario differences are not crop-yield predictions. Available values: {projection.quality?.values_available??"unknown"}/{projection.quality?.expected_values??"unknown"}.</div>{projection.data_gaps?.map(gap=><div className="error" key={gap} role="status">{gap}</div>)}<div className="stats">{scenarios.map(s=><div className="stat" key={s.name}><b>{s.temperature}°C</b><span>{s.name.toUpperCase()} mean temperature · mean precipitation {s.precipitation} mm/day</span></div>)}</div></>}</article>
      <article className="card"><h2>Print detailed field report</h2><p className="sub">Create a well-structured report with field numericals, climate evidence, rotation insights, suggested actions, and important cautions.</p><div className="print-action"><button className="btn secondary" onClick={()=>window.print()}>Print detailed report</button></div></article></div>
      <div className="grid" style={{marginTop:20}}><article className="card"><h2>What this view can tell you</h2><p className="sub">NASA POWER gridded meteorological estimates and NASA GIBS imagery provide regional context. Neither resolves exact conditions inside a small field.</p></article><article className="card"><h2>What to verify locally</h2><p className="sub">Soil test · water access · planting dates and local varieties · market constraints · pest and disease history. Soil is farmer-entered and not inferred.</p></article></div>
      <section className="card map-card"><div className="step-heading"><span className="step-number">✦</span><div><h2>Interactive NASA map · select point</h2><p className="sub">Use the satellite view to explore the selected location.</p></div></div><p className="sub">Choose a NASA layer and date, then load the map. Click to choose a location; arrow keys move the point, and Shift moves in larger steps. Zoom and layer imagery are visual context only.</p>
          <div className="row"><div className="field"><label htmlFor="map-layer">NASA data layer</label><select id="map-layer" value={layer} onChange={e=>{setLayer(e.target.value);setImageUrl("");setLegendUrl("");}}><optgroup label="Vegetation index browse layers"><option value="modis_ndvi">Terra MODIS · 8-day NDVI</option><option value="viirs_ndvi">Suomi NPP VIIRS · 8-day NDVI</option></optgroup><optgroup label="Other NASA browse layers"><option value="modis_terra">Terra MODIS · true color</option><option value="modis_aqua">Aqua MODIS · true color</option><option value="viirs_snpp">Suomi NPP VIIRS · true color</option><option value="imerg_precipitation">GPM IMERG · precipitation rate</option><option value="smap_surface_moisture">SMAP L4 · surface soil moisture</option></optgroup></select></div><div className="field"><label htmlFor="map-date">Observation/composite date</label><select id="map-date" value={imageDate} disabled={datesBusy||availableDates.length===0} onChange={e=>{setImageDate(e.target.value);setImageUrl("");}}>{datesBusy?<option value={imageDate}>Loading available dates…</option>:availableDates.length?availableDates.map(day=><option key={day} value={day}>{day}</option>):<option value="">No dates available</option>}</select><span className="status">Only dates advertised by NASA GIBS are listed.</span></div></div>
          <div className="row"><div className="field"><label htmlFor="map-zoom">Map zoom · 1× to 4×</label><select id="map-zoom" value={zoom} onChange={e=>{setZoom(Number(e.target.value));setImageUrl("");}}><option value={1}>1× regional</option><option value={2}>2×</option><option value={3}>3×</option><option value={4}>4× local view</option></select></div><div className="field"><label>&nbsp;</label><button className="btn" onClick={loadImagery}>Load NASA imagery</button></div></div>
          {imageError&&<div className="error" role="alert">{imageError}</div>}
          <div className="map-frame" role="button" tabIndex={0} aria-label="NASA imagery map. Click or use arrow keys to choose a location." onClick={selectMapPoint} onKeyDown={moveMapPoint}>
          {imageUrl?<img src={imageUrl} alt="NASA GIBS imagery for the selected location" onLoad={()=>{setImageryBusy(false);setImageError("");}} onError={()=>{setImageryBusy(false);setImageError("NASA GIBS could not load imagery for this advertised date. Try another listed date.");setImageUrl("");}}/>:<div className="map-empty">{imageError|| (imageryBusy?"Loading NASA GIBS imagery…":"Load NASA imagery above to enable point selection.")}</div>}
          <svg className="map-overlay" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">{boundary?.rings?.length>0&&<path d={boundary.rings.map(ring=>`M ${ring.map(point=>projectCoordinate(point,bounds)).join(" L ")} Z`).join(" ")} fill="#d6ef8344" fillRule="evenodd" stroke="#e9ffab" strokeWidth="0.45"/>}<circle cx={((centerLon-bounds.west)/(bounds.east-bounds.west)*100)} cy={((bounds.north-centerLat)/(bounds.north-bounds.south)*100)} r="1.35" fill="#f5cf4a" stroke="#17261f" strokeWidth=".5"/></svg>
          <span className="map-attribution">NASA GIBS · {bounds.south.toFixed(2)} to {bounds.north.toFixed(2)}° lat</span>
        </div>{legendUrl&&<div className="map-legend"><b>NASA product legend</b>{!legendError?<img src={legendUrl} alt={`${layer} official NASA GIBS layer legend`} onError={()=>setLegendError(true)}/>:<span>GIBS did not return a separate legend for this layer. Color is product-specific; do not read it as a field measurement.</span>}</div>}<p className="status">Selected point: {Number.isFinite(centerLat)?centerLat.toFixed(5):"—"}, {Number.isFinite(centerLon)?centerLon.toFixed(5):"—"} · illustrative until you register a real field.</p>
          <div className="map-explanation" aria-live="polite"><div><span className="tag">{mapGuide.label}</span><h3>What this image shows</h3><p>{mapGuide.description}</p></div><div className="map-reading"><b>How to read it</b><p>{mapGuide.reading}</p><p className="status">This is regional context. It is not a measurement from inside your field, and it does not diagnose crop health.</p></div></div>
                    <section className="visual-analysis" aria-live="polite">
            <div className="visual-analysis-head"><div><h3>Explain this satellite image</h3><p className="sub">Get a plain-language description of visible patterns in this map.</p></div><button className="btn" type="button" onClick={explainImage} disabled={!imageUrl||imageAnalysisAvailable!==true||imageAnalysisBusy}>{imageAnalysisBusy?"Explaining image…":"Explain this image"}</button></div>
            {imageAnalysisAvailable===false&&<p className="status">Image explanation is not enabled on the connected server yet.</p>}
            {imageAnalysisAvailable===null&&<p className="status">Checking image explanation availability…</p>}
            {imageDescriptionError&&<p className="error" role="alert">{imageDescriptionError}</p>}
            {imageDescription&&<div className="visual-description"><b>What the image appears to show</b><p>{imageDescription}</p>{imageDescriptionCaution&&<small>{imageDescriptionCaution}</small>}</div>}
          </section><div className="image-report" aria-live="polite">
            {reportBusy&&<p className="status">Reading image details and checking available measurements…</p>}
            {reportError&&<p className="error" role="alert">{reportError}</p>}
            {imageReport&&<>
              {imageReport.report_notice&&<div className="banner">{imageReport.report_notice}</div>}
              <section className="report-section"><h3>Details from this image</h3><dl className="report-grid">
                <div><dt>Source</dt><dd>{imageReport.image.provider}</dd></div><div><dt>Satellite layer</dt><dd>{imageReport.image.product}</dd></div>
                <div><dt>Product code</dt><dd>{imageReport.image.layer_id}</dd></div>
                <div><dt>Image date</dt><dd>{imageReport.image.date}</dd></div><div><dt>Product timing</dt><dd>{imageReport.image.cadence}</dd></div>
                <div><dt>Nominal resolution</dt><dd>{imageReport.image.nominal_resolution}</dd></div><div><dt>Map zoom</dt><dd>{imageReport.image.zoom}×</dd></div>
                <div><dt>Selected point</dt><dd>{imageReport.image.coordinates.latitude}, {imageReport.image.coordinates.longitude}</dd></div>
                <div><dt>Image size</dt><dd>{imageReport.image.image_dimensions.width} × {imageReport.image.image_dimensions.height} pixels</dd></div>
                <div className="report-wide"><dt>Map coverage</dt><dd>{imageReport.image.bounds.south.toFixed(3)}° to {imageReport.image.bounds.north.toFixed(3)}° latitude; {imageReport.image.bounds.west.toFixed(3)}° to {imageReport.image.bounds.east.toFixed(3)}° longitude</dd></div>
              </dl><p className="report-note"><b>About image values:</b> {imageReport.image.pixel_values_note}</p></section>
              <section className="report-section"><h3>Field details used in this view</h3><p className="sub">These details come from the form, not from the satellite image.</p><dl className="report-grid">{fieldReportDetails.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section>
              <section className="report-section"><h3>Available measurements for {imageReport.image.date}</h3><p className="sub">These are separate NASA POWER estimates for the nearest data grid point, not values read from image colors.</p><div className="reading-grid">{imageReport.readings.map(reading=><div className="reading-value" key={reading.parameter}><span>{reading.label}</span><b>{reading.value!==null&&reading.value!==undefined&&Number.isFinite(Number(reading.value))?Number(reading.value).toLocaleString(undefined,{maximumFractionDigits:3}):"Unavailable"} {reading.value!==null&&reading.value!==undefined?reading.unit:""}</b><small>{reading.parameter} · {reading.status}</small></div>)}</div>{imageReport.readings_errors?.map((message,index)=><p className="status" key={index}>{message}</p>)}<p className="report-note">{imageReport.reading_note}</p></section>
            </>}
          </div></section>
      <footer className="foot">Sources: NASA POWER for daily climate; NASA GIBS layers for MODIS/VIIRS, GPM IMERG and SMAP visual context. See <a href="/sources">all official challenge resources and data provenance</a>. TerraRotate AI is independent; NASA does not endorse it.</footer>
    </section>
  </main>;
}
