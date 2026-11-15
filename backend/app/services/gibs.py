"""NASA GIBS WMS image retrieval for listed NASA Earth-observation layers."""
from datetime import date, timedelta
import re
import xml.etree.ElementTree as ET
import requests
from .cache import ttl_cache

BASE_URL = "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi"
LAYERS = {
    "modis_terra": {"id":"MODIS_Terra_CorrectedReflectance_TrueColor","label":"Terra MODIS Corrected Reflectance (True Color)","resolution":"250 m visualization layer","cadence":"Daily corrected-reflectance browse image; cloud and coverage vary by date"},
    "modis_aqua": {"id":"MODIS_Aqua_CorrectedReflectance_TrueColor","label":"Aqua MODIS Corrected Reflectance (True Color)","resolution":"250 m visualization layer","cadence":"Daily corrected-reflectance browse image; cloud and coverage vary by date"},
    "viirs_snpp": {"id":"VIIRS_SNPP_CorrectedReflectance_TrueColor","label":"Suomi NPP VIIRS Corrected Reflectance (True Color)","resolution":"500 m visualization layer","cadence":"Daily corrected-reflectance browse image; cloud and coverage vary by date"},
    "modis_ndvi": {"id":"MODIS_Terra_NDVI_8Day","label":"Terra MODIS 8-day NDVI","resolution":"product grid; see NASA layer metadata","cadence":"8-day vegetation-index composite"},
    "viirs_ndvi": {"id":"VIIRS_SNPP_NDVI_8Day","label":"Suomi NPP VIIRS 8-day NDVI","resolution":"500 m-class global product grid; browse image only","cadence":"8-day composite; select a composite date"},
    "imerg_precipitation": {"id":"IMERG_Precipitation_Rate","label":"GPM IMERG precipitation rate","resolution":"0.1 degree source grid; daily browse visualization","cadence":"Date-specific precipitation-rate browse image; product accumulation period may differ"},
    "smap_surface_moisture": {"id":"SMAP_L4_Analyzed_Surface_Soil_Moisture","label":"SMAP L4 analyzed surface soil moisture","resolution":"9 km source product; browse visualization"},
}

def image_report_metadata(layer_key: str, day: date, lat: float, lon: float, zoom: int = 1) -> dict:
    """Describe the rendered browse image without treating its colors as science values."""
    if layer_key not in LAYERS:
        raise ValueError("Choose a supported NASA GIBS layer")
    if not isinstance(zoom, int) or not 1 <= zoom <= 4:
        raise ValueError("Map zoom must be an integer from 1 to 4")
    half_width, half_height = .45/zoom, .30/zoom
    return {
        "provider": "NASA Global Imagery Browse Services (GIBS)",
        "layer_key": layer_key,
        "product": LAYERS[layer_key]["label"],
        "layer_id": LAYERS[layer_key]["id"],
        "nominal_resolution": LAYERS[layer_key]["resolution"],
        "date": day.isoformat(),
        "cadence": LAYERS[layer_key].get("cadence", "Date-specific browse image; temporal coverage can vary by product"),
        "zoom": zoom,
        "coordinates": {"latitude": lat, "longitude": lon},
        "bounds": {"west": max(-180, lon-half_width), "south": max(-90, lat-half_height),
                   "east": min(180, lon+half_width), "north": min(90, lat+half_height)},
        "image_dimensions": {"width": 900, "height": 600},
        "pixel_values_available": False,
        "pixel_values_note": "GIBS returns a rendered browse image. Its color pixels are not the original scientific measurement values.",
    }

class GIBSError(RuntimeError): pass

@ttl_cache(seconds=21600, max_entries=32)
def fetch_gibs_image(lat: float, lon: float, day: date, layer_key: str, zoom: int = 1) -> tuple[bytes, dict]:
    if layer_key not in LAYERS:
        raise ValueError("Choose a supported NASA GIBS MODIS, VIIRS, GPM IMERG, or SMAP layer")
    if not isinstance(zoom, int) or not 1 <= zoom <= 4:
        raise ValueError("Map zoom must be an integer from 1 to 4")
    # Limit the visual context to a small regional window around the selected point.
    half_width, half_height = .45/zoom, .30/zoom
    west, east = max(-180, lon-half_width), min(180, lon+half_width)
    south, north = max(-90, lat-half_height), min(90, lat+half_height)
    image_format = "image/jpeg" if layer_key in {"modis_terra", "modis_aqua", "viirs_snpp"} else "image/png"
    params={"SERVICE":"WMS","VERSION":"1.1.1","REQUEST":"GetMap","LAYERS":LAYERS[layer_key]["id"],
            "STYLES":"","SRS":"EPSG:4326","BBOX":f"{west},{south},{east},{north}",
            "WIDTH":900,"HEIGHT":600,"FORMAT":image_format,"TIME":day.isoformat()}
    try:
        response=requests.get(BASE_URL,params=params,timeout=25)
        response.raise_for_status()
        content_type=response.headers.get("Content-Type","").lower()
        if not content_type.startswith("image/"):
            raise GIBSError("NASA GIBS returned a non-image response; this layer/date may have no available image")
        return response.content,{"provider":"NASA Global Imagery Browse Services (GIBS)","source":LAYERS[layer_key]["label"],"layer":LAYERS[layer_key],"date":day.isoformat(),"zoom":zoom,"bounds":{"west":west,"south":south,"east":east,"north":north},"coordinates":{"latitude":lat,"longitude":lon},"request_url":response.url,"content_type":content_type.split(";",1)[0],"note":"Rendered browse visualization for regional context. It is not an analysis-ready field measurement and is not used to calculate a field soil-moisture, precipitation, or NDVI value."}
    except requests.RequestException as exc:
        raise GIBSError(f"NASA GIBS imagery could not be retrieved: {exc}") from exc

