import sys, os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from celery_app import app
from tasks._marketplace_helper import run_marketplace_scraper

URLS = [
    "https://www.producthunt.com/",
    "https://www.producthunt.com/categories/digital-products",
]

def run_sync():
    return run_marketplace_scraper("producthunt_scraper", "product_hunt", URLS, r"producthunt\.com/posts/", "product_hunt")

@app.task(name="tasks.producthunt_scraper.run")
def run():
    return run_sync()
