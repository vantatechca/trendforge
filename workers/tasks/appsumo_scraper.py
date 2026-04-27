import sys, os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from celery_app import app
from tasks._marketplace_helper import run_marketplace_scraper

URLS = [
    "https://appsumo.com/browse/?sort_by=trending",
    "https://appsumo.com/collections/lifetime-deals/",
]

def run_sync():
    return run_marketplace_scraper("appsumo_scraper", "appsumo", URLS, r"appsumo\.com/products/", "appsumo")

@app.task(name="tasks.appsumo_scraper.run")
def run():
    return run_sync()
