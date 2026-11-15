"""Summarize an analysis-ready, user-downloaded NASA raster within a field.

Supports georeferenced raster formats readable by Rasterio/GDAL, including
GeoTIFF and compatible HDF/NetCDF subdatasets selected explicitly by the user.
It does not guess product bands, scaling factors, QA masks, or units.
"""
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
import sys

try:
    import numpy as np
    import rasterio
    from rasterio.features import geometry_mask
    from rasterio.warp import transform_geom
except ImportError as exc:  # pragma: no cover - verified by CLI smoke
    raise SystemExit("Install scripts/requirements.txt, including rasterio, before raster analysis") from exc


def summarize_raster(path: Path, polygon: dict, band: int = 1, date: str = "",
                     source: str = "", product: str = "", scale: float = 1.0,
                     offset: float = 0.0, qa_path: Path | None = None,
                     qa_band: int = 1, reject_qa_values: set[int] | None = None) -> dict:
    if not source or not product:
        raise ValueError("Source and exact NASA product/version are required provenance")
    if polygon.get("type") not in {"Polygon", "MultiPolygon"}:
        raise ValueError("Provide a GeoJSON Polygon or MultiPolygon")
    with rasterio.open(path) as ds:
        if not ds.crs:
            raise ValueError("Raster has no coordinate reference system")
        if band < 1 or band > ds.count:
            raise ValueError(f"band must be in 1..{ds.count}")
        geom = transform_geom("EPSG:4326", ds.crs, polygon, precision=8)
        inside = geometry_mask([geom], out_shape=(ds.height, ds.width), transform=ds.transform,
                               invert=True, all_touched=False)
        data = ds.read(band, masked=True).astype("float64")
        values = data.filled(np.nan) * scale + offset
        valid = inside & ~np.ma.getmaskarray(data) & np.isfinite(values)
        qa_excluded = 0
        if qa_path:
            with rasterio.open(qa_path) as qa_ds:
                if qa_ds.crs != ds.crs or qa_ds.transform != ds.transform or qa_ds.shape != ds.shape:
                    raise ValueError("QA raster grid must exactly match science raster; regrid using product guidance first")
                if qa_band < 1 or qa_band > qa_ds.count:
                    raise ValueError(f"qa_band must be in 1..{qa_ds.count}")
                qa = qa_ds.read(qa_band, masked=True)
                if reject_qa_values:
                    rejected = np.isin(qa.filled(-999999), list(reject_qa_values))
                    qa_excluded = int((valid & rejected).sum())
                    valid &= ~rejected
        selected = values[valid]
        if selected.size == 0:
            raise ValueError("No valid raster pixels intersect the supplied polygon after masks")
        pixel_area = abs(ds.transform.a * ds.transform.e - ds.transform.b * ds.transform.d)
        return {
            "source": source,
            "product": product,
            "observation_date": date or None,
            "raster_file": path.name,
            "crs": str(ds.crs),
            "band": band,
            "scale_factor": scale,
            "add_offset": offset,
            "native_pixel_area_crs_units_squared": pixel_area,
            "units": ds.tags(band).get("units"),
            "polygon_pixel_count": int(inside.sum()),
            "valid_pixel_count": int(selected.size),
            "qa_excluded_pixel_count": qa_excluded,
            "masked_pixel_count": int(inside.sum()) - int(valid.sum()),
            "statistics": {
                "minimum": float(np.min(selected)), "maximum": float(np.max(selected)),
                "mean": float(np.mean(selected)), "median": float(np.median(selected)),
                "standard_deviation": float(np.std(selected)),
            },
            "quality_status": "partial" if int(selected.size) < int(inside.sum()) else "complete",
            "processing_method": "Polygon mask in raster CRS; native pixel grid; nodata masked; caller-specified scale/offset and optional caller-specified QA rejection values.",
            "limitations": ["Spatial summary is only as reliable as the selected product, band, scale, QA interpretation, and supplied field polygon.",
                            "Area estimates in source CRS units are not hectares unless that CRS uses meters and the affine transform is appropriate.",
                            "This summary is not a crop disease diagnosis or validated agronomic rating."],
        }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("raster", type=Path)
    parser.add_argument("--boundary", required=True, type=Path, help="GeoJSON file containing Polygon/MultiPolygon geometry")
    parser.add_argument("--date", required=True, help="Raster observation date (ISO YYYY-MM-DD)")
    parser.add_argument("--source", required=True, help="Allowlisted NASA source, e.g. NASA MODIS")
    parser.add_argument("--product", required=True, help="Exact collection/product/version from granule metadata")
    parser.add_argument("--band", type=int, default=1)
    parser.add_argument("--scale", type=float, default=1.0, help="Product-documented scale; default 1")
    parser.add_argument("--offset", type=float, default=0.0, help="Product-documented offset; default 0")
    parser.add_argument("--qa-raster", type=Path)
    parser.add_argument("--qa-band", type=int, default=1)
    parser.add_argument("--reject-qa", default="", help="Comma-separated QA integer values to mask; only use product documentation")
    parser.add_argument("--output", type=Path)
    args = parser.parse_args(argv)
    try:
        if len(args.date) != 10:
            raise ValueError("date must be ISO YYYY-MM-DD")
        polygon = json.loads(args.boundary.read_text(encoding="utf-8"))
        if polygon.get("type") == "Feature": polygon = polygon.get("geometry", {})
        rejects = {int(v) for v in args.reject_qa.split(",") if v.strip()} or None
        result = summarize_raster(args.raster, polygon, args.band, args.date, args.source,
                                  args.product, args.scale, args.offset, args.qa_raster,
                                  args.qa_band, rejects)
        result["retrieved_at"] = __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat()
        rendered = json.dumps(result, indent=2)
        if args.output: args.output.write_text(rendered, encoding="utf-8")
        print(rendered)
        return 0
    except (OSError, json.JSONDecodeError, ValueError, rasterio.errors.RasterioError) as exc:
        print(str(exc), file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
