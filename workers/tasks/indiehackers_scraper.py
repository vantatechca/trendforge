import sys, os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from celery_app import app
from tasks._marketplace_helper import run_marketplace_scraper

URLS = [
    "https://www.indiehackers.com/milestones",
    "https://www.indiehackers.com/products/category/digital-products",
]

def run_sync():
    return run_marketplace_scraper("indiehackers_scraper", "indiehackers", URLS, r"indiehackers\.com/(post|product|milestone)/", "shopify")

@app.task(name="tasks.indiehackers_scraper.run")
def run():
    return run_sync()
