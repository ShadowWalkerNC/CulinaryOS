"""tests/test_content_pipeline.py — tests for canonical content pipeline and platform adaptation.
"""

from core.content.generator import (
    adapt_caption_for_platforms,
    calculate_engagement_heuristics,
    generate_master_caption,
)
from core.content.pipeline import (
    ContentPipeline,
    ContentRequest,
    generate_content,
)


def test_generate_master_caption_daily_special():
    caption = generate_master_caption(
        business_name="Smokehouse BBQ",
        item_name="Smoked Brisket Sandwich",
        price="$15.50",
        description="14-hour post oak smoked prime brisket",
        tone="hype",
        content_type="daily_special",
    )
    assert "Smokehouse BBQ" in caption
    assert "Smoked Brisket Sandwich" in caption
    assert "$15.50" in caption


def test_adapt_caption_for_platforms():
    master = "Join us tonight for live jazz and tapas at Bodega Central!"
    adapted = adapt_caption_for_platforms(
        master_caption=master,
        platforms=["instagram", "facebook", "x", "google", "tiktok"],
        business_name="Bodega Central",
    )

    assert "instagram" in adapted
    assert "facebook" in adapted
    assert "x" in adapted
    assert "google" in adapted
    assert "tiktok" in adapted

    # Instagram has link in bio
    assert "Link in bio" in adapted["instagram"]
    # X adheres to short length
    assert len(adapted["x"]) <= 280
    # TikTok has sound/hook cue
    assert "Sound on" in adapted["tiktok"]


def test_calculate_engagement_heuristics():
    good_caption = "🔥 Check out today's special! Order online at link in bio! #foodie #eatlocal"
    score_data = calculate_engagement_heuristics(good_caption, platform="instagram")
    assert score_data["score"] >= 70
    assert score_data["has_cta"] is True
    assert score_data["has_emoji"] is True
    assert score_data["has_hashtags"] is True


def test_content_pipeline_full_run():
    pipeline = ContentPipeline()
    req = ContentRequest(
        business_info={"name": "Osteria Uno", "tone": "artisanal", "banned_words": ["instant"]},
        content_type="daily_special",
        item_name="Pappardelle al Cinghiale",
        price="$29",
        description="Slow-braised wild boar ragu",
        tone="artisanal",
    )

    result = pipeline.run(req)

    assert result.master
    assert "Pappardelle al Cinghiale" in result.master
    assert len(result.adapted) == 5  # ig, fb, google, tt, x
    assert result.validation[0] is True  # valid
    assert "context" in result.stages_run
    assert "generate" in result.stages_run
    assert "adapt" in result.stages_run
    assert "score" in result.stages_run
    assert "validate" in result.stages_run
    assert "assemble" in result.stages_run


def test_content_pipeline_catches_banned_words():
    pipeline = ContentPipeline()
    req = ContentRequest(
        business_info={
            "name": "Quick Bites",
            "banned_words": ["microwaved"],
        },
        content_type="daily_special",
        item_name="Microwaved Burrito",
        description="Fast and heated",
    )

    result = pipeline.run(req)
    # Validation should catch "microwaved"
    assert result.validation[0] is False
    assert any("microwaved" in reason for reason in result.validation[1])
