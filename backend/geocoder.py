from __future__ import annotations

import httpx
import time
import logging

logger = logging.getLogger(__name__)

# In-memory cache — persists for the lifetime of the process
_cache: dict[str, tuple[float, float]] = {}

HEADERS = {"User-Agent": "WarMapTracker/1.0 (conflict-map project)"}


def geocode(location_name: str) -> tuple[float, float] | None:
    if not location_name:
        return None

    key = location_name.strip().lower()
    if key in _cache:
        return _cache[key]

    # Nominatim rate limit: 1 request per second
    time.sleep(1)

    try:
        resp = httpx.get(
            "https://nominatim.openstreetmap.org/search",
            params={"q": location_name, "format": "json", "limit": 1},
            headers=HEADERS,
            timeout=8,
        )
        resp.raise_for_status()
        results = resp.json()
        if results:
            lat = float(results[0]["lat"])
            lon = float(results[0]["lon"])
            _cache[key] = (lat, lon)
            logger.info(f"Geocoded '{location_name}' → ({lat}, {lon})")
            return lat, lon
    except Exception as e:
        logger.warning(f"Geocoding failed for '{location_name}': {e}")

    return None
