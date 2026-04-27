"""Hacker News — uses official Algolia API for Show HN / Ask HN."""

import sys, os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import time
import requests
from celery_app import app
from utils.db import log_scrape_start, log_scrape_finish
from tasks.idea_pipeline import process_raw_content


def run_sync():
    log_id = log_scrape_start("hn_scraper")
    found = 0
    kept = 0
    rejected = 0
    try:
        for q in ("show_hn", "ask_hn"):
            r = requests.get(f"https://hn.algolia.com/api/v1/search_by_date?tags={q}&hitsPerPage=20", timeout=15)
            r.raise_for_status()
            for hit in r.json().get("hits", []):
                title = hit.get("title", "")
                if not title:
                    continue
                blob = f"{title}\n\n{(hit.get('story_text') or '')[:1500]}"
                found += 1
                obj_id = hit.get("objectID")
                metadata = {
                    "source_url": f"https://news.ycombinator.com/item?id={obj_id}",
                    "source_links": [{"type": "hn", "title": title, "url": f"https://news.ycombinator.com/item?id={obj_id}"}],
                }
                try:
                    res = process_raw_content("hn", blob, metadata)
                    if res.get("status") == "kept":
                        kept += 1
                    else:
                        rejected += 1
                except Exception as e:
                    print(f"[hn] pipeline failure: {e}")
                    rejected += 1
                time.sleep(0.4)
            time.sleep(1.0)
        log_scrape_finish(log_id, "ok", found, kept, rejected)
        return {"found": found, "kept": kept, "rejected": rejected}
    except Exception as e:
        log_scrape_finish(log_id, "error", found, kept, rejected, error=str(e)[:500])
        raise


@app.task(name="tasks.hn_scraper.run")
def run():
    return run_sync()
