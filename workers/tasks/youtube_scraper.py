"""YouTube Data API v3 — requires YOUTUBE_API_KEY."""

import sys, os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import time
import requests
from celery_app import app
from utils.db import log_scrape_start, log_scrape_finish, get_approved_idea_niches
from tasks.idea_pipeline import process_raw_content


YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY", "")

DEFAULT_QUERIES = ["digital product", "notion template tutorial", "etsy printables tutorial", "chatgpt prompt pack"]


def run_sync():
    log_id = log_scrape_start("youtube_scraper")
    if not YOUTUBE_API_KEY:
        log_scrape_finish(log_id, "skipped", 0, 0, 0, error="YOUTUBE_API_KEY not set")
        return {"status": "skipped", "reason": "no api key"}
    found = 0
    kept = 0
    rejected = 0
    try:
        queries = DEFAULT_QUERIES + [f"{n} digital product" for n in get_approved_idea_niches()[:4]]
        for q in queries[:6]:
            r = requests.get(
                "https://www.googleapis.com/youtube/v3/search",
                params={"part": "snippet", "q": q, "maxResults": 10, "key": YOUTUBE_API_KEY, "type": "video", "order": "viewCount"},
                timeout=15,
            )
            if r.status_code != 200:
                continue
            for item in r.json().get("items", []):
                snippet = item.get("snippet", {})
                title = snippet.get("title", "")
                desc = snippet.get("description", "")
                vid = item.get("id", {}).get("videoId", "")
                if not title:
                    continue
                blob = f"{title}\n\n{desc[:1500]}"
                found += 1
                metadata = {
                    "youtube_video_count": 10,  # rough; could query stats endpoint
                    "source_url": f"https://youtube.com/watch?v={vid}",
                    "source_links": [{"type": "youtube", "title": title, "url": f"https://youtube.com/watch?v={vid}", "snippet": desc[:200]}],
                }
                try:
                    res = process_raw_content("youtube", blob, metadata)
                    if res.get("status") == "kept":
                        kept += 1
                    else:
                        rejected += 1
                except Exception as e:
                    print(f"[youtube] pipeline failure: {e}")
                    rejected += 1
                time.sleep(0.3)
            time.sleep(1.0)
        log_scrape_finish(log_id, "ok", found, kept, rejected)
        return {"found": found, "kept": kept, "rejected": rejected}
    except Exception as e:
        log_scrape_finish(log_id, "error", found, kept, rejected, error=str(e)[:500])
        raise


@app.task(name="tasks.youtube_scraper.run")
def run():
    return run_sync()
