"""Search and selectively download challenge-listed NASA Earthdata granules.

The user must supply a product short name, spatial/temporal bounds, and a
locally configured Earthdata bearer token. This intentionally avoids a bulk
"download everything" operation and records a provenance manifest.
"""
from __future__ import annotations

import argparse
import json
import os
from datetime import datetime, timezone
from pathlib import Path
import re
import sys
from urllib.parse import urlparse

import requests

CMR_URL = "https://cmr.earthdata.nasa.gov/search/granules.json"
ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUT = ROOT / "data" / "earthdata"
ALLOWED_RESOURCE_HINTS = {
    "SMAP": ("SMAP",),
    "GPM/IMERG": ("IMERG", "GPM"),
    "Landsat/MODIS/VIIRS": ("LANDSAT", "MODIS", "VIIRS"),
    "SRTM": ("SRTM",),
    "ECOSTRESS": ("ECOSTRESS",),
    "GLDAS": ("GLDAS",),
    "GEDI": ("GEDI",),
}


class EarthdataError(RuntimeError):
    pass


def parse_bbox(value: str) -> str:
    try:
        west, south, east, north = (float(part.strip()) for part in value.split(","))
    except (ValueError, TypeError) as exc:
        raise argparse.ArgumentTypeError("bbox must be west,south,east,north") from exc
    if not all(map(lambda v: v == v and abs(v) != float("inf"), (west, south, east, north))):
        raise argparse.ArgumentTypeError("bbox values must be finite")
    if not (-180 <= west < east <= 180 and -90 <= south < north <= 90):
        raise argparse.ArgumentTypeError("bbox must satisfy -180≤west<east≤180 and -90≤south<north≤90")
    return f"{west},{south},{east},{north}"


def choose_data_link(links: list[dict]) -> str:
    for link in links:
        href = link.get("href", "")
        rel = link.get("rel", "")
        if (href.startswith("https://") and
                "earthdata.nasa.gov" in urlparse(href).netloc and
                "data#" in rel and "inherited" not in rel and not link.get("inherited")):
            return href
    for link in links:
        href = link.get("href", "")
        if href.startswith("https://") and "earthdata.nasa.gov" in urlparse(href).netloc:
            return href
    raise EarthdataError("CMR returned no direct HTTPS NASA Earthdata link for this granule")


def search_granules(short_name: str, start: str, end: str, bbox: str,
                    token: str, limit: int, session=requests) -> list[dict]:
    if not short_name.strip() or len(short_name) > 120:
        raise EarthdataError("Provide the exact CMR collection short name from Earthdata Search")
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z,\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z", f"{start},{end}"):
        raise EarthdataError("Dates must be UTC ISO timestamps, for example 2024-06-01T00:00:00Z")
    if end <= start:
        raise EarthdataError("End date/time must be later than start date/time")
    if not 1 <= limit <= 100:
        raise EarthdataError("limit must be from 1 to 100 granules")
    try:
        response = session.get(CMR_URL, params={"short_name": short_name, "temporal": f"{start},{end}",
                                                "bounding_box": bbox, "page_size": limit},
                              headers={"Authorization": f"Bearer {token}", "Accept": "application/json"},
                              timeout=45)
        response.raise_for_status()
        entries = response.json()["feed"]["entry"]
    except (requests.RequestException, ValueError, KeyError, TypeError) as exc:
        raise EarthdataError(f"Earthdata CMR search failed: {exc}") from exc
    return entries[:limit]


def download_selected(entries: list[dict], output: Path, resource: str, short_name: str,
                      token: str, session=requests) -> dict:
    output.mkdir(parents=True, exist_ok=True)
    items = []
    for entry in entries:
        title = entry.get("title", "granule")
        links = entry.get("links", [])
        url = choose_data_link(links)
        name = Path(urlparse(url).path).name
        if not name or name in {".", ".."}:
            name = re.sub(r"[^A-Za-z0-9._-]", "_", title)[:160]
        target = output / name
        if target.resolve().parent != output.resolve():
            raise EarthdataError("CMR supplied an unsafe output filename")
        if target.exists():
            items.append({"title": title, "url": url, "file": name, "bytes": target.stat().st_size,
                          "status": "already_present"})
            continue
        try:
            with session.get(url, headers={"Authorization": f"Bearer {token}"}, stream=True,
                             allow_redirects=True, timeout=(30, 180)) as response:
                response.raise_for_status()
                written = 0
                with target.open("xb") as stream:
                    for chunk in response.iter_content(chunk_size=1024 * 1024):
                        if chunk:
                            stream.write(chunk)
                            written += len(chunk)
        except Exception:
            target.unlink(missing_ok=True)
            raise
        items.append({"title": title, "url": url, "file": name, "bytes": written,
                      "status": "downloaded", "time_start": entry.get("time_start"),
                      "time_end": entry.get("time_end"), "producer_granule_id": entry.get("producer_granule_id")})
    manifest = {
        "retrieved_at": datetime.now(timezone.utc).isoformat(),
        "provider": "NASA Earthdata / Common Metadata Repository",
        "resource": resource,
        "collection_short_name_user_selected": short_name,
        "search_granule_count": len(entries),
        "downloads": items,
        "note": "Granules are downloaded only for the user-selected collection, date range, bounds, and result limit. Inspect each product's documentation, quality flags, spatial coverage, and license before analysis.",
    }
    (output / "download_manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    return manifest


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--resource", required=True, choices=sorted(ALLOWED_RESOURCE_HINTS),
                        help="NASA resource family as listed in docs/nasa_resource_allowlist.md")
    parser.add_argument("--short-name", required=True, help="Exact CMR collection short name from Earthdata Search")
    parser.add_argument("--start", required=True, help="UTC ISO start timestamp, e.g. 2024-06-01T00:00:00Z")
    parser.add_argument("--end", required=True, help="UTC ISO end timestamp")
    parser.add_argument("--bbox", required=True, type=parse_bbox, help="west,south,east,north")
    parser.add_argument("--limit", type=int, default=10, help="Maximum granules to download (1–100, default 10)")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUT)
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    token = os.environ.get("EARTHDATA_TOKEN", "").strip()
    if not token:
        parser.error("Set EARTHDATA_TOKEN in your local shell or .env.local; never put it in chat or commit it")
    if not any(hint in args.short_name.upper() for hint in ALLOWED_RESOURCE_HINTS[args.resource]):
        parser.error(f"Collection short name does not match the selected {args.resource} challenge resource family")
    try:
        entries = search_granules(args.short_name, args.start, args.end, args.bbox, token, args.limit)
        if not entries:
            print("CMR returned no granules for the requested collection, area, and period.")
            return 0
        manifest = download_selected(entries, args.output, args.resource, args.short_name, token)
        print(json.dumps({"output": str(args.output.resolve()), "granules": len(manifest["downloads"]),
                          "manifest": str((args.output / "download_manifest.json").resolve())}, indent=2))
        return 0
    except EarthdataError as exc:
        print(str(exc), file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
