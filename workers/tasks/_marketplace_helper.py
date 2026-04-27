"""Shared helper for marketplace HTML scrapers."""

from __future__ import annotations
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import time
import re
import requests
from bs4 import BeautifulSoup
from utils.db import log_scrape_start, log_scrape_finish
from tasks.idea_pipeline import process_raw_content


HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept": "text/html,application/xhtml+xml",
}


def fetch_html(url: str) -> str | None:
    try:
        r = requests.get(url, headers=HEADERS, timeout=20)
        if r.status_code != 200:
            return None
        return r.text
    except Exception as e:
        print(f"[marketplace] fetch failed {url}: {e}")
        return None


def harvest_titles(html: str, link_pattern: str, limit: int = 24) -> list[dict]:
    """Pull anchor text + href that match a regex pattern."""
    if not html:
        return []
    soup = BeautifulSoup(html, "html.parser")
    out: list[dict] = []
    pat = re.compile(link_pattern)
    seen: set[str] = set()
    for a in soup.select("a"):
        href = a.get("href") or ""
        if not pat.search(href):
            continue
        title = (a.get("title") or a.get("aria-label") or a.get_text(strip=True) or "").strip()
        if not title or len(title) < 6 or title in seen:
            continue
        seen.add(title)
        out.append({"title": title, "url": href})
        if len(out) >= limit:
            break
    return out


def run_marketplace_scraper(
    name: str,
    source_label: str,
    landing_urls: list[str],
    link_pattern: str,
    marketplace_fit: str,
    requires_key: bool = False,
    api_key_env: str | None = None,
) -> dict:
    log_id = log_scrape_start(name)
    found = 0
    kept = 0
    rejected = 0

    if requires_key and api_key_env and not os.getenv(api_key_env):
        log_scrape_finish(log_id, "skipped", 0, 0, 0, error=f"{api_key_env} not set")
        return {"status": "skipped", "reason": f"{api_key_env} not set"}

    try:
        for url in landing_urls:
            html = fetch_html(url)
            cards = harvest_titles(html or "", link_pattern, limit=20) if html else []
            if not cards:
                continue
            blob = f"{source_label} top items from {url}:\n\n" + "\n".join(f"- {c['title']}" for c in cards[:18])
            found += 1
            metadata = {
                "source_url": url,
                "source_links": [{"type": source_label, "title": c["title"], "url": c["url"]} for c in cards[:6]],
            }
            try:
                res = process_raw_content(source_label, blob, metadata)
                if res.get("status") == "kept":
                    kept += 1
                else:
                    rejected += 1
            except Exception as e:
                print(f"[{name}] pipeline failure: {e}")
                rejected += 1
            time.sleep(2.0)
        log_scrape_finish(log_id, "ok", found, kept, rejected)
        return {"found": found, "kept": kept, "rejected": rejected}
    except Exception as e:
        log_scrape_finish(log_id, "error", found, kept, rejected, error=str(e)[:500])
        raise