@ttl_cache(seconds=3600, max_entries=16)
def fetch_gibs_available_dates(layer_key: str) -> list[str]:
    """Return recent dates included in the selected layer's advertised TIME dimension."""
    if layer_key not in LAYERS:
        raise ValueError("Choose a supported NASA GIBS layer")
    try:
        response=requests.get(BASE_URL,params={"SERVICE":"WMS","REQUEST":"GetCapabilities","VERSION":"1.1.1"},timeout=45)
        response.raise_for_status()
        root=ET.fromstring(response.content)
    except (requests.RequestException,ET.ParseError) as exc:
        raise GIBSError(f"NASA GIBS date availability could not be retrieved: {exc}") from exc

    target=LAYERS[layer_key]["id"]
    layer_node=next((node for node in root.iter() if node.tag.endswith("Layer") and
                     any(child.tag.endswith("Name") and child.text==target for child in node)),None)
    if layer_node is None:
        raise GIBSError("NASA GIBS does not advertise dates for this layer")
    values=[]
    for node in layer_node.iter():
        if node.tag.endswith(("Dimension","Extent")) and node.attrib.get("name", "").lower()=="time" and node.text:
            values.extend(node.text.split())
    dates=set()
    today=date.today()
    for value in values:
        for item in value.split(","):
            item=item.strip()
            if not item: continue
            match=re.fullmatch(r"(\d{4}-\d{2}-\d{2})/(\d{4}-\d{2}-\d{2})/(P\d+D)",item)
            if match:
                start=date.fromisoformat(match.group(1)); end=date.fromisoformat(match.group(2))
                step=int(re.search(r"\d+",match.group(3)).group())
                if step < 1: continue
                current=max(start,today-timedelta(days=90))
                offset=(current-start).days
                current=start+timedelta(days=((offset+step-1)//step)*step)
                while current<=min(end,today):
                    dates.add(current.isoformat()); current+=timedelta(days=step)
            else:
                try:
                    day=date.fromisoformat(item[:10])
                    if today-timedelta(days=90)<=day<=today: dates.add(day.isoformat())
                except ValueError: pass
    return sorted(dates,reverse=True)

@ttl_cache(seconds=604800, max_entries=32)
def fetch_gibs_legend(layer_key: str) -> tuple[bytes, dict]:
    """Fetch the official GIBS WMS legend for an allowlisted layer when available."""
    if layer_key not in LAYERS:
        raise ValueError("Choose a supported NASA GIBS layer")
    try:
        capabilities=_fetch_legend_capabilities()
        legend_url=capabilities.get(LAYERS[layer_key]["id"])
        if not legend_url:
            raise GIBSError("NASA GIBS does not advertise a separate legend for this layer")
        response=requests.get(legend_url,timeout=20);response.raise_for_status()
        content_type=response.headers.get("Content-Type","").lower()
        if not content_type.startswith("image/"):
            raise GIBSError("NASA GIBS advertised a legend URL but returned a non-image response")
        return response.content,{"provider":"NASA GIBS","layer":LAYERS[layer_key],"request_url":legend_url,
                                "content_type":content_type.split(";",1)[0],
                                "note":"Official product legend; it describes the rendered map scale and is not a field measurement."}
    except requests.RequestException as exc:
        raise GIBSError(f"NASA GIBS legend could not be retrieved: {exc}") from exc

@ttl_cache(seconds=604800, max_entries=1)
def _fetch_legend_capabilities() -> dict:
    """Resolve only advertised legend URLs from NASA's official WMS capabilities."""
    params={"SERVICE":"WMS","REQUEST":"GetCapabilities","VERSION":"1.1.1"}
    try:
        response=requests.get(BASE_URL,params=params,timeout=45);response.raise_for_status()
        root=ET.fromstring(response.content)
    except (requests.RequestException,ET.ParseError) as exc:
        raise GIBSError(f"NASA GIBS layer capabilities could not be retrieved: {exc}") from exc
    href_key="{http://www.w3.org/1999/xlink}href"; legends={}
    for layer in root.iter():
        if not layer.tag.endswith("Layer"): continue
        name=next((child.text for child in layer if child.tag.endswith("Name")),None)
        if not name: continue
        for style in layer:
            if not style.tag.endswith("Style"): continue
            for node in style.iter():
                if node.tag.endswith("OnlineResource") and node.attrib.get(href_key):
                    href=node.attrib[href_key]
                    if href.startswith("https://gibs.earthdata.nasa.gov/legends/"):
                        legends[name]=href
    return legends
