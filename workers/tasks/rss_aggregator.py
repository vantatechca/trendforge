"""RSS / Atom feed aggregator (HN, ProductHunt, IndieHackers, Google News, etc.)."""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import time
from celery_app import app
from utils.db import get_active_sources, log_scrape_start, log_scrape_finish
from tasks.idea_pipeline import process_raw_content

try:
    import feedparser
    FEEDPARSER_OK = True
except Exception:
    FEEDPARSER_OK = False


def run_sync():
    log_id = log_scrape_start("rss_aggregator")
    found = 0
    kept = 0
    rejected = 0
    if not FEEDPARSER_OK:
        log_scrape_finish(log_id, "error", 0, 0, 0, error="feedparser not installed")
        return {"error": "feedparser not installed"}
    try:
        sources = get_active_sources("rss")
        if not sources:
            log_scrape_finish(log_id, "ok", 0, 0, 0)
            return {"found": 0, "kept": 0}

        for src in sources:
            try:
                feed = feedparser.parse(src["url"])
            except Exception as e:
                print(f"[rss] {src['name']} parse failed: {e}")
                continue
            for entry in feed.entries[:25]:
                title = entry.get("title", "")
                summary = entry.get("summary", "") or entry.get("description", "")
                link = entry.get("link", "")
                if not title:
                    continue
                blob = f"{title}\n\n{summary[:1500]}"
                found += 1
                metadata = {
                    "source_url": link,
                    "source_links": [{"type": "rss", "title": title, "url": link, "snippet": summary[:200]}],
                }
                try:
                    res = process_raw_content("rss", blob, metadata)
                    if res.get("status") == "kept":
                        kept += 1
                    else:
                        rejected += 1
                except Exception as e:
                    print(f"[rss] pipeline failure: {e}")
                    rejected += 1
                time.sleep(0.4)
            time.sleep(1.0)

        log_scrape_finish(log_id, "ok", found, kept, rejected)
        return {"found": found, "kept": kept, "rejected": rejected}
    except Exception as e:
        log_scrape_finish(log_id, "error", found, kept, rejected, error=str(e)[:500])
        raise


@app.task(name="tasks.rss_aggregator.run")
def run():
    return run_sync()
