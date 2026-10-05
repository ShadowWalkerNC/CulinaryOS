"""core.business_brain.service — build unified BusinessContext instances.

Supports:
1. `load_context_from_dict()`: Pure in-memory construction from dictionary payloads (offline/testing/scripts).
2. `load_context_from_culinaryos()`: Ingests normalized CulinaryOS menu, specials, hours, and restaurant profiles.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from .models import (
    BrandVoice,
    BusinessContext,
    Constraints,
    EventItem,
    HoursInfo,
    Identity,
    Location,
    MenuItem,
    SpecialItem,
)

logger = logging.getLogger(__name__)


def _split_keywords(val: Any) -> List[str]:
    """Split comma or newline separated keywords into a clean list."""
    if isinstance(val, list):
        return [str(item).strip() for item in val if str(item).strip()]
    if isinstance(val, str):
        parts = [p.strip() for p in val.replace("\n", ",").split(",") if p.strip()]
        return parts
    return []


def load_context_from_dict(data: Dict[str, Any]) -> BusinessContext:
    """Build a BusinessContext from a plain dict (no external DB required)."""
    data = dict(data or {})
    ctx = BusinessContext()

    ctx.identity.business_name = str(
        data.get("business_name") or data.get("name") or "Our Restaurant"
    )
    ctx.identity.business_type = str(
        data.get("business_type") or data.get("type") or "restaurant"
    )
    ctx.identity.email = str(data.get("email") or "")
    ctx.identity.phone = str(data.get("phone") or "")
    ctx.identity.website_url = str(data.get("website_url") or "")
    ctx.identity.plan = str(data.get("plan") or "standard")
    ctx.identity.user_id = str(data.get("user_id") or "")
    ctx.identity.restaurant_id = str(data.get("restaurant_id") or "")

    ctx.brand_voice.tone = str(
        data.get("tone") or data.get("ai_tone") or "friendly"
    )
    ctx.brand_voice.keywords = _split_keywords(
        data.get("keywords") or data.get("ai_keywords") or []
    )
    ctx.brand_voice.hashtags = [
        str(h).strip()
        for h in (data.get("hashtags") or [])
        if str(h).strip()
    ]
    ctx.brand_voice.banned_words = [
        str(b).strip()
        for b in (data.get("banned_words") or [])
        if str(b).strip()
    ]

    loc_str = str(data.get("location") or "")
    if loc_str:
        city = str(data.get("city") or (loc_str.split(",")[0].strip() if "," in loc_str else loc_str))
        ctx.locations.append(Location(label=loc_str, city=city))

    ctx.hours.regular = str(data.get("hours") or "11:00 AM - 10:00 PM")

    # Menu items
    raw_menu = data.get("menu") or []
    for item in raw_menu:
        if isinstance(item, dict):
            ctx.menu.append(
                MenuItem(
                    name=str(item.get("name", "")),
                    description=str(item.get("description", "")),
                    price=str(item.get("price", "")) if item.get("price") is not None else None,
                    category=str(item.get("category", "entree")),
                )
            )
        elif isinstance(item, str):
            ctx.menu.append(MenuItem(name=item))

    # Specials
    raw_specials = data.get("specials") or []
    if not raw_specials and (data.get("special") or data.get("special_item")):
        raw_specials = [{
            "item_name": str(data.get("special") or data.get("special_item")),
            "description": str(data.get("special_description") or ""),
            "price": str(data.get("special_price") or ""),
        }]
    for sp in raw_specials:
        if isinstance(sp, dict):
            ctx.specials.append(
                SpecialItem(
                    item_name=str(sp.get("item_name") or sp.get("name", "")),
                    description=str(sp.get("description", "")),
                    price=str(sp.get("price", "")) if sp.get("price") is not None else None,
                    post_date=str(sp.get("post_date") or sp.get("date", "")),
                    tone=str(sp.get("tone") or ctx.brand_voice.tone),
                )
            )

    # Events
    raw_events = data.get("events") or []
    for ev in raw_events:
        if isinstance(ev, dict):
            ctx.events.append(
                EventItem(
                    title=str(ev.get("title") or ev.get("name", "")),
                    description=str(ev.get("description", "")),
                    event_date=str(ev.get("event_date") or ev.get("date", "")),
                    ticket_url=str(ev.get("ticket_url") or ev.get("url", "")),
                    tone=str(ev.get("tone") or ctx.brand_voice.tone),
                )
            )

    return ctx


def load_context_from_culinaryos(restaurant: Dict[str, Any], menu_payload: Optional[Dict[str, Any]] = None) -> BusinessContext:
    """Build a BusinessContext directly from CulinaryOS entity payloads."""
    data: Dict[str, Any] = {
        "restaurant_id": restaurant.get("id"),
        "business_name": restaurant.get("name") or "CulinaryOS Restaurant",
        "business_type": restaurant.get("concept") or "restaurant",
        "phone": restaurant.get("phone", ""),
        "email": restaurant.get("email", ""),
        "website_url": restaurant.get("website", ""),
        "location": restaurant.get("address", ""),
        "hours": restaurant.get("hours_summary", "11:00 AM - 10:00 PM"),
        "tone": restaurant.get("marketing_tone", "friendly"),
        "keywords": restaurant.get("keywords", []),
    }

    if menu_payload and isinstance(menu_payload, dict):
        items = menu_payload.get("items") or []
        data["menu"] = items

    return load_context_from_dict(data)
