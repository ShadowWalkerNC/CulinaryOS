"""core.content.pipeline — the canonical content pipeline.

Stages:
  1. context  — resolve a BusinessContext (business brain) for the request.
  2. generate — produce the master caption.
  3. adapt    — format per-platform variants (IG, FB, Google, TikTok, X).
  4. score    — calculate engagement scores and heuristic indicators.
  5. validate — audit against brand guard rules (banned words, tone, CTA, length).
  6. assemble — pack into a structured ContentResult.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

from core.business_brain.models import BusinessContext
from core.business_brain.service import load_context_from_dict
from .generator import (
    adapt_caption_for_platforms,
    calculate_engagement_heuristics,
    generate_master_caption,
)

logger = logging.getLogger(__name__)

PIPELINE_STAGES: List[str] = [
    "context",
    "generate",
    "adapt",
    "score",
    "validate",
    "assemble",
]

DEFAULT_PLATFORMS: List[str] = ["instagram", "facebook", "google", "tiktok", "x"]


@dataclass
class ContentRequest:
    """Input parameters for content pipeline run."""

    business_info: Dict[str, Any] = field(default_factory=dict)
    content_type: str = "daily_special"
    tone: str = "friendly"
    item_name: str = ""
    price: str = ""
    description: str = ""
    event_title: str = ""
    event_date: str = ""
    ticket_url: str = ""
    available_until: str = ""
    platforms: List[str] = field(default_factory=list)
    keywords: List[str] = field(default_factory=list)
    context: Optional[BusinessContext] = None


@dataclass
class ContentResult:
    """Output generated across all pipeline stages."""

    master: str = ""
    adapted: Dict[str, str] = field(default_factory=dict)
    scores: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    validation: Tuple[bool, List[str]] = (True, [])
    stages_run: List[str] = field(default_factory=list)
    context: Optional[BusinessContext] = None


class ContentPipeline:
    """Canonical multi-stage marketing content pipeline."""

    def __init__(self, platforms: Optional[List[str]] = None):
        self.default_platforms = list(platforms or DEFAULT_PLATFORMS)

    def run(self, request: ContentRequest) -> ContentResult:
        """Run all pipeline stages and return the assembled result."""
        result = ContentResult()
        stages: List[str] = []

        # Stage 1: Context resolution
        context = request.context or load_context_from_dict(request.business_info)
        result.context = context
        stages.append("context")

        b_name = (
            context.identity.business_name
            or request.business_info.get("name")
            or "Our Restaurant"
        )
        tone = request.tone or context.brand_voice.tone or "friendly"
        platforms = request.platforms or self.default_platforms

        # Stage 2: Generate master caption
        master = generate_master_caption(
            business_name=b_name,
            item_name=request.item_name or (context.specials[0].item_name if context.specials else ""),
            price=request.price or (context.specials[0].price if context.specials else ""),
            description=request.description or (context.specials[0].description if context.specials else ""),
            tone=tone,
            content_type=request.content_type,
            location=context.locations[0].label if context.locations else "",
            event_title=request.event_title or (context.events[0].title if context.events else ""),
            event_date=request.event_date or (context.events[0].event_date if context.events else ""),
            ticket_url=request.ticket_url or (context.events[0].ticket_url if context.events else ""),
            available_until=request.available_until,
        )
        result.master = master
        stages.append("generate")

        # Stage 3: Adapt per platform
        adapted = adapt_caption_for_platforms(
            master_caption=master,
            platforms=platforms,
            hashtags=context.brand_voice.hashtags,
            business_name=b_name,
        )
        result.adapted = adapted
        stages.append("adapt")

        # Stage 4: Engagement heuristics scoring
        scores: Dict[str, Dict[str, Any]] = {}
        for plat, text in adapted.items():
            scores[plat] = calculate_engagement_heuristics(text, platform=plat)
        result.scores = scores
        stages.append("score")

        # Stage 5: Validation (Brand Guard checks)
        issues: List[str] = []
        banned = context.brand_voice.banned_words
        for bad_word in banned:
            if bad_word.lower() in master.lower():
                issues.append(f"Contains forbidden brand word: '{bad_word}'")

        if len(master.strip()) < 10:
            issues.append("Master copy is too short")

        is_valid = len(issues) == 0
        result.validation = (is_valid, issues)
        stages.append("validate")

        # Stage 6: Assemble
        stages.append("assemble")
        result.stages_run = stages

        return result


def generate_content(
    business_info: Optional[Dict[str, Any]] = None,
    content_type: str = "daily_special",
    tone: str = "friendly",
    item_name: str = "",
    price: str = "",
    description: str = "",
    event_title: str = "",
    event_date: str = "",
    ticket_url: str = "",
    platforms: Optional[List[str]] = None,
) -> ContentResult:
    """Convenience functional helper to execute the pipeline."""
    req = ContentRequest(
        business_info=business_info or {},
        content_type=content_type,
        tone=tone,
        item_name=item_name,
        price=price,
        description=description,
        event_title=event_title,
        event_date=event_date,
        ticket_url=ticket_url,
        platforms=platforms or DEFAULT_PLATFORMS,
    )
    return ContentPipeline().run(req)
