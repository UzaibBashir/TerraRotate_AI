"""NASA POWER daily point API adapter; no alternate satellite source is used."""
from datetime import date
import requests

BASE_URL = "https://power.larc.nasa.gov/api/temporal/daily/point"
PARAMETERS = ("T2M", "PRECTOTCORR")
PROJECTION_URL = "https://power.larc.nasa.gov/api/projection/monthly/point"
HYDROLOGY_PARAMETERS = ("PRECTOTCORR", "SFMC", "RZMC", "EVPTRNS")
MONTHLY_URL = "https://power.larc.nasa.gov/api/temporal/monthly/point"

class PowerError(RuntimeError): pass

def fetch_power_projection(lat: float, lon: float, start_year: int, end_year: int) -> dict:
    params={"parameters":",".join(PARAMETERS),"community":"AG","longitude":f"{lon:.5f}",
            "latitude":f"{lat:.5f}","start":f"{start_year}01","end":f"{end_year}12",
            "format":"JSON","time-standard":"UTC","model":"ensemble"}
    try:
        response=requests.get(PROJECTION_URL,params=params,timeout=35)
        response.raise_for_status()
        payload=response.json(); data=payload["properties"]["parameter"]
        scenarios=("ssp126","ssp245","ssp370")
        rows=[]
        for parameter in PARAMETERS:
            for scenario in scenarios:
                series=data[parameter].get(scenario,{})
                if not isinstance(series,dict): continue
                for ym,value in sorted(series.items()):
                    if value is not None and float(value)>-900:
                        rows.append({"month":ym,"scenario":scenario,"parameter":parameter,"value":float(value)})
        return {"source":"NASA POWER Projection API","provider":"NASA Langley Research Center POWER Project",
                "model":"ensemble","scenarios":list(scenarios),"parameters":list(PARAMETERS),
                "coordinates":{"latitude":lat,"longitude":lon},"period":{"start_year":start_year,"end_year":end_year},
                "rows":rows,"url":response.url,"sample_mode":False,
                "note":"Multi-model climate scenario context; not a field-scale forecast or a prediction of farm outcomes."}
    except (requests.RequestException,ValueError,KeyError,TypeError) as exc:
        raise PowerError(f"NASA POWER projection data could not be retrieved or parsed: {exc}") from exc

def fetch_power_daily(lat: float, lon: float, start: date, end: date) -> dict:
    params = {"parameters": ",".join(PARAMETERS), "community": "AG", "longitude": f"{lon:.5f}",
              "latitude": f"{lat:.5f}", "start": start.strftime("%Y%m%d"),
              "end": end.strftime("%Y%m%d"), "format": "JSON", "time-standard":"UTC"}
    try:
        response = requests.get(BASE_URL, params=params, timeout=20)
        response.raise_for_status()
        payload = response.json()
        data = payload["properties"]["parameter"]
        rows = []
        for day in sorted(data["T2M"]):
            t, p = data["T2M"].get(day), data["PRECTOTCORR"].get(day)
            valid = lambda value: value is not None and float(value) > -900
            rows.append({"date": day, "temperature_c": float(t) if valid(t) else None,
                         "precipitation_mm_day": float(p) if valid(p) else None})
        n = sum(r["temperature_c"] is not None or r["precipitation_mm_day"] is not None for r in rows)
        return {"source":"NASA POWER", "url":response.url, "provider":"NASA Langley Research Center POWER Project",
                "coordinates":{"latitude":lat,"longitude":lon},
                "period":{"start":start.isoformat(),"end":end.isoformat()}, "parameters":list(PARAMETERS),
                "rows":rows,"quality":{"expected_days":len(rows),"days_with_any_value":n,"missing_days":len(rows)-n},
                "retrieved_at":date.today().isoformat(),"sample_mode":False}
    except (requests.RequestException, ValueError, KeyError, TypeError) as exc:
        raise PowerError(f"NASA POWER data could not be retrieved or parsed: {exc}") from exc

def fetch_power_water(lat: float, lon: float, start: date, end: date) -> dict:
    """Fetch NASA POWER daily hydrology variables exposed through the AG endpoint."""
    params={"parameters":",".join(HYDROLOGY_PARAMETERS),"community":"AG","longitude":f"{lon:.5f}",
            "latitude":f"{lat:.5f}","start":start.strftime("%Y%m%d"),"end":end.strftime("%Y%m%d"),
            "format":"JSON","time-standard":"UTC"}
    try:
        response=requests.get(BASE_URL,params=params,timeout=30); response.raise_for_status()
        values=response.json()["properties"]["parameter"]
        dates=sorted(set().union(*(set(series) for series in values.values() if isinstance(series,dict))))
        rows=[]
        for day in dates:
            row={"date":day}
            for param in HYDROLOGY_PARAMETERS:
                value=values.get(param,{}).get(day)
                try: value=float(value) if value is not None and float(value)>-900 else None
                except (ValueError,TypeError): value=None
                row[param.lower()]=value
            rows.append(row)
        return {"source":"NASA POWER Daily hydrology parameters","provider":"NASA Langley Research Center POWER Project",
                "community":"AG (API-tested); parameter families are hydrology-related","parameters":list(HYDROLOGY_PARAMETERS),"coordinates":{"latitude":lat,"longitude":lon},
                "period":{"start":start.isoformat(),"end":end.isoformat()},"rows":rows,
                "resolution_note":"Hydrology parameters can use different native source grids; soil moisture and meteorology should not be assumed to share a pixel resolution.",
                "units_note":"PRECTOT is mm/day; SFMC and RZMC are volumetric water content; EVPTRNS is an energy flux and is not converted here to water depth.",
                "url":response.url,"sample_mode":False}
    except (requests.RequestException,ValueError,KeyError,TypeError) as exc:
        raise PowerError(f"NASA POWER hydrology data could not be retrieved or parsed: {exc}") from exc

def fetch_power_monthly_profile(lat: float, lon: float, start_year: int, end_year: int) -> dict:
    """Fetch NASA POWER monthly historical T2M and precipitation for climate analogues."""
    params={"parameters":"T2M,PRECTOTCORR","community":"AG","longitude":f"{lon:.5f}","latitude":f"{lat:.5f}",
            "start":str(start_year),"end":str(end_year),"format":"JSON"}
    try:
        response=requests.get(MONTHLY_URL,params=params,timeout=35); response.raise_for_status()
        values=response.json()["properties"]["parameter"]
        rows=[]
        for month in sorted(values.get("T2M",{})):
            if len(month)!=6 or month[-2:] not in {f"{i:02}" for i in range(1,13)}: continue
            temp=values["T2M"].get(month); rain=values.get("PRECTOTCORR",{}).get(month)
            valid=lambda v: v is not None and float(v)>-900
            rows.append({"month":month,"temperature_c":float(temp) if valid(temp) else None,
                         "precipitation_mm_day":float(rain) if valid(rain) else None})
        return {"source":"NASA POWER Monthly Point API","provider":"NASA Langley Research Center POWER Project",
                "coordinates":{"latitude":lat,"longitude":lon},"period":{"start_year":start_year,"end_year":end_year},
                "parameters":["T2M","PRECTOTCORR"],"rows":rows,"url":response.url,
                "resolution_note":"Nearest source grid; native resolution and source can vary by parameter.","sample_mode":False}
    except (requests.RequestException,ValueError,KeyError,TypeError) as exc:
        raise PowerError(f"NASA POWER monthly climate data could not be retrieved or parsed: {exc}") from exc
