import sys, os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from celery_app import app
from tasks._marketplace_helper import run_marketplace_scraper

URLS = [
    "https://creativemarket.com/popular-this-week",
    "https://creativemarket.com/templates/figma-templates",
]

def run_sync():
    return run_marketplace_scraper("creative_market_scraper", "creative_market", URLS, r"creativemarket\.com/[A-Za-z0-9_-]+/[0-9]+", "creative_market")

@app.task(name="tasks.creative_market_scraper.run")
def run():
    return run_sync()
