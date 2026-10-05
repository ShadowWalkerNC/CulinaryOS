"""integrations.culinaryos — adapter connecting to CulinaryOS REST API.
"""

from .client import (
    CulinaryOSClient,
    CulinaryOSConfig,
    CulinaryOSError,
    normalize_menu,
    normalize_specials,
    normalize_events,
    normalize_hours,
    verify_webhook_signature,
)

__all__ = [
    "CulinaryOSClient",
    "CulinaryOSConfig",
    "CulinaryOSError",
    "normalize_menu",
    "normalize_specials",
    "normalize_events",
    "normalize_hours",
    "verify_webhook_signature",
]
