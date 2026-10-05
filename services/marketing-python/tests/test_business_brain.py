"""tests/test_business_brain.py — tests for unified business context models and service.
"""

from core.business_brain.models import BusinessContext
from core.business_brain.service import (
    load_context_from_dict,
    load_context_from_culinaryos,
)


def test_load_context_from_dict_defaults():
    ctx = load_context_from_dict({})
    assert isinstance(ctx, BusinessContext)
    assert ctx.identity.business_name == "Our Restaurant"
    assert ctx.brand_voice.tone == "friendly"
    assert ctx.hours.regular == "11:00 AM - 10:00 PM"


def test_load_context_from_dict_complete_payload():
    payload = {
        "business_name": "Alley Katz Fish & Chicken",
        "business_type": "fast_casual",
        "email": "contact@alleykatz.test",
        "phone": "555-0199",
        "website_url": "https://alleykatz.test",
        "tone": "hype",
        "keywords": "fried catfish, hushpuppies, lemon pepper",
        "hashtags": ["#alleykatz", "#fishandchicken", "#raleighfood"],
        "banned_words": ["bland", "microwaved"],
        "location": "400 S Wilmington St, Raleigh, NC",
        "hours": "11:00 AM - 11:00 PM",
        "menu": [
            {"name": "6pc Jumbo Wings", "price": "$12.99", "category": "wings"},
            {"name": "Catfish Fillet Basket", "price": "$14.99", "category": "seafood"},
        ],
        "specials": [
            {
                "item_name": "Fish & Wing Combo",
                "price": "$16.99",
                "description": "2pc catfish fillet + 4 wings tossed in lemon pepper",
                "post_date": "2026-10-05",
            }
        ],
        "events": [
            {
                "title": "Sunday Fish Fry Block Party",
                "event_date": "2026-10-12",
                "ticket_url": "https://alleykatz.test/events/blockparty",
            }
        ],
    }

    ctx = load_context_from_dict(payload)
    assert ctx.identity.business_name == "Alley Katz Fish & Chicken"
    assert ctx.brand_voice.tone == "hype"
    assert "lemon pepper" in ctx.brand_voice.keywords
    assert "#alleykatz" in ctx.brand_voice.hashtags
    assert "microwaved" in ctx.brand_voice.banned_words
    assert len(ctx.menu) == 2
    assert len(ctx.specials) == 1
    assert ctx.specials[0].item_name == "Fish & Wing Combo"
    assert len(ctx.events) == 1
    assert ctx.events[0].title == "Sunday Fish Fry Block Party"

    # Verify legacy adapters
    info = ctx.to_business_info()
    assert info["name"] == "Alley Katz Fish & Chicken"
    assert info["special"] == "Fish & Wing Combo"

    tinfo = ctx.to_template_info()
    assert tinfo["business_name"] == "Alley Katz Fish & Chicken"
    assert tinfo["special_item"] == "Fish & Wing Combo"


def test_load_context_from_culinaryos_payload():
    restaurant = {
        "id": "rest-001",
        "name": "Bella Vista Bistro",
        "concept": "fine_dining",
        "address": "123 Main St",
        "marketing_tone": "artisanal",
    }
    menu = {
        "items": [
            {"name": "Wild Mushroom Risotto", "price": "$26.00", "description": "Arborio rice, foraged chanterelles"},
            {"name": "Wood-fired Branzino", "price": "$38.00", "description": "Salsa verde, blistered tomatoes"},
        ]
    }

    ctx = load_context_from_culinaryos(restaurant, menu)
    assert ctx.identity.business_name == "Bella Vista Bistro"
    assert ctx.brand_voice.tone == "artisanal"
    assert len(ctx.menu) == 2
    assert ctx.menu[0].name == "Wild Mushroom Risotto"
