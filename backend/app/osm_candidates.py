"""Attribution-preserving OSM *discovery candidates*, NOT vetted indoor routes.

All venue affiliation, floor connectivity, accessibility, hours and entrances remain
unverified until supported by independent evidence. Never merge with indoor_graph.
"""
from __future__ import annotations

from collections import Counter
import json
from math import isfinite
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SNAPSHOT_PATH = ROOT / "data" / "indoor" / "osm_candidates.json"
CATEGORIES = (
    "Buildings", "Restaurants & food", "Coffee & cafés", "Shopping",
    "Fashion", "Electronics", "Grocery", "Beauty & wellness", "Fitness",
    "Washrooms", "Escalators", "Elevators", "Stairs", "Subway entrances",
    "Entrances", "ATMs & banks", "Transit", "Services", "Other amenities",
)


def empty_snapshot() -> dict:
    return {
        "schema_version": 1, "status": "NO_OSM_SNAPSHOT", "generated_on": None,
        "area": "Downtown Toronto study area (not an official PATH boundary)",
        "source": "OpenStreetMap contributors", "license": "ODbL-1.0",
        "attribution_url": "https://www.openstreetmap.org/copyright",
        "items": [],
    }


def load_snapshot(path: Path | None = None) -> dict:
    path = path or SNAPSHOT_PATH
    if not path.is_file():
        return empty_snapshot()
    if path.stat().st_size > 15_000_000:
        raise ValueError("OSM discovery snapshot exceeds the approved size limit")
    data = json.loads(path.read_text(encoding="utf-8"))
    if data.get("schema_version") != 1 or not isinstance(data.get("items"), list):
        raise ValueError("Unrecognized OSM candidate snapshot schema")
    if len(data["items"]) > 25_000:
        raise ValueError("Too many OSM candidates")
    for item in data["items"]:
        if item.get("category") not in CATEGORIES:
            raise ValueError("Invalid OSM candidate category")
        if not item.get("id", "").startswith("osm:") or not isinstance(item.get("name"), str):
            raise ValueError("Invalid OSM candidate")
        if not isinstance(item.get("lat"), (float, int)) or not isinstance(item.get("lon"), (float, int)):
            raise ValueError("Missing OSM coordinates")
        if not all(isfinite(float(item[k])) for k in ("lat", "lon")) or not (43.60 <= item["lat"] <= 43.72 and -79.46 <= item["lon"] <= -79.29):
            raise ValueError("Outside documented downtown Toronto data extent")
        if item.get("position_quality") not in {"OSM_POINT", "OSM_FEATURE_CENTROID"}:
            raise ValueError("Position quality missing")
        if item.get("floor") is not None and (not isinstance(item["floor"], (int, float)) or not -20 <= item["floor"] <= 30):
            raise ValueError("Invalid floor tag")
        if item.get("verification_status") != "COMMUNITY_MAPPED_UNVERIFIED":
            raise ValueError("OSM candidates may not claim verified PATH geometry")
        if item.get("scope") not in {"POSSIBLE_PATH", "NEARBY_DOWNTOWN"}:
            raise ValueError("Invalid PATH scope classification")
    return data


def explore_catalog(data: dict, q: str = "", category: str = "all", level: str = "all", scope: str = "all", limit: int = 5000) -> dict:
    terms = q.strip().casefold()
    if category != "all" and category not in CATEGORIES:
        return {"status": "INVALID_CATEGORY", "items": [], "total": 0, "returned": 0, "categories": list(CATEGORIES)}
    if scope not in {"all", "POSSIBLE_PATH", "NEARBY_DOWNTOWN"}:
        scope = "all"
    target_level: float | None = None
    if level != "all":
        try:
            target_level = float(level)
        except (ValueError, TypeError):
            return {"status": "INVALID_LEVEL", "items": [], "total": 0, "returned": 0, "categories": list(CATEGORIES)}
    items = [p for p in data["items"] if
             (category == "all" or p["category"] == category) and
             (scope == "all" or p["scope"] == scope) and
             (target_level is None or p["floor"] == target_level) and
             (not terms or terms in f"{p['name']} {p['category']} {p.get('street', '')}".casefold())]
    items.sort(key=lambda p: (p["scope"] != "POSSIBLE_PATH", p["category"], p["name"]))
    return {
        "status": data["status"], "source": data["source"], "license": data["license"],
        "attribution_url": data["attribution_url"], "generated_on": data["generated_on"],
        "total": len(items), "returned": min(len(items), limit),
        "categories": list(CATEGORIES),
        "floors_in_source": sorted(set(p["floor"] for p in data["items"] if p["floor"] is not None)),
        "path_candidate_count": sum(p["scope"] == "POSSIBLE_PATH" for p in data["items"]),
        "category_totals": dict(Counter(p["category"] for p in data["items"])),
        "items": items[:limit],
        "disclaimer": ("OpenStreetMap locations are community mapped, may be incomplete or stale, and are NOT confirmed PATH-only, floor-accurate, or navigable. "
                       "No walking instructions are derived from these entries."),
    }
