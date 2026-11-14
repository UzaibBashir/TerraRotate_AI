"""Transparent rotation ranking baseline, not validated agronomic measurements."""
from itertools import permutations
CROPS = {
 "potato":{"name":"Potato","family":"Solanaceae","duration_days":120,"season":"spring/summer","water":"high","nitrogen_fixing":False},
 "rice":{"name":"Rice","family":"Poaceae","duration_days":150,"season":"summer/autumn","water":"high","nitrogen_fixing":False},
 "maize":{"name":"Maize","family":"Poaceae","duration_days":120,"season":"spring/summer","water":"medium","nitrogen_fixing":False},
 "wheat":{"name":"Wheat","family":"Poaceae","duration_days":140,"season":"autumn/winter","water":"medium","nitrogen_fixing":False},
 "mustard":{"name":"Mustard","family":"Brassicaceae","duration_days":110,"season":"autumn/winter","water":"low","nitrogen_fixing":False},
 "pea":{"name":"Field pea","family":"Fabaceae","duration_days":110,"season":"autumn/winter","water":"low","nitrogen_fixing":True},
}
BASE = {"water":.35,"diversity":.25,"soil":.20,"preference":.20}

def recommend_rotations(body):
    current=body.get("current_crop","potato"); water=body.get("water_availability","moderate"); priority=body.get("priority","balanced")
    if current not in CROPS: raise ValueError("Choose a crop from the supplied crop catalog")
    if water not in {"limited","moderate","abundant"}: raise ValueError("water_availability must be limited, moderate, or abundant")
    if priority not in {"water","soil","diversity","balanced"}: raise ValueError("priority must be water, soil, diversity, or balanced")
    weights=dict(BASE)
    if priority=="water": weights={"water":.60,"diversity":.15,"soil":.15,"preference":.10}
    elif priority=="soil": weights={"water":.15,"diversity":.25,"soil":.50,"preference":.10}
    elif priority=="diversity": weights={"water":.15,"diversity":.55,"soil":.20,"preference":.10}
    custom=body.get("weights")
    if custom is not None:
        if not isinstance(custom,dict) or set(custom)!=set(BASE): raise ValueError("weights must provide water, diversity, soil, and preference values")
        try: weights={key:float(value) for key,value in custom.items()}
        except (TypeError,ValueError): raise ValueError("weights must be numeric")
        if any(not __import__("math").isfinite(v) or v<0 for v in weights.values()) or sum(weights.values())<=0:
            raise ValueError("weights must be finite, non-negative, and have a positive total")
        total=sum(weights.values()); weights={key:value/total for key,value in weights.items()}
    water_scores={"low":1.,"medium":.65,"high":.3}
    choices=[]
    alternatives=[crop for crop in CROPS if crop!=current]
    for tail in permutations(alternatives,2):
        seq=[current,*tail]
        if all(CROPS[seq[i]]["family"]!=CROPS[seq[i+1]]["family"] for i in range(2)):
            choices.append(seq)
    sequences=[[current,current,current]]+choices
    result=[]
    for seq in sequences:
        crops=[CROPS[c] for c in seq]; diversity=len({c["family"] for c in crops})/len(crops)
        legumes=sum(c["nitrogen_fixing"] for c in crops)
        avgwater=sum(water_scores[c["water"]] for c in crops)/len(crops)
        wfit=1. if water=="abundant" else avgwater*(.8 if water=="limited" else 1.)
        soil=min(1.,.45+legumes*.25); pref=.8 if priority=="balanced" else 1.
        score=round(100*(weights["water"]*wfit+weights["diversity"]*diversity+weights["soil"]*soil+weights["preference"]*pref))
        title="Current crop continued" if len(set(seq))==1 else "Alternative rotation"
        result.append({"title":title,"sequence":seq,"score":score,"components":{"water_fit":round(wfit,2),"family_diversity":round(diversity,2),"nitrogen_fixing_crop_count":legumes,"legume_practice_proxy_not_soil_measurement":round(soil,2)},"explanation":f"Three-season sequence; no repeated crop family in adjacent seasons for alternatives. Includes {legumes} legume crop(s) and {len({c['family'] for c in crops})} crop families; water fit uses broad catalog classes.","caveats":["Normalized comparison aid, not probability, yield estimate or measured soil effect. The legume proxy is a practice indicator only.","Check local cultivars, planting dates, soil test, market and rotation history with an agricultural expert."],"weights":weights})
    baseline=next(row for row in result if row["title"]=="Current crop continued")
    alternatives=sorted((row for row in result if row["title"]!="Current crop continued"),key=lambda x:(-x["score"],x["sequence"]))[:2]
    result=[baseline,*alternatives]
    result.sort(key=lambda x:x["score"],reverse=True)
    soil=body.get("soil") or {}
    if not isinstance(soil,dict): raise ValueError("soil must be an object of farmer-entered values")
    soil_inputs={key:soil.get(key) for key in ("texture","ph","organic_matter_percent") if soil.get(key) not in (None,"")}
    if "texture" in soil_inputs and soil_inputs["texture"] not in {"Sand","Sandy loam","Loam","Clay loam","Clay"}:
        raise ValueError("soil.texture must be one of the listed texture classes")
    for key, high in (("ph",14),("organic_matter_percent",100)):
        if key in soil_inputs:
            try: value=float(soil_inputs[key])
            except (TypeError,ValueError): raise ValueError(f"soil.{key} must be numeric")
            if not 0 <= value <= high: raise ValueError(f"soil.{key} must be between 0 and {high}")
            soil_inputs[key]=value
    gaps=[]
    if not soil_inputs: gaps.append("No farmer-entered soil details supplied")
    else: gaps.append("Farmer-entered soil details are shown as context but not used in scoring because locally verified crop suitability ranges are incomplete")
    gaps.append("No field-level yield or pest data")
    return {"recommendations":result,"method":"Transparent weighted rule baseline","hard_constraints":["three-season comparisons","no repeated crop family in adjacent alternative seasons","catalog-listed crops only"],"current_crop":current,"water_availability":water,"priority":priority,"soil_inputs":soil_inputs,"data_gaps":gaps,"source":"docs/crop_catalog.md"}
