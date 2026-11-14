"""Input-driven analytical baselines; outputs are not validated field diagnoses."""
from collections import defaultdict
from datetime import date
import math


def _observations(body):
    rows = body.get("observations")
    if not isinstance(rows, list) or not rows:
        raise ValueError("Provide observations with date, value, source, and resolution")
    source = body.get("source")
    resolution = body.get("resolution")
    if not source or not resolution:
        raise ValueError("Source and native product resolution are required provenance")
    provider=str(source).strip().casefold()
    if not (provider.startswith("nasa modis") or provider.startswith("nasa landsat") or provider.startswith("nasa viirs") or provider.startswith("esa sentinel-2")):
        raise ValueError("Use an eligible challenge-listed NASA Landsat/MODIS/VIIRS product or listed ESA Sentinel-2 product and identify its version")
    if not any(character.isdigit() for character in str(source)):
        raise ValueError("Include the product identifier, collection, or processing version in source")
    if str(body.get("index", "NDVI")).upper() != "NDVI":
        raise ValueError("Only NDVI values are currently supported by the vegetation baseline")
    parsed = []
    for item in rows:
        try:
            day = date.fromisoformat(item["date"])
            value = float(item["value"])
        except (KeyError, TypeError, ValueError):
            raise ValueError("Each observation needs a valid ISO date and numeric value")
        if not math.isfinite(value) or not -1 <= value <= 1:
            raise ValueError("Vegetation index values must be between -1 and 1")
        if day > date.today():
            raise ValueError("Vegetation observation dates cannot be in the future")
        parsed.append({"date": day.isoformat(), "value": value})
    parsed.sort(key=lambda row: row["date"])
    if len({row["date"] for row in parsed}) != len(parsed):
        raise ValueError("Provide only one vegetation observation per date")
    return parsed, source, resolution


