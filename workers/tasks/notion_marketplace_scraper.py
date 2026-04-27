import sys, os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from celery_app import app
from tasks._marketplace_helper import run_marketplace_scraper

URLS = [
    "https://www.notion.so/templates",
    "https://www.notion.so/templates/category/business-templates",
]

def run_sync():
    return run_marketplace_scraper("notion_marketplace_scraper", "notion_marketplace", URLS, r"notion\.so/templates/", "notion_marketplace")

@app.task(name="tasks.notion_marketplace_scraper.run")
def run():
    return run_sync()
