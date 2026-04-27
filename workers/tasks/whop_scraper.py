import sys, os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from celery_app import app
from tasks._marketplace_helper import run_marketplace_scraper

URLS = [
    "https://whop.com/discover",
    "https://whop.com/discover/courses",
    "https://whop.com/discover/communities",
]

def run_sync():
    return run_marketplace_scraper("whop_scraper", "whop", URLS, r"whop\.com/[a-z0-9-]+/?$|whop\.com/[a-z0-9-]+/[a-z0-9-]+", "whop")

@app.task(name="tasks.whop_scraper.run")
def run():
    return run_sync()
