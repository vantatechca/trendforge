import sys, os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from celery_app import app
from tasks._marketplace_helper import run_marketplace_scraper

URLS = [
    "https://www.blackhatworld.com/forums/making-money.9/",
]

def run_sync():
    # BHW is forum threads; pull thread titles
    return run_marketplace_scraper("bhw_scraper", "bhw", URLS, r"/threads/", "shopify")

@app.task(name="tasks.bhw_scraper.run")
def run():
    return run_sync()
