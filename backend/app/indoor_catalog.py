"""Source-backed destination directory. Listing does NOT validate unit/door geometry."""
from __future__ import annotations
import json
from pathlib import Path
from urllib.parse import urlparse
from .indoor_network import INDOOR_PATH, SOURCES_PATH, load_network

CATALOG_PATH = INDOOR_PATH.with_name("destinations.json")


def load_catalog(path: Path = CATALOG_PATH) -> dict:
    catalog = json.loads(path.read_text(encoding="utf8"))
    registry = json.loads(SOURCES_PATH.read_text(encoding="utf8"))
    network = load_network()
    if catalog.get("schema_version") != "1.0" or not isinstance(catalog.get("destinations"), list):
        raise ValueError("Unsupported destination directory schema")
    approved_sources = {s["id"] for s in registry["sources"]}
    anchors = {n["id"] for n in network["nodes"]}
    seen: set[str] = set()
    for dest in catalog["destinations"]:
        ident = dest.get("id")
        if not isinstance(ident, str) or not ident or ident in seen or ident in anchors:
            raise ValueError("Invalid, duplicate or conflicting destination ID")
        seen.add(ident)
        if dest.get("building_anchor_id") not in anchors or not dest.get("building_name"):
            raise ValueError(f"Missing building anchor: {ident}")
        if not dest.get("name") or not dest.get("category") or dest.get("kind") != "business":
            raise ValueError(f"Missing directory details: {ident}")
        if not dest.get("directory_checked_on") or dest.get("location_status") != "BUILDING_LISTED_ONLY":
            raise ValueError(f"Directory provenance/claim invalid: {ident}")
        if dest.get("navigation_ready") is not False or any(dest.get(k) is not None for k in ("lat", "lon", "level")):
            raise ValueError(f"Unverified business must not claim surveyed coordinates/floor/routes: {ident}")
        srcs = dest.get("source_ids")
        if not isinstance(srcs, list) or not srcs or set(srcs) - approved_sources:
            raise ValueError(f"Unrecognized source for {ident}")
        for field in ("directory_url", "website_url"):
            url = dest.get(field)
            if not isinstance(url, str) or urlparse(url).scheme != "https" or not urlparse(url).netloc:
                raise ValueError(f"Invalid HTTPS {field}: {ident}")
    return catalog


def search_catalog(text: str = "", category: str = "all") -> list[dict]:
    records = load_catalog()["destinations"]
    term = text.strip().casefold()
    return [record for record in records if (category.casefold() == "all" or record["category"].casefold() == category.casefold()) and
            (not term or term in " ".join((record["name"], record["category"], record["building_name"])).casefold())]
