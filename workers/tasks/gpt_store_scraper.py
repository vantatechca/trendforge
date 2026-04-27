"""GPT Store: requires login. Stub returns empty until OAuth flow is added."""

import sys, os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from celery_app import app
from utils.db import log_scrape_start, log_scrape_finish

def run_sync():
    log_id = log_scrape_start("gpt_store_scraper")
    log_scrape_finish(log_id, "skipped", 0, 0, 0, error="GPT Store requires OAuth — implement when needed")
    return {"status": "skipped", "reason": "needs OpenAI OAuth"}

@app.task(name="tasks.gpt_store_scraper.run")
def run():
    return run_sync()
