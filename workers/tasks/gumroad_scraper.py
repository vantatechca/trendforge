import sys, os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from celery_app import app
from tasks._marketplace_helper import run_marketplace_scraper

URLS = [
    "https://gumroad.com/discover",
    "https://gumroad.com/discover?recommended_by=top_creators",
]

def run_sync():
    return run_marketplace_scraper("gumroad_scraper", "gumroad", URLS, r"/l/", "gumroad")

@app.task(name="tasks.gumroad_scraper.run")
def run():
    return run_sync()
