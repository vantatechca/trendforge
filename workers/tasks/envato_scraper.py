import sys, os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from celery_app import app
from tasks._marketplace_helper import run_marketplace_scraper

URLS = [
    "https://themeforest.net/top-sellers",
    "https://codecanyon.net/category/all?sort=trending",
]

def run_sync():
    return run_marketplace_scraper("envato_scraper", "envato", URLS, r"/(item|theme|file)/", "envato")

@app.task(name="tasks.envato_scraper.run")
def run():
    return run_sync()
