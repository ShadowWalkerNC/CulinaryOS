"""services.marketing-python.main — FastAPI microservice for autonomous restaurant marketing.

Consolidates Post-Pilot marketing capabilities into CulinaryOS:
- 5 operational skills (brand_guard, event_campaign, review_reply, special_post, weekly_plan)
- Canonical multi-stage content pipeline
- Brand voice auditing & platform adaptation
- CulinaryOS REST API sync & normalization
"""

from __future__ import annotations

import os
from typing import Any, Dict, List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from core.business_brain.models import BusinessContext
from core.business_brain.service import load_context_from_dict
from core.content.pipeline import ContentPipeline, ContentRequest
from integrations.culinaryos.client import (
    CulinaryOSClient,
    CulinaryOSConfig,
    normalize_menu,
    normalize_specials,
)
from skills.loader import (
    list_skills,
    load_all_skills,
    load_skill,
    render_skill_prompt,
    skill_manifest,
)

app = FastAPI(
    title="CulinaryOS Marketing Microservice",
    description="Autonomous social marketing, campaign scheduling, and brand guardrails for restaurants.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Request & Response Schemas
# ---------------------------------------------------------------------------


class HealthResponse(BaseModel):
    status: str = "ok"
    service: str = "marketing-python"
    version: str = "1.0.0"
    skills_count: int = 5


class SkillRunRequest(BaseModel):
    prompt_name: str = "caption"
    variables: Dict[str, Any] = Field(default_factory=dict)
    include_rules: bool = True


class BrandGuardAuditRequest(BaseModel):
    draft: str
    banned_words: Optional[List[str]] = None
    required_cta: bool = False
    platform: str = "instagram"
    tone: str = "friendly"


class BrandGuardAuditResponse(BaseModel):
    pass_: bool = Field(alias="pass")
    verdict: str  # "PASS" | "FAIL"
    reasons: List[str] = Field(default_factory=list)
    suggested_fix: str = "none"


class CampaignGenerateRequest(BaseModel):
    content_type: str = "daily_special"  # "daily_special" | "event" | "weekly_plan"
    business_name: str = "Our Restaurant"
    tone: str = "friendly"  # "friendly" | "hype" | "artisanal" | "bold"
    item_name: Optional[str] = None
    price: Optional[str] = None
    description: Optional[str] = None
    event_title: Optional[str] = None
    event_date: Optional[str] = None
    ticket_url: Optional[str] = None
    available_until: Optional[str] = None
    platforms: Optional[List[str]] = None
    keywords: Optional[List[str]] = None


class CampaignGenerateResponse(BaseModel):
    master: str
    adapted: Dict[str, str]
    scores: Dict[str, Dict[str, Any]]
    validation: Dict[str, Any]
    stages_run: List[str]


class SyncCulinaryOSRequest(BaseModel):
    base_url: Optional[str] = None
    tenant_id: Optional[str] = None
    payload: Optional[Dict[str, Any]] = None


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@app.get("/health", response_model=HealthResponse)
def health_check() -> HealthResponse:
    """Service health check."""
    return HealthResponse(
        status="ok",
        service="marketing-python",
        version="1.0.0",
        skills_count=len(list_skills()),
    )


@app.get("/skills")
def get_skills() -> Dict[str, Any]:
    """List all available operational skills with manifests."""
    manifests = skill_manifest()
    return {
        "skills": list_skills(),
        "manifests": manifests,
    }


@app.post("/skills/{skill_name}/run")
def run_skill(skill_name: str, req: SkillRunRequest) -> Dict[str, Any]:
    """Execute a skill template with provided variables."""
    try:
        skill = load_skill(skill_name)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Skill '{skill_name}' not found")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    try:
        rendered = render_skill_prompt(
            skill,
            prompt_name=req.prompt_name,
            variables=req.variables,
            include_rules=req.include_rules,
        )
    except KeyError as exc:
        raise HTTPException(status_code=400, detail=f"Prompt not found: {exc}")

    return {
        "skill": skill_name,
        "prompt": req.prompt_name,
        "rendered": rendered,
        "variables": req.variables,
    }


@app.post("/brand-guard/audit", response_model=BrandGuardAuditResponse)
def audit_brand_guard(req: BrandGuardAuditRequest) -> BrandGuardAuditResponse:
    """Audit marketing copy against brand guardrules."""
    draft = req.draft or ""
    reasons: List[str] = []

    # 1. Banned words check
    banned = req.banned_words or ["cheap", "crappy", "garbage", "fail", "slow service"]
    for word in banned:
        if word.lower() in draft.lower():
            reasons.append(f"Forbidden word detected: '{word}'")

    # 2. Profanity check
    profanities = ["fuck", "shit", "bitch", "bastard", "asshole", "damn"]
    for prof in profanities:
        if prof in draft.lower():
            reasons.append(f"Inappropriate language detected: '{prof}'")

    # 3. Required CTA check
    if req.required_cta:
        cta_keywords = ["order", "visit", "call", "link", "reserve", "book", "stop by", "bio"]
        if not any(k in draft.lower() for k in cta_keywords):
            reasons.append("Missing required call-to-action (visit, order, call, bio, reserve)")

    # 4. Length limits per platform
    if req.platform in ("x", "twitter") and len(draft) > 280:
        reasons.append(f"Character limit exceeded for X ({len(draft)} / 280 max)")

    passed = len(reasons) == 0
    verdict = "PASS" if passed else "FAIL"
    suggested = "none" if passed else f"Revise: {'; '.join(reasons)}"

    return BrandGuardAuditResponse(
        **{
            "pass": passed,
            "verdict": verdict,
            "reasons": reasons,
            "suggested_fix": suggested,
        }
    )


@app.post("/campaigns/generate", response_model=CampaignGenerateResponse)
def generate_campaign(req: CampaignGenerateRequest) -> CampaignGenerateResponse:
    """Generate multi-platform campaign copy through the canonical content pipeline."""
    pipeline = ContentPipeline(platforms=req.platforms)
    content_req = ContentRequest(
        business_info={"name": req.business_name},
        content_type=req.content_type,
        tone=req.tone,
        item_name=req.item_name or "",
        price=req.price or "",
        description=req.description or "",
        event_title=req.event_title or "",
        event_date=req.event_date or "",
        ticket_url=req.ticket_url or "",
        available_until=req.available_until or "",
        platforms=req.platforms or ["instagram", "facebook", "google", "tiktok", "x"],
        keywords=req.keywords or [],
    )

    result = pipeline.run(content_req)

    return CampaignGenerateResponse(
        master=result.master,
        adapted=result.adapted,
        scores=result.scores,
        validation={"ok": result.validation[0], "issues": result.validation[1]},
        stages_run=result.stages_run,
    )


@app.post("/sync/culinaryos")
def sync_culinaryos(req: SyncCulinaryOSRequest) -> Dict[str, Any]:
    """Sync or normalize data from CulinaryOS into marketing context."""
    if req.payload:
        menu = normalize_menu(req.payload)
        specials = normalize_specials(req.payload)
        return {
            "source": "payload",
            "menu_items_count": len(menu.get("items", [])),
            "specials_count": len(specials),
            "menu": menu,
            "specials": specials,
        }

    # Fetch via REST client if base_url is specified
    config = CulinaryOSConfig(
        base_url=req.base_url or "http://localhost:3000",
        tenant_id=req.tenant_id or "00000000-0000-0000-0000-000000000001",
    )
    client = CulinaryOSClient(config)
    try:
        menu = client.get_menu()
        return {
            "source": "api",
            "menu_items_count": len(menu.get("items", [])),
            "menu": menu,
        }
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Failed to sync with CulinaryOS: {exc}")
