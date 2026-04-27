"""TikTok Creative Center — heavy JS, often gated. Stub flags as needs-puppeteer."""

import sys, os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from celery_app import app
from utils.db import log_scrape_start, log_scrape_finish

def run_sync():
    log_id = log_scrape_start("tiktok_creative_center")
    log_scrape_finish(log_id, "skipped", 0, 0, 0, error="TikTok Creative Center is JS-gated — requires Playwright")
    return {"status": "skipped", "reason": "needs Playwright"}

@app.task(name="tasks.tiktok_creative_center.run")
def run():
    return run_sync()
