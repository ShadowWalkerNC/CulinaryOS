"""core.business_brain.models — unified business context data model.

One typed place for everything content generation and marketing agents need to know
about a restaurant: identity, brand voice, menu/prices, locations, hours,
specials, events, media, prior posts, performance, and constraints.

Plain dataclasses with no external I/O.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class Identity:
    """Who the business is."""

    user_id: str = ""
    restaurant_id: str = ""
    business_name: str = "Our Restaurant"
    business_type: str = "restaurant"
    cuisine: str = "Modern American"
    email: str = ""
    phone: str = ""
    website_url: str = ""
    plan: str = "standard"


@dataclass
class BrandVoice:
    """How the business sounds."""

    tone: str = "friendly"
    keywords: List[str] = field(default_factory=list)
    hashtags: List[str] = field(default_factory=list)
    banned_words: List[str] = field(default_factory=list)


@dataclass
class MenuItem:
    """A menu item with optional price."""

    name: str = ""
    description: str = ""
    price: Optional[str] = None
    category: str = "entree"


@dataclass
class Location:
    """A place the business operates from."""

    label: str = ""
    address: str = ""
    city: str = ""
    state: str = ""
    postal_code: str = ""
    lat: Optional[float] = None
    lng: Optional[float] = None


@dataclass
class HoursInfo:
    """Regular hours plus dated overrides/closures."""

    regular: str = ""
    overrides: List[Dict[str, Any]] = field(default_factory=list)


@dataclass
class SpecialItem:
    """A scheduled daily special or 86 hype item."""

    id: Optional[str] = None
    item_name: str = ""
    description: str = ""
    price: Optional[str] = None
    post_date: str = ""
    post_time: str = ""
    content_type: str = "daily_special"
    tone: str = ""
    image_url: Optional[str] = None
    status: str = "active"


@dataclass
class EventItem:
    """A scheduled event promo."""

    id: Optional[str] = None
    title: str = ""
    description: str = ""
    event_date: str = ""
    post_date: str = ""
    post_time: str = ""
    event_type: str = "event"
    tone: str = ""
    image_url: Optional[str] = None
    ticket_url: Optional[str] = None
    status: str = "upcoming"


@dataclass
class MediaAsset:
    """A reusable image/video asset."""

    url: str = ""
    kind: str = "image"
    caption: str = ""
    source: str = "specials"


@dataclass
class PriorPost:
    """A previously generated/published post."""

    id: Optional[str] = None
    caption: str = ""
    content_type: str = "text"
    platform: str = "instagram"
    created_at: Optional[int] = None


@dataclass
class PerformanceSummary:
    """Engagement and posting metrics."""

    total_posts: int = 0
    avg_engagement_rate: float = 0.0
    last_post_at: Optional[int] = None


@dataclass
class Constraints:
    """Platform and tone constraints."""

    plan: str = "pro"
    max_captions_per_day: int = 50
    allowed_platforms: List[str] = field(
        default_factory=lambda: ["instagram", "facebook", "google", "tiktok", "x"]
    )


@dataclass
class BusinessContext:
    """The unified restaurant context object for content generation."""

    identity: Identity = field(default_factory=Identity)
    brand_voice: BrandVoice = field(default_factory=BrandVoice)
    menu: List[MenuItem] = field(default_factory=list)
    locations: List[Location] = field(default_factory=list)
    hours: HoursInfo = field(default_factory=HoursInfo)
    specials: List[SpecialItem] = field(default_factory=list)
    events: List[EventItem] = field(default_factory=list)
    media: List[MediaAsset] = field(default_factory=list)
    prior_posts: List[PriorPost] = field(default_factory=list)
    performance: PerformanceSummary = field(default_factory=PerformanceSummary)
    constraints: Constraints = field(default_factory=Constraints)

    def to_business_info(self) -> Dict[str, Any]:
        """Convert context to standard business_info dict."""
        location = self.locations[0].label if self.locations else ""
        special = self.specials[0].item_name if self.specials else ""
        info: Dict[str, Any] = {
            "name": self.identity.business_name,
            "type": self.identity.business_type,
            "location": location,
            "hours": self.hours.regular,
            "special": special,
            "city": self.locations[0].city if self.locations and self.locations[0].city else location,
            "hashtags": list(self.brand_voice.hashtags),
            "keywords": list(self.brand_voice.keywords),
            "tone": self.brand_voice.tone,
        }
        return info

    def to_template_info(self) -> Dict[str, Any]:
        """Convert context to template generator info dict."""
        location = self.locations[0].label if self.locations else ""
        return {
            "business_type": self.identity.business_type,
            "business_name": self.identity.business_name,
            "location": location or "Downtown",
            "hours": self.hours.regular or "11 AM - 10 PM",
            "city": self.locations[0].city if self.locations and self.locations[0].city else "Our City",
            "special_item": (
                self.specials[0].item_name if self.specials else "Chef's Special"
            ),
            "hashtags": list(self.brand_voice.hashtags),
        }
