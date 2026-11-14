"""NASA GIBS WMS image retrieval for listed NASA Earth-observation layers."""
from datetime import date
import requests
from .cache import ttl_cache

BASE_URL = "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi"
LAYERS = {
    "modis_terra": {"id":"MODIS_Terra_CorrectedReflectance_TrueColor","label":"Terra MODIS Corrected Reflectance (True Color)","resolution":"250 m visualization layer"},
    "modis_aqua": {"id":"MODIS_Aqua_CorrectedReflectance_TrueColor","label":"Aqua MODIS Corrected Reflectance (True Color)","resolution":"250 m visualization layer"},
    "viirs_snpp": {"id":"VIIRS_SNPP_CorrectedReflectance_TrueColor","label":"Suomi NPP VIIRS Corrected Reflectance (True Color)","resolution":"500 m visualization layer"},
    "modis_ndvi": {"id":"MODIS_Terra_NDVI_8Day","label":"Terra MODIS 8-day NDVI","resolution":"product grid; see NASA layer metadata"},
    "imerg_precipitation": {"id":"IMERG_Precipitation_Rate","label":"GPM IMERG precipitation rate","resolution":"0.1 degree source grid; daily browse visualization"},
    "smap_surface_moisture": {"id":"SMAP_L4_Analyzed_Surface_Soil_Moisture","label":"SMAP L4 analyzed surface soil moisture","resolution":"9 km source product; browse visualization"},
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
        return response.content,{"provider":"NASA Global Imagery Browse Services (GIBS)","source":LAYERS[layer_key]["label"],"layer":LAYERS[layer_key],"date":day.isoformat(),"zoom":zoom,"bounds":{"west":west,"south":south,"east":east,"north":north},"coordinates":{"latitude":lat,"longitude":lon},"request_url":response.url,"content_type":content_type.split(";",1)[0],"note":"Rendered browse visualization for regional context. It is not an analysis-ready field measurement and is not used to calculate a field soil-moisture or precipitation value."}
    except requests.RequestException as exc:
        raise GIBSError(f"NASA GIBS imagery could not be retrieved: {exc}") from exc

@ttl_cache(seconds=604800, max_entries=32)
def fetch_gibs_legend(layer_key: str) -> tuple[bytes, dict]:
    """Fetch the official GIBS WMS legend for an allowlisted layer when available."""
    if layer_key not in LAYERS:
        raise ValueError("Choose a supported NASA GIBS layer")
    params={"SERVICE":"WMS","VERSION":"1.1.1","REQUEST":"GetLegendGraphic",
            "LAYER":LAYERS[layer_key]["id"],"FORMAT":"image/png","STYLE":"default"}
    try:
        response=requests.get(BASE_URL,params=params,timeout=20);response.raise_for_status()
        content_type=response.headers.get("Content-Type","").lower()
        if not content_type.startswith("image/"):
            raise GIBSError("NASA GIBS does not provide a legend graphic for this layer")
        return response.content,{"provider":"NASA GIBS","layer":LAYERS[layer_key],"request_url":response.url,
                                "content_type":content_type.split(";",1)[0],
                                "note":"Official product legend; it describes the rendered map scale and is not a field measurement."}
    except requests.RequestException as exc:
        raise GIBSError(f"NASA GIBS legend could not be retrieved: {exc}") from exc
