import sys, os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from celery_app import app
from tasks._marketplace_helper import run_marketplace_scraper

URLS = [
    "https://trends.pinterest.com/trends/?country=US",
]

def run_sync():
    return run_marketplace_scraper("pinterest_trends", "pinterest_trends", URLS, r"pinterest\.com/search|trends.pinterest", "pinterest")

@app.task(name="tasks.pinterest_trends.run")
def run():
    return run_sync()
