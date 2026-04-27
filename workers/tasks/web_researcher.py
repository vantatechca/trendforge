"""Web researcher — uses Serper.dev (or SerpAPI / Brave) to rotate queries."""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import random
import time
import requests
from celery_app import app
from utils.db import get_active_sources, log_scrape_start, log_scrape_finish, get_approved_idea_niches
from tasks.idea_pipeline import process_raw_content


SERPER_KEY = os.getenv("SERPER_API_KEY", "")
SERPAPI_KEY = os.getenv("SERPAPI_API_KEY", "")
BRAVE_KEY = os.getenv("BRAVE_SEARCH_API_KEY", "")

DEFAULT_QUERIES = [
    "top selling notion templates 2026",
    "best etsy printables niche 2026",
    "underserved digital product niches",
    "trending chatgpt prompt pack",
    "figma template trending",
    "course platform revenue indie",
    "gumroad bestsellers digital products",
    "whop top communities",
    "creative market top selling 2026",
    "appsumo trending lifetime deals",
]


def serper_search(q: str) -> list[dict]:
    if not SERPER_KEY:
        return []
    try:
        r = requests.post(
            "https://google.serper.dev/search",
            headers={"X-API-KEY": SERPER_KEY, "Content-Type": "application/json"},
            json={"q": q, "num": 10},
            timeout=20,
        )
        r.raise_for_status()
        data = r.json()
        return data.get("organic", [])
    except Exception as e:
        print(f"[web] serper failed: {e}")
        return []


def serpapi_search(q: str) -> list[dict]:
    if not SERPAPI_KEY:
        return []
    try:
        r = requests.get(
            "https://serpapi.com/search",
            params={"q": q, "api_key": SERPAPI_KEY, "num": 10},
            timeout=20,
        )
        r.raise_for_status()
        return r.json().get("organic_results", [])
    except Exception as e:
        print(f"[web] serpapi failed: {e}")
        return []


def brave_search(q: str) -> list[dict]:
    if not BRAVE_KEY:
        return []
    try:
        r = requests.get(
            "https://api.search.brave.com/res/v1/web/search",
            headers={"X-Subscription-Token": BRAVE_KEY, "Accept": "application/json"},
            params={"q": q, "count": 10},
            timeout=20,
        )
        r.raise_for_status()
        return r.json().get("web", {}).get("results", [])
    except Exception as e:
        print(f"[web] brave failed: {e}")
        return []


def search_query(q: str) -> list[dict]:
    for fn in (serper_search, serpapi_search, brave_search):
        results = fn(q)
        if results:
            return [
                {"title": r.get("title") or "", "url": r.get("link") or r.get("url") or "", "snippet": r.get("snippet") or r.get("description") or ""}
                for r in results
            ]
    return []


def run_sync():
    log_id = log_scrape_start("web_researcher")
    found = 0
    kept = 0
    rejected = 0
    try:
        # Build query bank: defaults + niches from configured sources + approved-idea niches
        queries = list(DEFAULT_QUERIES)
        for src in get_active_sources("web_search"):
            tail = (src["url"] or "").replace("queries:", "")
            queries.extend(q.strip() for q in tail.split(",") if q.strip())
        approved_niches = get_approved_idea_niches()
        for n in approved_niches[:8]:
            queries.append(f"top selling {n} digital product 2026")
            queries.append(f"trending {n} template")
        queries = list(dict.fromkeys(queries))  # dedup, preserve order

        # Rotate 3 queries per run
        sample = random.sample(queries, k=min(3, len(queries)))
        for q in sample:
            results = search_query(q)
            if not results:
                continue
            for r in results[:6]:
                blob = f"Search query: {q}\n\nResult: {r['title']}\n{r['snippet']}"
                found += 1
                metadata = {
                    "source_url": r["url"],
                    "source_links": [{"type": "web", "title": r["title"], "url": r["url"], "snippet": r["snippet"]}],
                }
                try:
                    res = process_raw_content("web", blob, metadata)
                    if res.get("status") == "kept":
                        kept += 1
                    else:
                        rejected += 1
                except Exception as e:
                    print(f"[web] pipeline failure: {e}")
                    rejected += 1
                time.sleep(0.5)
            time.sleep(1.0)
        log_scrape_finish(log_id, "ok", found, kept, rejected)
        return {"found": found, "kept": kept, "rejected": rejected, "queries_used": sample}
    except Exception as e:
        log_scrape_finish(log_id, "error", found, kept, rejected, error=str(e)[:500])
        raise


@app.task(name="tasks.web_researcher.run")
def run():
    return run_sync()
