"""integrations/culinaryos/client.py — Adapter for CulinaryOS REST APIs and webhooks.

Reads CulinaryOS data (menu, specials, events, hours) and normalizes it into
marketing shapes for automated campaign planning and content generation.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import logging
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

DEFAULT_TIMEOUT = 10


@dataclass
class CulinaryOSConfig:
    """Connection config for CulinaryOS backend."""

    base_url: str = "http://localhost:3000"
    tenant_id: str = "00000000-0000-0000-0000-000000000001"
    api_key: str = ""
    webhook_secret: str = ""
    timeout: int = DEFAULT_TIMEOUT
    headers: Dict[str, str] = field(default_factory=dict)


class CulinaryOSError(RuntimeError):
    """Raised for transport or authentication failures talking to CulinaryOS."""


# ---------------------------------------------------------------------------
# Normalizers: CulinaryOS payloads -> Marketing shapes
# ---------------------------------------------------------------------------


def normalize_menu(payload: Any) -> Dict[str, List[Dict[str, str]]]:
    """Return {'items': [{name, description, price, category}]} from menu payload."""
    items: List[Dict[str, str]] = []
    raw_items: list = []

    if isinstance(payload, dict):
        raw_items = payload.get("items") or payload.get("menu") or payload.get("data") or []
    elif isinstance(payload, list):
        raw_items = payload

    for entry in raw_items:
        if not isinstance(entry, dict):
            continue
        # Support cents conversion if integer
        raw_price = entry.get("price") or entry.get("price_cents") or ""
        if isinstance(raw_price, int):
            price_str = f"${raw_price / 100:.2f}"
        else:
            price_str = str(raw_price)

        items.append({
            "name": str(entry.get("name", entry.get("title", ""))),
            "description": str(entry.get("description", "")),
            "price": price_str,
            "category": str(entry.get("category", "entree")),
        })
    return {"items": items}


def normalize_specials(payload: Any) -> List[Dict[str, str]]:
    """Return marketing specials-shaped rows from CulinaryOS payload."""
    rows: List[Dict[str, str]] = []
    raw: list = (
        payload
        if isinstance(payload, list)
        else (payload or {}).get("specials", [])
        if isinstance(payload, dict)
        else []
    )
    for entry in raw:
        if not isinstance(entry, dict):
            continue
        raw_price = entry.get("price") or ""
        if isinstance(raw_price, int):
            price_str = f"${raw_price / 100:.2f}"
        else:
            price_str = str(raw_price)

        rows.append({
            "item_name": str(entry.get("item_name", entry.get("name", ""))),
            "description": str(entry.get("description", "")),
            "price": price_str,
            "post_date": str(entry.get("date", entry.get("post_date", ""))),
            "post_time": str(entry.get("time", entry.get("post_time", "11:00"))),
        })
    return rows


def normalize_events(payload: Any) -> List[Dict[str, str]]:
    """Return marketing events-shaped rows from CulinaryOS payload."""
    rows: List[Dict[str, str]] = []
    raw: list = (
        payload
        if isinstance(payload, list)
        else (payload or {}).get("events", [])
        if isinstance(payload, dict)
        else []
    )
    for entry in raw:
        if not isinstance(entry, dict):
            continue
        rows.append({
            "title": str(entry.get("title", entry.get("name", ""))),
            "description": str(entry.get("description", "")),
            "event_date": str(entry.get("event_date", entry.get("date", ""))),
            "ticket_url": str(entry.get("ticket_url", entry.get("url", ""))),
        })
    return rows


def normalize_hours(payload: Any) -> Dict[str, Any]:
    """Return normalized hours information."""
    if isinstance(payload, dict):
        regular = str(payload.get("regular") or payload.get("hours") or "11:00 AM - 10:00 PM")
        overrides = payload.get("overrides") or []
        return {"regular": regular, "overrides": overrides}
    elif isinstance(payload, str):
        return {"regular": payload, "overrides": []}
    return {"regular": "11:00 AM - 10:00 PM", "overrides": []}


def verify_webhook_signature(
    raw_body: bytes, signature_header: str, secret: str
) -> bool:
    """Verify HMAC-SHA256 signature from CulinaryOS webhooks."""
    if not secret or not signature_header:
        return False
    computed = hmac.new(
        secret.encode("utf-8"), raw_body, hashlib.sha256
    ).hexdigest()
    # Support both bare hex and 'sha256=...' prefixes
    clean_sig = signature_header.replace("sha256=", "").strip()
    return hmac.compare_digest(computed, clean_sig)


# ---------------------------------------------------------------------------
# Client Implementation
# ---------------------------------------------------------------------------


class CulinaryOSClient:
    """REST client for CulinaryOS menu and specials endpoints."""

    def __init__(self, config: Optional[CulinaryOSConfig] = None):
        self.config = config or CulinaryOSConfig()

    def _headers(self) -> Dict[str, str]:
        headers = {
            "Content-Type": "application/json",
            "X-Tenant-Id": self.config.tenant_id,
        }
        if self.config.api_key:
            headers["Authorization"] = f"Bearer {self.config.api_key}"
        headers.update(self.config.headers)
        return headers

    def get_menu(self) -> Dict[str, List[Dict[str, str]]]:
        """Fetch menu items from CulinaryOS."""
        import urllib.request
        import urllib.error

        url = f"{self.config.base_url.rstrip('/')}/v1/menu"
        req = urllib.request.Request(url, headers=self._headers(), method="GET")
        try:
            with urllib.request.urlopen(req, timeout=self.config.timeout) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                return normalize_menu(data)
        except Exception as exc:
            logger.warning("Failed to fetch menu from %s: %s", url, exc)
            raise CulinaryOSError(f"Could not fetch menu from CulinaryOS: {exc}") from exc

    def get_specials(self) -> List[Dict[str, str]]:
        """Fetch daily specials / 86 items from CulinaryOS."""
        import urllib.request
        import urllib.error

        url = f"{self.config.base_url.rstrip('/')}/v1/specials"
        req = urllib.request.Request(url, headers=self._headers(), method="GET")
        try:
            with urllib.request.urlopen(req, timeout=self.config.timeout) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                return normalize_specials(data)
        except Exception as exc:
            logger.warning("Failed to fetch specials from %s: %s", url, exc)
            raise CulinaryOSError(f"Could not fetch specials from CulinaryOS: {exc}") from exc
