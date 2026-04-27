"""FastAPI control plane for triggering Celery tasks from the Next.js UI."""

from __future__ import annotations
import os
import importlib
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from celery_app import app as celery_app

# Standard ASGI variable name so `uvicorn api:app` works directly
app = FastAPI(title="TrendForge worker API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

SCRAPERS = {
    "reddit_scraper", "etsy_scraper", "web_researcher", "google_trends",
    "rss_aggregator", "gumroad_scraper", "whop_scraper", "creative_market_scraper",
    "envato_scraper", "appsumo_scraper", "producthunt_scraper",
    "notion_marketplace_scraper", "gpt_store_scraper", "pinterest_trends",
    "tiktok_creative_center", "hn_scraper", "indiehackers_scraper",
    "bhw_scraper", "youtube_scraper",
}


class TriggerBody(BaseModel):
    scraper_name: str


@app.get("/health")
def health():
    return {"status": "ok", "service": "trendforge-worker", "port": 8842, "scrapers": sorted(SCRAPERS)}


@app.post("/trigger")
def trigger(body: TriggerBody):
    name = body.scraper_name
    if name not in SCRAPERS:
        raise HTTPException(status_code=400, detail=f"Unknown scraper '{name}'. Valid: {sorted(SCRAPERS)}")
    try:
        # Send via Celery so it runs on a worker, not in the API process
        result = celery_app.send_task(f"tasks.{name}.run")
        return {"task_id": result.id, "scraper": name, "status": "queued"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to queue: {e}")


@app.get("/status/{task_id}")
def status(task_id: str):
    try:
        result = celery_app.AsyncResult(task_id)
        return {"task_id": task_id, "state": result.state, "info": str(result.info)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/scrapers")
def list_scrapers():
    return {"scrapers": sorted(SCRAPERS)}


# In-process testing path: run a scraper synchronously without Celery
# Useful when Celery worker isn't running but you want to verify the scraper end-to-end
@app.post("/run-sync/{name}")
def run_sync(name: str):
    if name not in SCRAPERS:
        raise HTTPException(status_code=400, detail=f"Unknown scraper '{name}'")
    try:
        mod = importlib.import_module(f"tasks.{name}")
        out = mod.run_sync() if hasattr(mod, "run_sync") else mod.run.apply().get()
        return {"scraper": name, "result": out}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
