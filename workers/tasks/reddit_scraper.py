"""Reddit scraper — uses public JSON API (no PRAW required)."""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import time
import requests
from celery_app import app
from utils.db import get_active_sources, log_scrape_start, log_scrape_finish
from tasks.idea_pipeline import process_raw_content


HEADERS = {
    "User-Agent": os.getenv("REDDIT_USER_AGENT", "trendforge:research:v0.1"),
}


QUESTION_PREFIXES = (
    "is there", "does anyone", "anyone know", "looking for", "i wish",
    "where can i", "how do i", "what do you use", "recommend a",
    "any good", "what's the best", "anyone have", "can someone",
)


def fetch_subreddit_new(name: str, limit: int = 25) -> list[dict]:
    # name like "r/Entrepreneur" or "https://reddit.com/r/Entrepreneur"
    sub = name.replace("r/", "").rstrip("/").split("/")[-1]
    url = f"https://www.reddit.com/r/{sub}/new.json?limit={limit}"
    try:
        r = requests.get(url, headers=HEADERS, timeout=15)
        if r.status_code != 200:
            return []
        data = r.json()
        return [c["data"] for c in data.get("data", {}).get("children", []) if c.get("kind") == "t3"]
    except Exception as e:
        print(f"[reddit] {sub} fetch failed: {e}")
        return []


def is_question_post(title: str, selftext: str) -> bool:
    blob = f"{title} {selftext}".lower()
    return any(p in blob for p in QUESTION_PREFIXES) or "?" in title


def run_sync():
    log_id = log_scrape_start("reddit_scraper")
    found = 0
    kept = 0
    rejected = 0
    try:
        sources = get_active_sources("subreddit")
        if not sources:
            log_scrape_finish(log_id, "ok", 0, 0, 0)
            return {"found": 0, "kept": 0}

        for src in sources:
            posts = fetch_subreddit_new(src["url"] or src["name"])
            for p in posts:
                title = p.get("title", "") or ""
                selftext = p.get("selftext", "") or ""
                permalink = p.get("permalink", "")
                if not title:
                    continue
                blob = f"{title}\n\n{selftext[:1500]}"
                found += 1
                metadata = {
                    "reddit_mention_count": int(p.get("num_comments", 0)),
                    "reddit_question_count": 1 if is_question_post(title, selftext) else 0,
                    "source_url": f"https://reddit.com{permalink}" if permalink else "",
                    "source_links": [
                        {
                            "type": "reddit",
                            "title": title,
                            "url": f"https://reddit.com{permalink}" if permalink else "",
                            "snippet": selftext[:200],
                        }
                    ],
                }
                try:
                    res = process_raw_content("reddit", blob, metadata)
                    if res.get("status") == "kept":
                        kept += 1
                    else:
                        rejected += 1
                except Exception as e:
                    print(f"[reddit] pipeline failure: {e}")
                    rejected += 1
                # politeness
                time.sleep(0.6)
            time.sleep(1.5)
        log_scrape_finish(log_id, "ok", found, kept, rejected)
        return {"found": found, "kept": kept, "rejected": rejected}
    except Exception as e:
        log_scrape_finish(log_id, "error", found, kept, rejected, error=str(e)[:500])
        raise


@app.task(name="tasks.reddit_scraper.run")
def run():
    return run_sync()
