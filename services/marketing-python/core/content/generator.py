"""core.content.generator — provider-agnostic content generation and platform adaptation.

Deterministic execution with zero mandatory external API calls:
Generates rich hospitality marketing copy across 5 platform surfaces.
"""

from __future__ import annotations

import re
from typing import Any, Dict, List, Optional


def generate_master_caption(
    business_name: str,
    item_name: str = "",
    price: str = "",
    description: str = "",
    tone: str = "friendly",
    content_type: str = "daily_special",
    location: str = "",
    event_title: str = "",
    event_date: str = "",
    ticket_url: str = "",
    available_until: str = "",
) -> str:
    """Generate high-performing master copy tailored to hospitality context."""
    b_name = business_name or "Our Kitchen"
    t = (tone or "friendly").lower()

    if content_type in ("daily_special", "special"):
        item = item_name or "Today's Chef Special"
        price_tag = f" for only {price}" if price else ""
        until_tag = f" Available until {available_until} or until sold out!" if available_until else " Fresh from our kitchen while supplies last."
        desc_line = f" {description}." if description else ""

        if t in ("hype", "bold"):
            return (
                f"🔥 DAILY SPECIAL ALERT at {b_name}! We're serving up {item}{price_tag}!{desc_line}"
                f"{until_tag} Grab yours before it's gone — order online or pull up to the counter today!"
            )
        elif t in ("artisanal", "craft", "chef"):
            return (
                f"From our kitchen to your table: Today's featured selection at {b_name} is our {item}{price_tag}."
                f"{desc_line} Prepared fresh in-house with seasonal ingredients. Available today only."
            )
        else:
            return (
                f"Today at {b_name}: {item}{price_tag}!{desc_line}{until_tag} "
                f"Stop by or place your order online for pickup!"
            )

    elif content_type in ("event", "event_campaign"):
        title = event_title or item_name or "Special Community Event"
        date_str = f" on {event_date}" if event_date else " this week"
        tix = f" Reserve your spot now: {ticket_url}" if ticket_url else " Save the date and bring the whole crew!"

        if t in ("hype", "bold"):
            return (
                f"🎉 BIG NEWS: {title} is going down at {b_name}{date_str}! "
                f"{description} Doors open early and space is limited!{tix}"
            )
        else:
            return (
                f"Join us at {b_name} for {title}{date_str}. {description} "
                f"We can't wait to host you!{tix}"
            )

    elif content_type == "weekly_plan":
        return (
            f"Here is what's cooking this week at {b_name}! "
            f"Join us for seasonal features, daily chef specials, and exceptional hospitality. "
            f"Check our bio or visit our website to view this week's full menu."
        )

    # General / Behind-the-scenes
    desc = f" {description}" if description else " Handcrafted daily with passion and pride."
    return f"Welcome to {b_name}!{desc} Visit us today or order ahead online."


def adapt_caption_for_platforms(
    master_caption: str,
    platforms: Optional[List[str]] = None,
    hashtags: Optional[List[str]] = None,
    business_name: str = "",
) -> Dict[str, str]:
    """Adapt a single master caption into tailored variants for each platform."""
    selected_platforms = platforms or ["instagram", "facebook", "google", "tiktok", "x"]
    tags = list(hashtags or [])
    if not tags:
        brand_slug = re.sub(r"[^a-zA-Z0-9]", "", business_name).lower() if business_name else "culinaryos"
        tags = [f"#{brand_slug}", "#foodie", "#restaurantlife", "#freshfood", "#eatlocal"]

    tags_str = " ".join(tags[:6])
    adapted: Dict[str, str] = {}

    for p in selected_platforms:
        plat = p.lower()
        if plat in ("instagram", "ig"):
            adapted["instagram"] = f"{master_caption}\n\n📍 Link in bio to view menu & order.\n\n{tags_str}"
        elif plat in ("facebook", "fb"):
            adapted["facebook"] = f"{master_caption}\n\n📌 Stop by today or click below to view hours and order online!"
        elif plat in ("google", "google_business", "gb"):
            clean_text = master_caption.replace("🔥", "").replace("🎉", "")
            adapted["google"] = f"{clean_text}\nCall or visit our website for takeout and table reservations."
        elif plat in ("tiktok", "tt"):
            short_hook = master_caption.split(".")[0]
            adapted["tiktok"] = f"{short_hook}! Sound on 🔊 Check the link in bio! {tags_str}"
        elif plat in ("x", "twitter", "tw"):
            # Enforce 280 char limit
            clean = master_caption
            if len(clean) > 230:
                clean = clean[:227] + "..."
            adapted["x"] = f"{clean} #foodie #fresh"
        else:
            adapted[plat] = master_caption

    return adapted


def calculate_engagement_heuristics(caption: str, platform: str = "instagram") -> Dict[str, Any]:
    """Calculate engagement metrics and score (0-100) based on proven social heuristics."""
    length = len(caption)
    words = len(caption.split())
    has_cta = bool(re.search(r"\b(order|visit|call|link|bio|reserve|book|stop by|come in)\b", caption, re.IGNORECASE))
    has_emoji = bool(re.search(r"[\U00010000-\U0010ffff]", caption))
    has_hashtags = "#" in caption

    score = 50
    if has_cta:
        score += 25
    if has_emoji:
        score += 15
    if has_hashtags and platform in ("instagram", "tiktok", "x"):
        score += 10

    # Length penalties
    if platform == "x" and length > 280:
        score -= 40
    elif length < 20:
        score -= 20

    score = max(10, min(100, score))

    return {
        "score": score,
        "word_count": words,
        "char_count": length,
        "has_cta": has_cta,
        "has_emoji": has_emoji,
        "has_hashtags": has_hashtags,
        "platform": platform,
    }
