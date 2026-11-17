"""Explicit, production-safe API settings. No secrets read or logged."""
from __future__ import annotations

import os
from urllib.parse import urlparse

DEV_ORIGINS = (
    "http://localhost:3000", "http://localhost:3001", "http://localhost:3002",
    "http://127.0.0.1:3000", "http://127.0.0.1:3001", "http://127.0.0.1:3002",
)


def is_production() -> bool:
    return os.environ.get("PATHWAY_ENV", "development").lower() == "production"


def allowed_origins() -> list[str]:
    """Production refuses to start with missing/invalid allowlisted origins.

    Configure e.g. PATHWAY_ALLOWED_ORIGINS=https://my-frontend.example
    DO NOT pass a full API key or Google Maps URL here.
    """
    supplied = os.environ.get("PATHWAY_ALLOWED_ORIGINS", "")
    origins = [s.strip().rstrip("/") for s in supplied.split(",") if s.strip()]
    if not origins:
        if is_production():
            raise ValueError("PATHWAY_ALLOWED_ORIGINS is required in production")
        return list(DEV_ORIGINS)
    for value in origins:
        parsed = urlparse(value)
        valid = parsed.scheme in {"http", "https"} and bool(parsed.netloc) and not (
            parsed.username or parsed.password or parsed.path not in {"", "/"} or
            parsed.query or parsed.fragment or "*" in value
        )
        if not valid or (is_production() and parsed.scheme != "https"):
            raise ValueError("Invalid origin in PATHWAY_ALLOWED_ORIGINS: use complete HTTPS origins without paths or wildcards")
    return sorted(set(origins))
