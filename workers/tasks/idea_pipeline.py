"""Central pipeline: filter → extract → dedup → score → insert."""

from __future__ import annotations
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import math
from celery_app import app
from utils.db import (
    insert_idea, check_duplicate_slug, get_brain_memories, slugify,
)
from utils.ai_client import is_relevant, extract_idea_json, score_alignment


def compute_priority(idea: dict, alignment: float) -> float:
    """Composite priority 0-100."""
    g = (idea.get("google_trends_score") or 0) / 100.0
    rd = min(1.0, (idea.get("reddit_mention_count", 0)) / 200.0)
    rq = min(1.0, (idea.get("reddit_question_count", 0)) / 50.0)
    yt = min(1.0, (idea.get("youtube_video_count", 0)) / 1000.0)
    pn = min(1.0, (idea.get("pinterest_pin_count", 0)) / 50000.0)

    # Competitor validation: bell curve peaking at 5-30 with avg price >= 15
    ec = idea.get("etsy_competitor_count", 0)
    if ec == 0: cv = 0.2
    elif ec < 5: cv = 0.55
    elif ec <= 30: cv = 0.95
    elif ec <= 60: cv = 0.65
    else: cv = 0.25
    avg_price = idea.get("etsy_avg_price")
    if avg_price is not None and avg_price < 10:
        cv *= 0.7

    # Effort inverse
    effort = (idea.get("effort_to_build") or "medium").lower()
    ei = {"low": 1.0, "medium": 0.6, "high": 0.3}.get(effort, 0.6)

    score = (
        0.18 * g
        + 0.15 * (0.6 * rd + 0.4 * rq * 2)  # questions weighted 2x
        + 0.10 * yt
        + 0.10 * pn
        + 0.18 * cv
        + 0.10 * ei
        + 0.12 * alignment
        + 0.07 * 0.6  # novelty stub (without embeddings); 0.6 default = mild bonus
    )
    return round(min(100.0, score * 100), 2)


@app.task(name="tasks.idea_pipeline.process_raw_content")
def process_raw_content(source: str, raw_text: str, metadata: dict | None = None):
    """Run a single piece of raw content through the pipeline.
    Returns 'kept' / 'rejected' / 'duplicate' / 'irrelevant'.
    """
    metadata = metadata or {}
    if not raw_text or len(raw_text) < 30:
        return {"status": "irrelevant", "reason": "too_short"}

    # 1. Relevance filter
    if not is_relevant(raw_text):
        return {"status": "irrelevant", "reason": "filter"}

    # 2. Idea extraction
    idea = extract_idea_json(raw_text, source=source)
    if not idea or not idea.get("title"):
        return {"status": "rejected", "reason": "no_extraction"}

    # 3. Slug dedup
    base = slugify(idea["title"])
    candidate_slug = f"{base}"
    suffix = 0
    while check_duplicate_slug(candidate_slug):
        suffix += 1
        if suffix > 4:
            return {"status": "duplicate", "reason": "slug"}
        candidate_slug = f"{base}-{suffix}"

    # 4. Brain alignment
    rules = [r["content"] for r in get_brain_memories("golden_rule")] + \
            [r["content"] for r in get_brain_memories("general_rule")][:5]
    alignment = score_alignment(f"{idea['title']}: {idea.get('summary','')}", rules)

    # Hard reject if alignment is very low (likely violates a golden rule)
    if alignment < 0.15:
        return {"status": "rejected", "reason": "rules_conflict"}

    # 5. Priority + confidence
    enriched = {
        **idea,
        "google_trends_score": metadata.get("google_trends_score"),
        "reddit_mention_count": metadata.get("reddit_mention_count", 0),
        "reddit_question_count": metadata.get("reddit_question_count", 0),
        "youtube_video_count": metadata.get("youtube_video_count", 0),
        "pinterest_pin_count": metadata.get("pinterest_pin_count", 0),
        "etsy_competitor_count": metadata.get("etsy_competitor_count", 0),
        "etsy_avg_price": metadata.get("etsy_avg_price"),
    }
    priority = compute_priority(enriched, alignment)
    confidence = round(min(100.0, alignment * 60 + min(40, len(rules) * 4)), 1)

    # 6. Insert
    payload = {
        "title": idea["title"],
        "slug": candidate_slug,
        "summary": idea.get("summary") or "",
        "detailed_analysis": idea.get("differentiation_angle"),
        "category": idea.get("category") or "ebook",
        "subcategory": idea.get("subcategory"),
        "niches": idea.get("niches") or [],
        "product_format": idea.get("product_format"),
        "marketplace_fit": idea.get("marketplace_fit") or [],
        "status": "pending",
        "priority_score": priority,
        "confidence_score": confidence,
        "google_trends_score": metadata.get("google_trends_score"),
        "google_trends_direction": metadata.get("google_trends_direction"),
        "reddit_mention_count": metadata.get("reddit_mention_count", 0),
        "reddit_question_count": metadata.get("reddit_question_count", 0),
        "youtube_video_count": metadata.get("youtube_video_count", 0),
        "youtube_avg_views": metadata.get("youtube_avg_views", 0),
        "tiktok_hashtag_count": metadata.get("tiktok_hashtag_count", 0),
        "pinterest_pin_count": metadata.get("pinterest_pin_count", 0),
        "forum_mention_count": metadata.get("forum_mention_count", 0),
        "search_volume_monthly": metadata.get("search_volume_monthly"),
        "etsy_competitor_count": metadata.get("etsy_competitor_count", 0),
        "etsy_avg_price": metadata.get("etsy_avg_price"),
        "etsy_avg_reviews": metadata.get("etsy_avg_reviews"),
        "etsy_top_sellers": metadata.get("etsy_top_sellers"),
        "gumroad_competitor_count": metadata.get("gumroad_competitor_count", 0),
        "gumroad_avg_price": metadata.get("gumroad_avg_price"),
        "whop_competitor_count": metadata.get("whop_competitor_count", 0),
        "creative_market_count": metadata.get("creative_market_count", 0),
        "appsumo_ltd_exists": metadata.get("appsumo_ltd_exists", False),
        "existing_products": metadata.get("existing_products") or [],
        "competitor_analysis": idea.get("competitor_analysis"),
        "differentiation_notes": idea.get("differentiation_angle"),
        "estimated_price_range": idea.get("estimated_price_range"),
        "estimated_monthly_rev": idea.get("estimated_monthly_rev"),
        "effort_to_build": idea.get("effort_to_build"),
        "time_to_build": idea.get("time_to_build"),
        "source_links": metadata.get("source_links") or ([{"type": source, "title": idea["title"], "url": metadata.get("source_url", "")}] if metadata.get("source_url") else []),
        "discovery_source": source,
        "operator_notes": [],
    }
    new_id = insert_idea(payload)
    return {"status": "kept", "id": new_id, "priority": priority, "alignment": alignment}
