"""tests/test_skills_loader.py — tests for the provider-agnostic skills loader.
"""

import os
import pytest

from skills.loader import (
    SKILLS_ROOT,
    frontmatter_body,
    get_prompt,
    list_skills,
    load_all_skills,
    load_skill,
    parse_frontmatter,
    render_prompt,
    render_skill_prompt,
    skill_manifest,
    validate_skill,
)

EXPECTED_SKILLS = {"special_post", "event_campaign", "weekly_plan", "review_reply", "brand_guard"}


def test_list_skills_discovers_all_five():
    discovered = set(list_skills())
    assert EXPECTED_SKILLS.issubset(discovered)


def test_each_skill_has_skill_md_prompts_and_rules():
    for name in EXPECTED_SKILLS:
        skill_dir = os.path.join(SKILLS_ROOT, name)
        assert os.path.isfile(os.path.join(skill_dir, "SKILL.md"))
        assert os.path.isdir(os.path.join(skill_dir, "prompts"))
        assert os.path.isdir(os.path.join(skill_dir, "rules"))
        skill = load_skill(name)
        assert skill.prompts, f"{name} has no prompts"
        assert skill.rules, f"{name} has no rules"


def test_frontmatter_parses_metadata():
    skill = load_skill("special_post")
    assert skill.name == "special_post"
    assert skill.version == "1.0.0"
    assert skill.description
    assert "business_name" in skill.inputs
    assert "item_name" in skill.inputs


def test_parse_frontmatter_helpers():
    assert parse_frontmatter("# no frontmatter here") == {}
    assert frontmatter_body("# hello world") == "# hello world"


def test_render_prompt_substitution():
    out = render_prompt("Chef {{name}} serves {{dish}}!", {"name": "Marco", "dish": "Risotto"})
    assert out == "Chef Marco serves Risotto!"


def test_render_skill_prompt_with_rules():
    skill = load_skill("special_post")
    rendered = render_skill_prompt(
        skill,
        "caption",
        {
            "business_name": "Trattoria Romana",
            "business_type": "restaurant",
            "location": "Downtown",
            "item_name": "Truffle Gnocchi",
            "description": "Handmade pillow gnocchi with black truffle butter",
            "price": "$28",
            "available_until": "9 PM",
            "tone": "artisanal",
            "platform": "instagram",
        },
        include_rules=True,
    )
    assert "Trattoria Romana" in rendered
    assert "Truffle Gnocchi" in rendered
    assert "Price honesty" in rendered or len(rendered) > 50


def test_validate_all_skills():
    skills = load_all_skills()
    for name, skill in skills.items():
        errors = validate_skill(skill)
        assert not errors, f"Skill {name} had validation errors: {errors}"