def vegetation(body):
    rows, source, resolution = _observations(body)
    values = [row["value"] for row in rows]
    ordered = sorted(values)
    median = ordered[len(ordered)//2] if len(ordered) % 2 else sum(ordered[len(ordered)//2-1:len(ordered)//2+1])/2
    deviations = sorted(abs(value-median) for value in values)
    mad = deviations[len(deviations)//2]
    low = [row for row in rows if row["value"] < 0.2]
    change = values[-1] - values[0] if len(values) > 1 else None
    anomalous = [row for row in rows if mad > 0 and abs(row["value"]-median) > 3*1.4826*mad]
    return {"module":"field_intelligence", "source":source, "resolution":resolution,
            "period":{"start":rows[0]["date"],"end":rows[-1]["date"]}, "observation_count":len(rows),
            "observations":rows, "median_index":round(median,4), "first_to_last_change":round(change,4) if change is not None else None,
            "possible_low_vegetation_dates":[r["date"] for r in low], "robust_outlier_dates":[r["date"] for r in anomalous],
            "missing_data":"Only supplied dates are analyzed; gaps are not imputed.",
            "interpretation":"Possible low vegetation or unusual index pattern; not a diagnosis of disease, nutrient deficiency, or confirmed crop stress."}


def bare_windows(body):
    rows, source, resolution = _observations(body)
    try: threshold = float(body.get("low_threshold", 0.2))
    except (TypeError,ValueError): raise ValueError("low_threshold must be between 0 and 1")
    if not 0 <= threshold <= 1: raise ValueError("low_threshold must be between 0 and 1")
    low = [r for r in rows if r["value"] < threshold]
    windows=[]
    for row in low:
        if not windows or (date.fromisoformat(row["date"])-date.fromisoformat(windows[-1]["end"])).days > 32:
            windows.append({"start":row["date"],"end":row["date"],"sample_count":1})
        else:
            windows[-1]["end"]=row["date"]; windows[-1]["sample_count"]+=1
    for window in windows:
        window["observed_span_days"]=(date.fromisoformat(window["end"])-date.fromisoformat(window["start"])).days
        window["label"]="possible low-vegetation window; not verified fallow or bare soil"
    return {"module":"bare_window", "source":source,"resolution":resolution,"threshold":threshold,
            "windows":windows,"data_gaps":[] if windows else ["No supplied observation fell below the selected threshold"],
            "interpretation":"Sparse vegetation observations can indicate low vegetation, but cannot alone confirm field use, crop harvest, or exposed soil."}


def water_budget(body, nasa_data=None):
    area=float(body.get("area_hectares",0)); demand=float(body.get("crop_demand_mm",0)); irrigation=float(body.get("irrigation_mm",0))
    if not all(math.isfinite(x) for x in (area,demand,irrigation)) or area <= 0 or demand < 0 or irrigation < 0:
        raise ValueError("Provide positive field area and non-negative crop demand and irrigation depth")
    rainfall=body.get("expected_rainfall_mm",{})
    if not isinstance(rainfall,dict): raise ValueError("expected_rainfall_mm must contain dry, normal, and wet values")
    scenarios={}
    for name in ("dry","normal","wet"):
        try: rain=float(rainfall[name])
        except (KeyError,TypeError,ValueError): raise ValueError("expected_rainfall_mm must contain dry, normal, and wet values")
        if not math.isfinite(rain) or rain < 0: raise ValueError("Scenario rainfall must be non-negative")
        total=rain+irrigation; deficit=max(0,demand-total); surplus=max(0,total-demand)
        scenarios[name]={"rainfall_mm":rain,"irrigation_mm_farmer_estimate":irrigation,"estimated_supply_mm":total,
                         "demand_mm_farmer_estimate":demand,"deficit_mm":deficit,"surplus_mm":surplus,
                         "deficit_volume_m3":round(deficit*area*10,2),"supply_volume_m3":round(total*area*10,2)}
    return {"module":"water_intelligence","area_hectares":area,"scenarios":scenarios,"nasa_context":nasa_data,
            "provenance":{"rainfall_scenarios":"Farmer-entered planning assumptions","demand":"Farmer-entered crop requirement; not measured consumption","irrigation":"Farmer-entered planned depth"},
            "interpretation":"A transparent planning water balance. It excludes runoff, effective-rainfall losses, soil storage, conveyance losses, and crop-stage timing."}


def climate_analogs(body):
    field=body.get("field_profile"); candidates=body.get("candidates")
    if not isinstance(field,dict) or not isinstance(candidates,list) or not candidates: raise ValueError("Provide a field_profile and candidate climate profiles")
    features=("temperature_c","precipitation_mm_day")
    try: base=[float(field[key]) for key in features]
    except (KeyError,TypeError,ValueError): raise ValueError("Each climate profile needs temperature_c and precipitation_mm_day")
    if not all(math.isfinite(value) for value in base): raise ValueError("Climate profile values must be finite")
    scored=[]
    for candidate in candidates:
        try: vals=[float(candidate[key]) for key in features]
        except (KeyError,TypeError,ValueError): raise ValueError("Each climate profile needs temperature_c and precipitation_mm_day")
        if not all(math.isfinite(value) for value in vals): raise ValueError("Climate profile values must be finite")
        distance=math.sqrt(((vals[0]-base[0])/10)**2+((vals[1]-base[1])/5)**2)
        scored.append({"name":str(candidate.get("name","Unnamed location")),"distance":round(distance,4),"similarity_score":round(100/(1+distance),1),"profile":{key:candidate[key] for key in features}})
    scored.sort(key=lambda x:x["distance"])
    return {"module":"climate_analogs","features":list(features),"analogs":scored,
            "source":body.get("source","User-supplied NASA POWER historical climate profiles"),
            "interpretation":"Historical profile similarity only. Not a future-climate prediction; similarity depends on selected features and scaling."}


def historical_climate_analogs(field_data, candidate_data):
    def climatology(data):
        grouped=defaultdict(lambda: {"temperature_c":[],"precipitation_mm_day":[]})
        for row in data["rows"]:
            month=row["month"][-2:]
            if month not in {f"{i:02}" for i in range(1,13)}: continue
            for key in grouped[month]:
                if row.get(key) is not None: grouped[month][key].append(float(row[key]))
        return {m:{key:sum(vals)/len(vals) if vals else None for key,vals in grouped[m].items()} for m in grouped}
    field=climatology(field_data)
    if len(field)<12: raise ValueError("NASA POWER field profile needs complete monthly coverage for the selected period")
    scored=[]
    for candidate in candidate_data:
        profile=climatology(candidate["data"])
        common=[month for month in field if month in profile and all(field[month][k] is not None and profile[month][k] is not None for k in ("temperature_c","precipitation_mm_day"))]
        if len(common)<10: continue
        squared=[]
        for month in common:
            squared.extend([((field[month]["temperature_c"]-profile[month]["temperature_c"])/10)**2,
                            ((field[month]["precipitation_mm_day"]-profile[month]["precipitation_mm_day"])/5)**2])
        distance=math.sqrt(sum(squared)/len(squared))
        scored.append({"name":candidate["name"],"distance":round(distance,4),"similarity_score":round(100/(1+distance),1),"compared_months":len(common),"profile":profile,"coordinates":candidate["data"]["coordinates"]})
    scored.sort(key=lambda x:x["distance"])
    return {"module":"climate_analogs","source":"NASA POWER Monthly Point API","parameters":["T2M","PRECTOTCORR"],
            "field_period":field_data["period"],"field_climatology":field,"analogs":scored,
            "interpretation":"Historical NASA POWER climate similarity based on monthly temperature and precipitation seasonality. Not a future-climate prediction; coarse grid and parameter resolution vary."}


def spatial_zones(body):
    points=body.get("points")
    k=body.get("zone_count",2)
    if not isinstance(points,list) or len(points)<3: raise ValueError("Provide at least three georeferenced sample points")
    if not isinstance(k,int) or k<2 or k>min(6,len(points)): raise ValueError("zone_count must be 2–6 and no larger than the number of points")
    keys=body.get("features",[])
    if not isinstance(keys,list) or not keys: raise ValueError("Provide numeric feature names for measured point observations")
    raw=[]; coords=[]
    for point in points:
        try:
            lat=float(point["latitude"]); lon=float(point["longitude"]); row=[float(point[x]) for x in keys]
        except (KeyError,TypeError,ValueError): raise ValueError("Every point needs latitude, longitude, and all selected numeric features")
        if not -90<=lat<=90 or not -180<=lon<=180 or not all(math.isfinite(v) for v in row): raise ValueError("Point coordinates or features are invalid")
        coords.append((lat,lon)); raw.append(row)
    means=[sum(row[j] for row in raw)/len(raw) for j in range(len(keys))]
    scales=[]
    for j in range(len(keys)):
        sd=math.sqrt(sum((row[j]-means[j])**2 for row in raw)/len(raw)); scales.append(sd or 1)
    # Include spatial distance at approximately 1 degree per feature standard deviation.
    vectors=[]
    for idx,row in enumerate(raw):
        lat,lon=coords[idx]; vectors.append([lat,lon*math.cos(math.radians(lat))]+[(row[j]-means[j])/scales[j] for j in range(len(keys))])
    centers=[vectors[i][:] for i in range(k)]; labels=[0]*len(points)
    for _ in range(30):
        labels=[min(range(k),key=lambda c:sum((vectors[i][j]-centers[c][j])**2 for j in range(len(vectors[i])))) for i in range(len(points))]
        next_centers=[]
        for c in range(k):
            members=[vectors[i] for i,l in enumerate(labels) if l==c]
            next_centers.append([sum(v[j] for v in members)/len(members) if members else centers[c][j] for j in range(len(centers[c]))])
        if next_centers==centers: break
        centers=next_centers
    zones=[]
    for c in range(k):
        members=[i for i,label in enumerate(labels) if label==c]
        if members:
            zones.append({"zone_id":f"sample_cluster_{c+1}","sample_count":len(members),"sample_indices":members,
                          "mean_features":{key:round(sum(raw[i][j] for i in members)/len(members),4) for j,key in enumerate(keys)},
                          "quality":"Exploratory clustering of supplied sample points; does not delineate contiguous field-management zones."})
    return {"module":"zone_intelligence","features":keys,"zones":zones,"source":body.get("source","User-supplied georeferenced observations"),
            "resolution":body.get("resolution","User-supplied point spacing"),"interpretation":"No upscaling or satellite pixel interpolation is performed. More than point samples and a verified field boundary are needed for operational zones."}


def bayesian_feedback(body):
    helpful=body.get("helpful")
    if not isinstance(helpful,bool): raise ValueError("helpful must be true or false and represent farmer feedback")
    try: alpha=float(body.get("prior_alpha",2)); beta=float(body.get("prior_beta",2))
    except (TypeError,ValueError): raise ValueError("Beta prior parameters must be finite and positive")
    previous=body.get("previous_feedback",{"helpful":0,"not_helpful":0})
    if not math.isfinite(alpha) or not math.isfinite(beta) or alpha<=0 or beta<=0 or not isinstance(previous,dict): raise ValueError("Beta prior parameters must be finite and positive")
    try: a=alpha+int(previous.get("helpful",0))+int(helpful); b=beta+int(previous.get("not_helpful",0))+int(not helpful)
    except (TypeError,ValueError): raise ValueError("previous_feedback counts must be non-negative integers")
    try: h=int(previous.get("helpful",0)); n=int(previous.get("not_helpful",0))
    except (TypeError,ValueError): raise ValueError("previous_feedback counts must be non-negative integers")
    if any(isinstance(previous.get(key,0),bool) for key in ("helpful","not_helpful")) or h<0 or n<0 or h!=previous.get("helpful",0) or n!=previous.get("not_helpful",0): raise ValueError("previous_feedback counts must be non-negative integers")
    return {"module":"farmer_memory_bayesian_feedback","prior":{"alpha":alpha,"beta":beta,"mean":alpha/(alpha+beta)},
            "posterior":{"alpha":a,"beta":b,"mean":a/(a+b),"credible_interval_95":None},
            "feedback_count":int(previous.get("helpful",0))+int(previous.get("not_helpful",0))+1,
            "observation":"Subjective farmer feedback, not independently validated outcome evidence.",
            "persistence":"Stateless calculation; durable memory requires configured Supabase project and authenticated user."}


def rotation_risk(rotations):
    ranks={}
    for priority in ("water","soil","diversity","balanced"):
        ranked=rotations({"current_crop":"potato","water_availability":"moderate","priority":priority})["recommendations"]
        ranks[priority]=ranked[0]["sequence"]
    counts=defaultdict(int)
    for seq in ranks.values(): counts[" → ".join(seq)]+=1
    return {"module":"rotation_risk","top_rotation_by_priority":ranks,"rank_stability":{seq:round(n/len(ranks),2) for seq,n in counts.items()},
            "interpretation":"Sensitivity across four predefined preference profiles. Stability is not a probability or confidence estimate.",
            "confidence":"Insufficient evidence for a reliable confidence estimate."}
