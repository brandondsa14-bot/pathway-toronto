#!/usr/bin/env python3
"""One-time, opt-in OSM discovery import. Never scrapes Mappedin or City PDF.

Usage (from repo root):
    python3 tools/import_osm_path_candidates.py --fetch
    python3 tools/import_osm_path_candidates.py --from-file /path/to/overpass.json

Snapshot output is gitignored. OSM ODbL attribution/share-alike applies.
DO NOT treat retrieved indoor map records as verified, usable PATH routes.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import sys
from urllib.parse import urlencode
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "data" / "indoor" / "osm_candidates.json"
# Covers the screenshot areas: Union/Financial District to the Eaton Centre.
# It is a bounding box, NOT a verified boundary of the PATH system.
BBOX = (43.6405, -79.3960, 43.6630, -79.3680)
ENDPOINT = "https://overpass-api.de/api/interpreter"
ALLOWED_TAGS = (
    'nwr["shop"]',
    'nwr["amenity"~"^(restaurant|fast_food|cafe|food_court|toilets|bank|atm|pharmacy|pub|bar|drinking_water|post_office|clinic|doctors|dentist)$"]',
    'nwr["indoor"]',
    'nwr["level"~"^(-2|-1|-0\\.5)(;|$)"]',
    'nwr["railway"="subway_entrance"]',
    'nwr["entrance"]',
    'nwr["highway"="elevator"]',
    'nwr["highway"="steps"]',
    'nwr["conveying"]',
    'nwr["building"]["name"]',
)


def build_query() -> str:
    bbox = ",".join(map(str, BBOX))
    return '[out:json][timeout:90];\n(\n' + "\n".join(f" {term}({bbox});" for term in ALLOWED_TAGS) + '\n);\nout center geom;'


def single_floor(tags: dict) -> float | None:
    raw = str(tags.get("level", "")).strip()
    try:
        # Never guess a specific floor from repeat_on, a range or multiple levels.
        if any(t in raw for t in (";", ",", "..")) or not raw:
            return None
        number = float(raw)
        return number if -20 <= number <= 30 and number * 2 == round(number * 2) else None
    except ValueError:
        return None


def category(tags: dict) -> str | None:
    amenity = tags.get("amenity", "")
    shop = tags.get("shop", "")
    if amenity == "toilets": return "Washrooms"
    if tags.get("highway") == "elevator" or tags.get("elevator") == "yes": return "Elevators"
    if tags.get("highway") == "steps" and tags.get("conveying") in {"yes", "forward", "backward", "up", "down", "reversible"}: return "Escalators"
    if tags.get("highway") == "steps": return "Stairs"
    if tags.get("railway") == "subway_entrance": return "Subway entrances"
    if tags.get("entrance") and tags.get("entrance") != "no": return "Entrances"
    if amenity in {"restaurant", "fast_food", "food_court", "pub", "bar"}: return "Restaurants & food"
    if amenity == "cafe" or shop in {"coffee", "tea"}: return "Coffee & cafés"
    if amenity in {"atm", "bank"}: return "ATMs & banks"
    if shop in {"clothes", "shoes", "fashion", "boutique", "jewelry", "bag", "watches", "tailor", "sports"}: return "Fashion"
    if shop in {"electronics", "computer", "mobile_phone", "camera", "hifi", "video", "appliance"}: return "Electronics"
    if shop in {"supermarket", "convenience", "greengrocer", "bakery", "deli", "butcher", "alcohol"}: return "Grocery"
    if shop in {"beauty", "cosmetics", "hairdresser", "perfumery", "massage", "nails"}: return "Beauty & wellness"
    if shop in {"sports_equipment", "fitness"} or amenity in {"gym", "fitness_centre"}: return "Fitness"
    if shop: return "Shopping"
    if tags.get("railway") in {"station", "subway"} or tags.get("public_transport"): return "Transit"
    if tags.get("building") and tags.get("name"): return "Buildings"
    if amenity in {"pharmacy", "post_office", "clinic", "doctors", "dentist"}: return "Services"
    if amenity or tags.get("indoor"): return "Other amenities"
    return None


def extract_point(element: dict):
    if element.get("lat") is not None and element.get("lon") is not None:
        return float(element["lat"]), float(element["lon"]), "OSM_POINT"
    center = element.get("center")
    if isinstance(center, dict) and center.get("lat") is not None:
        return float(center["lat"]), float(center["lon"]), "OSM_FEATURE_CENTROID"
    geometry = element.get("geometry", [])
    if geometry:
        return sum(float(p["lat"]) for p in geometry) / len(geometry), sum(float(p["lon"]) for p in geometry) / len(geometry), "OSM_FEATURE_CENTROID"
    return None


def parse_elements(raw: dict, generated_on: str) -> dict:
    if not isinstance(raw.get("elements"), list):
        raise ValueError("Expected an Overpass API JSON document with elements")
    result = {}
    south,west,north,east=BBOX
    for entry in raw["elements"]:
        typ,ident = entry.get("type"),entry.get("id")
        tags = entry.get("tags") or {}
        if typ not in {"node", "way", "relation"} or not isinstance(ident, int) or not isinstance(tags, dict):
            continue
        cat=category(tags)
        if not cat:
            continue
        pos=extract_point(entry)
        if not pos:
            continue
        lat,lon,quality=pos
        if not south <= lat <= north or not west <= lon <= east:
            continue
        level=single_floor(tags)
        indoor_tag=tags.get("indoor", "").lower()
        path_hint=indoor_tag not in ("", "no") or level is not None and level < 0 or "path" in str(tags.get("name", "")).lower()
        name=str(tags.get("name") or tags.get("brand") or cat.removesuffix("s")).strip()[:110]
        poly=[]
        if cat in {"Buildings", "Shopping", "Fashion", "Electronics", "Grocery", "Beauty & wellness", "Fitness", "Restaurants & food", "Other amenities"}:
            rawpoints=entry.get("geometry") or []
            if len(rawpoints)>=4 and len(rawpoints)<=300:
                pts=[]
                for pt in rawpoints:
                    if isinstance(pt,dict) and "lat" in pt and "lon" in pt:
                        pts.append([float(pt["lon"]),float(pt["lat"])])
                if len(pts)>=4 and pts[0]==pts[-1]: poly=pts
        result[f"osm:{typ}:{ident}"]={
            "id":f"osm:{typ}:{ident}","name":name,"category":cat,"lat":lat,"lon":lon,
            "floor":level,"scope":"POSSIBLE_PATH" if path_hint else "NEARBY_DOWNTOWN",
            "position_quality":quality,"verification_status":"COMMUNITY_MAPPED_UNVERIFIED",
            "building":str(tags.get("addr:street") or "")[:80],
            "street":str(tags.get("addr:street") or "")[:80],
            "geometry":poly,
            "source_url":f"https://www.openstreetmap.org/{typ}/{ident}",
            "indoor_tag":indoor_tag[:30],
            "osm_level_tag":str(tags.get("level", ""))[:40],
            "accessible_tag":str(tags.get("wheelchair", ""))[:40],
        }
    items=sorted(result.values(),key=lambda p:(p["category"],p["name"],p["id"]))
    return {"schema_version":1,"status":"COMMUNITY_DATA_UNREVIEWED","generated_on":generated_on,
            "area":"Downtown Toronto study area; NOT a verified PATH boundary",
            "source":"OpenStreetMap contributors","license":"ODbL-1.0",
            "attribution_url":"https://www.openstreetmap.org/copyright", "bbox":list(BBOX),
            "items":items}


def main():
    ap=argparse.ArgumentParser(description=__doc__)
    src=ap.add_mutually_exclusive_group(required=True)
    src.add_argument("--fetch",action="store_true",help="One-time Overpass data request; Internet required")
    src.add_argument("--from-file",type=Path,help="Load a locally saved Overpass JSON response")
    ap.add_argument("--output",type=Path,default=DEST)
    args=ap.parse_args()
    if args.fetch:
        query=build_query()
        request=Request(ENDPOINT,data=urlencode({"data":query}).encode("utf-8"),
                        headers={"User-Agent":"PATHwayTorontoResearchImporter/0.1 (local one-time import)","Content-Type":"application/x-www-form-urlencoded"},
                        method="POST")
        print("Fetching OSM candidate records (one-off query); this may be rate-limited.", file=sys.stderr)
        with urlopen(request,timeout=115) as response:
            content=response.read(25_000_001)
        if len(content)>25_000_000: raise ValueError("Response too large; narrow geographic query")
        raw=json.loads(content)
    else:
        raw=json.loads(args.from_file.read_text(encoding="utf-8"))
    result=parse_elements(raw,datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"))
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    count=len(result["items"])
    print(f"Saved {count} community-mapped candidate locations to {args.output}")
    print(f"Possible-PATH by OSM tags: {sum(p['scope']=='POSSIBLE_PATH' for p in result['items'])}; NOT verified as PATH entrances or walking routes.")
    print("Attribution: © OpenStreetMap contributors (ODbL); https://www.openstreetmap.org/copyright")

if __name__=="__main__":main()
