"""tests/test_api.py — tests for FastAPI endpoints.
"""

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_health_check():
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["service"] == "marketing-python"
    assert data["skills_count"] == 5


def test_get_skills():
    resp = client.get("/skills")
    assert resp.status_code == 200
    data = resp.json()
    assert "skills" in data
    assert "special_post" in data["skills"]
    assert "brand_guard" in data["skills"]
    assert "event_campaign" in data["skills"]
    assert "weekly_plan" in data["skills"]
    assert "review_reply" in data["skills"]


def test_run_skill_special_post():
    payload = {
        "prompt_name": "caption",
        "variables": {
            "business_name": "Crab Shack",
            "business_type": "seafood",
            "location": "Ocean City",
            "item_name": "Steamed Blue Crabs",
            "description": "Hot and spicy Old Bay seasoning",
            "price": "$45/dozen",
            "available_until": "8 PM",
            "tone": "hype",
            "platform": "instagram",
        },
        "include_rules": True,
    }
    resp = client.post("/skills/special_post/run", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert "Steamed Blue Crabs" in data["rendered"]
    assert "Crab Shack" in data["rendered"]


def test_audit_brand_guard_pass():
    payload = {
        "draft": "Tonight only! Come enjoy our artisan wood-fired pizza with fresh basil. Order online at link in bio!",
        "banned_words": ["garbage", "cheap"],
        "required_cta": True,
        "platform": "instagram",
    }
    resp = client.post("/brand-guard/audit", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["pass"] is True
    assert data["verdict"] == "PASS"


def test_audit_brand_guard_fail():
    payload = {
        "draft": "Our cheap food is here. No order link.",
        "banned_words": ["cheap"],
        "required_cta": True,
        "platform": "instagram",
    }
    resp = client.post("/brand-guard/audit", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["pass"] is False
    assert data["verdict"] == "FAIL"
    assert len(data["reasons"]) >= 1


def test_campaign_generate():
    payload = {
        "content_type": "daily_special",
        "business_name": "Gourmet Smash",
        "tone": "hype",
        "item_name": "Bacon Double Stack",
        "price": "$13.50",
        "description": "Crispy applewood smoked bacon and aged cheddar",
        "platforms": ["instagram", "facebook", "x"],
    }
    resp = client.post("/campaigns/generate", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert "master" in data
    assert "Bacon Double Stack" in data["master"]
    assert "instagram" in data["adapted"]
    assert "facebook" in data["adapted"]
    assert "x" in data["adapted"]
    assert "scores" in data


def test_sync_culinaryos_payload():
    payload = {
        "payload": {
            "items": [
                {"name": "Ribeye Steak", "price": 3400, "description": "16oz prime Angus"},
            ]
        }
    }
    resp = client.post("/sync/culinaryos", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["menu_items_count"] == 1
    assert data["menu"]["items"][0]["price"] == "$34.00"
