"""Direct psycopg2 helpers for the worker layer (no Prisma)."""

from __future__ import annotations
import os
import json
import re
import uuid
from contextlib import contextmanager
from typing import Any, Iterable
import psycopg2
from psycopg2.extras import RealDictCursor, Json


def _conn_string() -> str:
    url = os.getenv("DATABASE_URL", "")
    # Strip ?schema=public for psycopg2
    return re.sub(r"\?.*$", "", url)


@contextmanager
def conn():
    c = psycopg2.connect(_conn_string())
    try:
        yield c
        c.commit()
    except Exception:
        c.rollback()
        raise
    finally:
        c.close()


def slugify(s: str) -> str:
    s = s.lower()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s[:80]


def check_duplicate_slug(slug: str) -> bool:
    with conn() as c, c.cursor() as cur:
        cur.execute("SELECT 1 FROM ideas WHERE slug = %s LIMIT 1", (slug,))
        return cur.fetchone() is not None


def insert_idea(data: dict) -> str:
    """Insert one idea, returning its id. data must include title and category."""
    if "slug" not in data:
        base = slugify(data["title"])
        data["slug"] = f"{base}-{uuid.uuid4().hex[:6]}"

    cols = [
        "title", "slug", "summary", "detailed_analysis", "category", "subcategory",
        "niches", "product_format", "marketplace_fit", "status",
        "priority_score", "confidence_score",
        "google_trends_score", "google_trends_direction",
        "reddit_mention_count", "reddit_question_count",
        "youtube_video_count", "youtube_avg_views",
        "tiktok_hashtag_count", "pinterest_pin_count",
        "forum_mention_count", "search_volume_monthly",
        "etsy_competitor_count", "etsy_avg_price", "etsy_avg_reviews",
        "etsy_top_sellers", "gumroad_competitor_count", "gumroad_avg_price",
        "whop_competitor_count", "creative_market_count", "appsumo_ltd_exists",
        "existing_products", "competitor_analysis", "differentiation_notes",
        "estimated_price_range", "estimated_monthly_rev", "effort_to_build", "time_to_build",
        "source_links", "discovery_source",
        "operator_notes",
    ]

    values = []
    for c in cols:
        v = data.get(c)
        if c in ("etsy_top_sellers", "existing_products", "source_links") and v is not None:
            values.append(Json(v))
        elif c in ("niches", "marketplace_fit", "operator_notes"):
            values.append(v if isinstance(v, list) else (v or []))
        else:
            values.append(v)

    placeholders = ", ".join(["%s"] * len(cols))
    sql = f"""
        INSERT INTO ideas ({", ".join(cols)}, last_data_refresh, updated_at)
        VALUES ({placeholders}, NOW(), NOW())
        RETURNING id
    """
    with conn() as c, c.cursor() as cur:
        cur.execute(sql, values)
        return str(cur.fetchone()[0])


def update_idea(idea_id: str, data: dict) -> None:
    if not data:
        return
    pairs = []
    values = []
    for k, v in data.items():
        if k in ("etsy_top_sellers", "existing_products", "source_links") and v is not None:
            pairs.append(f"{k} = %s")
            values.append(Json(v))
        else:
            pairs.append(f"{k} = %s")
            values.append(v)
    values.append(idea_id)
    sql = f"UPDATE ideas SET {', '.join(pairs)}, last_data_refresh = NOW() WHERE id = %s"
    with conn() as c, c.cursor() as cur:
        cur.execute(sql, values)


def log_scrape_start(source: str) -> str:
    with conn() as c, c.cursor() as cur:
        cur.execute(
            "INSERT INTO scrape_logs (source, status) VALUES (%s, 'running') RETURNING id",
            (source,),
        )
        return str(cur.fetchone()[0])


def log_scrape_finish(log_id: str, status: str, items_found: int = 0, items_kept: int = 0, items_rejected: int = 0, error: str | None = None) -> None:
    with conn() as c, c.cursor() as cur:
        cur.execute(
            """
            UPDATE scrape_logs
            SET finished_at = NOW(), status = %s, items_found = %s, items_kept = %s, items_rejected = %s, error = %s
            WHERE id = %s
            """,
            (status, items_found, items_kept, items_rejected, error, log_id),
        )


def get_brain_memories(memory_type: str | None = None) -> list[dict]:
    with conn() as c, c.cursor(cursor_factory=RealDictCursor) as cur:
        if memory_type:
            cur.execute(
                "SELECT id, memory_type, content, importance, source FROM brain_memories WHERE active = true AND memory_type = %s ORDER BY importance DESC",
                (memory_type,),
            )
        else:
            cur.execute(
                "SELECT id, memory_type, content, importance, source FROM brain_memories WHERE active = true ORDER BY importance DESC",
            )
        return [dict(r) for r in cur.fetchall()]


def insert_brain_memory(memory_type: str, content: str, importance: int = 50, source: str | None = None, related_idea_id: str | None = None) -> str:
    with conn() as c, c.cursor() as cur:
        cur.execute(
            """
            INSERT INTO brain_memories (memory_type, content, importance, source, related_idea_id)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id
            """,
            (memory_type, content, importance, source, related_idea_id),
        )
        return str(cur.fetchone()[0])


def get_active_sources(type_filter: str | None = None) -> list[dict]:
    with conn() as c, c.cursor(cursor_factory=RealDictCursor) as cur:
        if type_filter:
            cur.execute(
                "SELECT id, name, type, url, frequency_hours, metadata FROM monitored_sources WHERE enabled = true AND type = %s",
                (type_filter,),
            )
        else:
            cur.execute(
                "SELECT id, name, type, url, frequency_hours, metadata FROM monitored_sources WHERE enabled = true",
            )
        return [dict(r) for r in cur.fetchall()]


def get_approved_idea_niches(limit: int = 50) -> list[str]:
    """Niches from recently approved ideas — used to bias web search queries."""
    with conn() as c, c.cursor() as cur:
        cur.execute(
            "SELECT niches FROM ideas WHERE status IN ('approved', 'in_progress', 'launched') ORDER BY status_changed_at DESC NULLS LAST LIMIT %s",
            (limit,),
        )
        out: list[str] = []
        for (niches,) in cur.fetchall():
            for n in niches or []:
                if n not in out:
                    out.append(n)
        return out
