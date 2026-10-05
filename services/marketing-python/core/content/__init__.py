"""core.content — content generator and canonical multi-stage pipeline.
"""

from .generator import (
    generate_master_caption,
    adapt_caption_for_platforms,
    calculate_engagement_heuristics,
)
from .pipeline import (
    ContentPipeline,
    ContentRequest,
    ContentResult,
    generate_content,
)

__all__ = [
    "generate_master_caption",
    "adapt_caption_for_platforms",
    "calculate_engagement_heuristics",
    "ContentPipeline",
    "ContentRequest",
    "ContentResult",
    "generate_content",
]
