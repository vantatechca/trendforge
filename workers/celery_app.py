"""TrendForge Celery app + beat schedule."""

import os
from celery import Celery
from celery.schedules import crontab
from dotenv import load_dotenv
from pathlib import Path

# Load .env from project root
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

app = Celery(
    "trendforge",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=[
        "tasks.idea_pipeline",
        "tasks.reddit_scraper",
        "tasks.etsy_scraper",
        "tasks.web_researcher",
        "tasks.google_trends",
        "tasks.rss_aggregator",
        "tasks.gumroad_scraper",
        "tasks.whop_scraper",
        "tasks.creative_market_scraper",
        "tasks.envato_scraper",
        "tasks.appsumo_scraper",
        "tasks.producthunt_scraper",
        "tasks.notion_marketplace_scraper",
        "tasks.gpt_store_scraper",
        "tasks.pinterest_trends",
        "tasks.tiktok_creative_center",
        "tasks.hn_scraper",
        "tasks.indiehackers_scraper",
        "tasks.bhw_scraper",
        "tasks.youtube_scraper",
    ],
)

app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_default_retry_delay=120,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
)

# Beat schedule — frequencies tuned to avoid hammering sources
app.conf.beat_schedule = {
    "reddit-every-4h":              {"task": "tasks.reddit_scraper.run",              "schedule": crontab(minute=10, hour="*/4")},
    "etsy-every-12h":               {"task": "tasks.etsy_scraper.run",                "schedule": crontab(minute=20, hour="*/12")},
    "web-research-every-12h":       {"task": "tasks.web_researcher.run",              "schedule": crontab(minute=30, hour="*/12")},
    "google-trends-daily":          {"task": "tasks.google_trends.run",               "schedule": crontab(minute=40, hour=6)},
    "rss-every-4h":                 {"task": "tasks.rss_aggregator.run",              "schedule": crontab(minute=50, hour="*/4")},
    "gumroad-every-12h":            {"task": "tasks.gumroad_scraper.run",             "schedule": crontab(minute=5, hour="*/12")},
    "whop-every-12h":               {"task": "tasks.whop_scraper.run",                "schedule": crontab(minute=15, hour="*/12")},
    "creative-market-daily":        {"task": "tasks.creative_market_scraper.run",     "schedule": crontab(minute=25, hour=8)},
    "appsumo-daily":                {"task": "tasks.appsumo_scraper.run",             "schedule": crontab(minute=35, hour=9)},
    "producthunt-every-6h":         {"task": "tasks.producthunt_scraper.run",         "schedule": crontab(minute=45, hour="*/6")},
    "notion-marketplace-daily":     {"task": "tasks.notion_marketplace_scraper.run",  "schedule": crontab(minute=55, hour=10)},
    "gpt-store-daily":              {"task": "tasks.gpt_store_scraper.run",           "schedule": crontab(minute=5, hour=11)},
    "pinterest-daily":              {"task": "tasks.pinterest_trends.run",            "schedule": crontab(minute=15, hour=12)},
    "tiktok-daily":                 {"task": "tasks.tiktok_creative_center.run",      "schedule": crontab(minute=25, hour=13)},
    "hn-every-4h":                  {"task": "tasks.hn_scraper.run",                  "schedule": crontab(minute=35, hour="*/4")},
    "indiehackers-every-8h":        {"task": "tasks.indiehackers_scraper.run",        "schedule": crontab(minute=45, hour="*/8")},
    "bhw-daily":                    {"task": "tasks.bhw_scraper.run",                 "schedule": crontab(minute=55, hour=14)},
    "youtube-daily":                {"task": "tasks.youtube_scraper.run",             "schedule": crontab(minute=5, hour=15)},
}

if __name__ == "__main__":
    app.start()
