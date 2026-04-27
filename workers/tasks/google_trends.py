"""Google Trends scraper — uses pytrends."""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import time
from celery_app import app
from utils.db import get_active_sources, log_scrape_start, log_scrape_finish, get_approved_idea_niches
from tasks.idea_pipeline import process_raw_content

try:
    from pytrends.request import TrendReq
    PYTRENDS_OK = True
except Exception:
    PYTRENDS_OK = False


DEFAULT_KEYWORDS = ["digital products", "notion template", "chatgpt prompts", "meal planner", "resume template"]


def run_sync():
    log_id = log_scrape_start("google_trends")
    found = 0
    kept = 0
    rejected = 0

    if not PYTRENDS_OK:
        log_scrape_finish(log_id, "error", 0, 0, 0, error="pytrends not installed")
        return {"error": "pytrends not installed"}

    try:
        keywords = list(DEFAULT_KEYWORDS)
        for src in get_active_sources("google_trends"):
            tail = (src["url"] or "").replace("google_trends:", "")
            keywords.extend(k.strip() for k in tail.split(",") if k.strip())
        approved_niches = get_approved_idea_niches()
        keywords.extend(approved_niches[:6])
        keywords = list(dict.fromkeys(keywords))

        py = TrendReq(hl="en-US", tz=360)
        # pytrends caps at 5 keywords per request; chunk
        for i in range(0, len(keywords), 5):
            chunk = keywords[i : i + 5]
            try:
                py.build_payload(chunk, timeframe="today 3-m", geo="US")
                df = py.interest_over_time()
                if df is None or df.empty:
                    continue
                related = py.related_queries() or {}
                for kw in chunk:
                    if kw not in df.columns:
                        continue
                    series = df[kw]
                    last = int(series.iloc[-1]) if len(series) else 0
                    first = int(series.iloc[0]) if len(series) else 0
                    direction = "rising" if last > first + 5 else "declining" if last < first - 5 else "stable"
                    found += 1

                    rq = related.get(kw, {}).get("rising")
                    rising_terms = []
                    if rq is not None and not rq.empty:
                        rising_terms = [str(x) for x in rq["query"].head(5).tolist()]

                    blob = (
                        f"Google Trends 3-month interest for '{kw}': current={last}, start={first}, direction={direction}.\n"
                        f"Rising related queries: {', '.join(rising_terms) if rising_terms else 'none'}.\n"
                        f"Imagine and surface a digital product opportunity directly serving a rising '{kw}' interest."
                    )
                    metadata = {
                        "google_trends_score": last,
                        "google_trends_direction": direction,
                        "source_url": f"https://trends.google.com/trends/explore?q={kw.replace(' ', '+')}",
                        "source_links": [
                            {"type": "google_trends", "title": f"Google Trends for {kw}", "url": f"https://trends.google.com/trends/explore?q={kw.replace(' ', '+')}", "snippet": f"score={last}, direction={direction}"}
                        ],
                    }
                    try:
                        res = process_raw_content("google_trends", blob, metadata)
                        if res.get("status") == "kept":
                            kept += 1
                        else:
                            rejected += 1
                    except Exception as e:
                        print(f"[trends] pipeline failure: {e}")
                        rejected += 1
                time.sleep(2.0)
            except Exception as e:
                print(f"[trends] chunk failed: {e}")
                continue

        log_scrape_finish(log_id, "ok", found, kept, rejected)
        return {"found": found, "kept": kept, "rejected": rejected}
    except Exception as e:
        log_scrape_finish(log_id, "error", found, kept, rejected, error=str(e)[:500])
        raise


@app.task(name="tasks.google_trends.run")
def run():
    return run_sync()
