"""Etsy scraper — BeautifulSoup over public search/category pages."""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import time
import re
import requests
from bs4 import BeautifulSoup
from celery_app import app
from utils.db import get_active_sources, log_scrape_start, log_scrape_finish
from tasks.idea_pipeline import process_raw_content


HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept": "text/html,application/xhtml+xml",
}


def _price_to_float(s: str) -> float | None:
    if not s:
        return None
    m = re.search(r"\$?\s*([0-9]+(?:\.[0-9]+)?)", s.replace(",", ""))
    return float(m.group(1)) if m else None


def fetch_etsy_search(url: str, limit: int = 24) -> list[dict]:
    try:
        r = requests.get(url, headers=HEADERS, timeout=20)
        if r.status_code != 200:
            return []
        soup = BeautifulSoup(r.text, "html.parser")
        # Etsy listing cards: anchors with /listing/
        cards = []
        for a in soup.select("a"):
            href = a.get("href", "")
            if "/listing/" not in href:
                continue
            title = a.get("title") or a.get("aria-label") or a.get_text(strip=True)
            if not title or len(title) < 8:
                continue
            # Try to find a price near the link
            price_el = a.find_next(class_=re.compile(r"currency-value|currency"))
            price = _price_to_float(price_el.get_text() if price_el else "")
            cards.append({"title": title.strip(), "url": href.split("?")[0], "price": price})
            if len(cards) >= limit:
                break
        return cards
    except Exception as e:
        print(f"[etsy] fetch failed: {e}")
        return []


def run_sync():
    log_id = log_scrape_start("etsy_scraper")
    found = 0
    kept = 0
    rejected = 0
    try:
        sources = get_active_sources("etsy_search")
        if not sources:
            log_scrape_finish(log_id, "ok", 0, 0, 0)
            return {"found": 0, "kept": 0}

        for src in sources:
            cards = fetch_etsy_search(src["url"])
            if not cards:
                continue

            # Aggregate signal across the search page itself, then derive a single idea per source
            avg_price = None
            prices = [c["price"] for c in cards if c["price"]]
            if prices:
                avg_price = sum(prices) / len(prices)

            blob = f"Etsy search results for {src['name']}:\n\n" + "\n".join(
                f"- {c['title']} (${c.get('price') or '?'})" for c in cards[:20]
            )
            found += 1
            metadata = {
                "etsy_competitor_count": len(cards),
                "etsy_avg_price": round(avg_price, 2) if avg_price else None,
                "etsy_top_sellers": [
                    {"title": c["title"], "shop": "", "price": c.get("price") or 0, "reviews": 0, "url": ("https://etsy.com" + c["url"]) if c["url"].startswith("/") else c["url"]}
                    for c in cards[:6]
                ],
                "source_url": src["url"],
                "source_links": [{"type": "etsy", "title": c["title"], "url": ("https://etsy.com" + c["url"]) if c["url"].startswith("/") else c["url"]} for c in cards[:6]],
            }
            try:
                res = process_raw_content("etsy", blob, metadata)
                if res.get("status") == "kept":
                    kept += 1
                else:
                    rejected += 1
            except Exception as e:
                print(f"[etsy] pipeline failure: {e}")
                rejected += 1
            time.sleep(2.5)
        log_scrape_finish(log_id, "ok", found, kept, rejected)
        return {"found": found, "kept": kept, "rejected": rejected}
    except Exception as e:
        log_scrape_finish(log_id, "error", found, kept, rejected, error=str(e)[:500])
        raise


@app.task(name="tasks.etsy_scraper.run")
def run():
    return run_sync()
