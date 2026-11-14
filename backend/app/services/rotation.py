"""Transparent rule-based rotation comparisons, not validated agronomic measurements."""
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
    water_scores={"low":1.,"medium":.65,"high":.3}
    templates=[["wheat","pea"],["mustard","wheat"],["pea","maize"],["potato","mustard"],["rice","pea"]]
    choices=[]
    for pair in templates:
        seq=[current]+[c for c in pair if c != current]
        if len(seq)==3 and seq not in choices and len({CROPS[c]["family"] for c in seq}) >= 2:
            choices.append(seq)
        if len(choices)==2: break
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
        result.append({"title":title,"sequence":seq,"score":score,"components":{"water_fit":round(wfit,2),"family_diversity":round(diversity,2),"nitrogen_fixing_crop_count":legumes,"soil_proxy":round(soil,2)},"explanation":f"Includes {legumes} legume crop(s) and {len({c['family'] for c in crops})} crop families; water fit uses broad catalog classes.","caveats":["Normalized comparison aid, not probability, yield estimate or validated soil effect.","Check local cultivars, planting dates, soil test, market and rotation history with an agricultural expert."],"weights":weights})
    result.sort(key=lambda x:x["score"],reverse=True)
    return {"recommendations":result,"method":"Transparent weighted rule baseline","current_crop":current,"water_availability":water,"priority":priority,"data_gaps":["No farmer-entered soil test supplied","No field-level yield or pest data"],"source":"docs/crop_catalog.md"}
