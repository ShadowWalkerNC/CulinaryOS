"""tests/test_culinaryos_client.py — tests for CulinaryOS REST client normalizers and webhook signatures.
"""

from integrations.culinaryos.client import (
    normalize_menu,
    normalize_specials,
    normalize_events,
    normalize_hours,
    verify_webhook_signature,
)


def test_normalize_menu_dict_with_integer_cents():
    raw_payload = {
        "items": [
            {
                "name": "Classic Smashburger",
                "description": "Double patty, American cheese, special sauce",
                "price": 1250,  # 1250 cents = $12.50
                "category": "burgers",
            },
            {
                "name": "Truffle Fries",
                "description": "Hand-cut Idaho potatoes, parmesan, truffle oil",
                "price_cents": 800,  # 800 cents = $8.00
                "category": "sides",
            },
        ]
    }

    normalized = normalize_menu(raw_payload)
    items = normalized["items"]
    assert len(items) == 2
    assert items[0]["name"] == "Classic Smashburger"
    assert items[0]["price"] == "$12.50"
    assert items[1]["name"] == "Truffle Fries"
    assert items[1]["price"] == "$8.00"


def test_normalize_specials():
    raw_payload = {
        "specials": [
            {
                "item_name": "Lobster Roll",
                "description": "Brown butter poached Maine lobster on brioche",
                "price": 2800,
                "date": "2026-10-05",
            }
        ]
    }
    specials = normalize_specials(raw_payload)
    assert len(specials) == 1
    assert specials[0]["item_name"] == "Lobster Roll"
    assert specials[0]["price"] == "$28.00"
    assert specials[0]["post_date"] == "2026-10-05"


def test_normalize_events():
    raw_payload = [
        {
            "title": "Chef's Tasting Wine Dinner",
            "description": "5-course pairing with Willamette Valley pinot noirs",
            "event_date": "2026-10-20",
            "ticket_url": "https://restaurant.test/tasting",
        }
    ]
    events = normalize_events(raw_payload)
    assert len(events) == 1
    assert events[0]["title"] == "Chef's Tasting Wine Dinner"
    assert events[0]["ticket_url"] == "https://restaurant.test/tasting"


def test_normalize_hours():
    h = normalize_hours({"regular": "10:00 AM - 9:00 PM"})
    assert h["regular"] == "10:00 AM - 9:00 PM"


def test_verify_webhook_signature():
    secret = "whsec_test_secret_key_12345"
    body = b'{"event":"menu.item.updated","item_id":"123"}'

    import hmac
    import hashlib

    valid_sig = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()

    # Valid signature
    assert verify_webhook_signature(body, valid_sig, secret) is True
    # With prefix
    assert verify_webhook_signature(body, f"sha256={valid_sig}", secret) is True
    # Tampered body
    assert verify_webhook_signature(b'{"tampered":true}', valid_sig, secret) is False
    # Empty secret
    assert verify_webhook_signature(body, valid_sig, "") is False
