"""LLM-free heuristic relevance filter + idea extractor.

Used as the fallback when no OPENROUTER/ANTHROPIC key is configured. Permissive
enough to keep digital-product opportunities, strict enough to drop spam and
off-topic content.
"""

from __future__ import annotations
import re

# Strong product-format keywords — single match counts as +2
PRODUCT_KEYWORDS = {
    "template": "template", "templates": "template",
    "ebook": "ebook", "e-book": "ebook", "guide": "ebook", "manual": "ebook", "workbook": "ebook",
    "course": "course", "masterclass": "course", "cohort": "course", "bootcamp": "course",
    "notion template": "notion_template", "notion": "notion_template",
    "calculator": "calculator", "spreadsheet": "spreadsheet", "google sheet": "spreadsheet", "excel": "spreadsheet",
    "printable": "printable", "planner": "printable", "journal": "printable", "worksheet": "printable",
    "pod": "pod", "print on demand": "pod", "print-on-demand": "pod",
    "preset": "preset_pack", "lightroom": "preset_pack",
    "swipe file": "swipe_file", "swipe": "swipe_file",
    "gpt": "ai_product", "prompt pack": "ai_product", "prompts": "ai_product", "chatgpt": "ai_product",
    "automation": "ai_product", "n8n": "ai_product", "make.com": "ai_product", "zapier": "ai_product",
    "saas": "app", "app": "app", "chrome extension": "code_product", "boilerplate": "code_product",
    "membership": "membership", "community": "membership",
    "newsletter": "newsletter", "substack": "newsletter", "beehiiv": "newsletter",
    "directory": "dataset", "database": "dataset", "csv": "dataset", "lead list": "dataset",
    "figma kit": "figma_kit", "ui kit": "figma_kit",
    "canva": "canva_kit",
}

# Marketplace mentions — +2 each
MARKETPLACE_KEYWORDS = {
    "etsy": "etsy", "gumroad": "gumroad", "whop": "whop",
    "creative market": "creative_market", "envato": "envato",
    "appsumo": "appsumo", "product hunt": "product_hunt", "producthunt": "product_hunt",
    "skool": "skool", "shopify": "shopify",
    "gpt store": "gpt_store",
    "notion marketplace": "notion_marketplace",
}

# Demand-signal phrases — +2 each
DEMAND_PHRASES = [
    "is there", "does anyone", "anyone know", "looking for", "i wish",
    "where can i find", "how do i", "what do you use", "recommend",
    "any good", "what's the best", "anyone have", "is anyone selling",
    "i'm building", "i'm launching", "just launched", "shipped",
    "$1k month", "$10k month", "monthly recurring", "mrr",
    "passive income", "side hustle", "side project",
]

# Niche keywords — +1 each
NICHE_KEYWORDS = [
    "fitness", "nutrition", "carnivore", "keto", "vegan",
    "finance", "personal finance", "budget", "investing",
    "productivity", "second brain", "para",
    "ai", "ml", "machine learning", "llm", "agents",
    "marketing", "seo", "copywriting", "newsletter", "email",
    "design", "ui", "ux", "branding",
    "photography", "lightroom", "videography",
    "wedding", "events", "parenting", "kids", "homeschool",
    "teachers", "education", "esl", "students",
    "real estate", "career", "resume", "interview",
    "etsy seller", "dropshipping", "e-commerce", "ecommerce",
    "crafts", "knitting", "crochet",
    "indie hacker", "founder", "solopreneur",
    "christian", "spiritual", "wellness", "mental health",
]

# Spam / low-signal patterns
SPAM_PATTERNS = [
    re.compile(r"^https?://\S+\s*$", re.I),
    re.compile(r"^\[deleted\]|\[removed\]\s*$", re.I),
    re.compile(r"buy\s+followers", re.I),
    re.compile(r"(adult|nsfw|porn|xxx)", re.I),
]


def _matches_any(text: str, keywords: dict | list, count: int = 1) -> int:
    """Count distinct keyword matches up to `count` cap."""
    blob = text.lower()
    n = 0
    iterable = keywords.keys() if isinstance(keywords, dict) else keywords
    for k in iterable:
        if k in blob:
            n += 1
            if n >= count:
                return count
    return n


def is_spam(text: str) -> bool:
    if not text or len(text.strip()) < 30:
        return True
    for p in SPAM_PATTERNS:
        if p.search(text):
            return True
    return False


def is_relevant_heuristic(text: str) -> bool:
    """Permissive relevance filter — return True if the text smells like a digital-product opportunity or demand signal."""
    if not text or is_spam(text):
        return False
    blob = text.lower()
    score = 0
    score += min(2, _matches_any(blob, PRODUCT_KEYWORDS, count=2)) * 2
    score += min(2, _matches_any(blob, MARKETPLACE_KEYWORDS, count=2)) * 2
    score += min(2, _matches_any(blob, NICHE_KEYWORDS, count=2)) * 1
    for p in DEMAND_PHRASES:
        if p in blob:
            score += 2
            break
    # Action words boost
    for a in ("sell", "launch", "build", "create", "ship", "earn", "monetize"):
        if a in blob:
            score += 1
            break
    return score >= 3


def _detect_category(text: str) -> str:
    blob = text.lower()
    # Specific composite phrases first
    if "notion template" in blob or ("notion" in blob and "template" in blob):
        return "notion_template"
    if "figma" in blob:
        return "figma_kit"
    if "canva" in blob:
        return "canva_kit"
    if any(k in blob for k in ("preset", "lightroom")):
        return "preset_pack"
    if any(k in blob for k in ("course", "masterclass", "cohort", "bootcamp")):
        return "course"
    if any(k in blob for k in ("printable", "planner", "journal", "worksheet")):
        return "printable"
    if any(k in blob for k in ("pod ", "print on demand", "print-on-demand", "t-shirt design")):
        return "pod"
    if any(k in blob for k in ("calculator", "spreadsheet", "google sheet", "excel")):
        return "calculator" if "calculator" in blob else "spreadsheet"
    if any(k in blob for k in ("gpt", "prompt pack", "prompts", "chatgpt", "n8n", "zapier", "make.com", "automation")):
        return "ai_product"
    if any(k in blob for k in ("swipe file", "swipe", "scripts")):
        return "swipe_file"
    if any(k in blob for k in ("directory", "database", "csv ", "lead list")):
        return "dataset"
    if any(k in blob for k in ("membership", "community", "discord", "skool")):
        return "membership"
    if any(k in blob for k in ("newsletter", "substack", "beehiiv")):
        return "newsletter"
    if any(k in blob for k in ("chrome extension", "boilerplate", "starter kit")):
        return "code_product"
    if any(k in blob for k in ("ebook", "e-book", "guide", "manual", "workbook")):
        return "ebook"
    if any(k in blob for k in ("template", "kit")):
        return "template"
    return "ebook"


def _detect_niches(text: str) -> list[str]:
    blob = text.lower()
    found = []
    for n in NICHE_KEYWORDS:
        if n in blob:
            # Map composites to canonical tags
            canonical = (
                n.replace("indie hacker", "career")
                 .replace("solopreneur", "career")
                 .replace("personal finance", "finance")
                 .replace("e-commerce", "ecommerce")
                 .replace("etsy seller", "etsy")
                 .replace("interview", "career")
                 .replace("budget", "finance")
                 .replace("investing", "finance")
                 .replace("second brain", "productivity")
                 .replace("para", "productivity")
                 .replace("ml", "ai")
                 .replace("machine learning", "ai")
                 .replace("llm", "ai")
                 .replace("agents", "ai")
                 .replace("ui", "design")
                 .replace("ux", "design")
                 .replace("branding", "design")
                 .replace("personal trainer", "fitness")
                 .replace("kids", "parenting")
                 .replace("students", "career")
                 .replace("dropshipping", "ecommerce")
                 .replace("founder", "career")
            )
            if canonical not in found:
                found.append(canonical)
    return found[:6]


def _detect_marketplace_fit(category: str) -> list[str]:
    mapping = {
        "ebook":            ["gumroad", "shopify"],
        "course":           ["gumroad", "whop", "shopify"],
        "notion_template":  ["gumroad", "notion_marketplace"],
        "template":         ["gumroad", "etsy"],
        "canva_kit":        ["etsy", "creative_market", "gumroad"],
        "figma_kit":        ["creative_market", "gumroad"],
        "calculator":       ["gumroad", "shopify"],
        "spreadsheet":      ["etsy", "gumroad"],
        "printable":        ["etsy", "gumroad"],
        "pod":              ["etsy", "shopify"],
        "preset_pack":      ["etsy", "gumroad", "creative_market"],
        "swipe_file":       ["gumroad", "shopify"],
        "ai_product":       ["gumroad", "whop", "gpt_store"],
        "app":              ["appsumo", "shopify"],
        "membership":       ["whop", "skool"],
        "newsletter":       ["beehiiv", "substack"],
        "dataset":          ["gumroad", "shopify"],
        "stock_assets":     ["creative_market", "envato"],
        "code_product":     ["gumroad", "envato"],
    }
    return mapping.get(category, ["gumroad"])


def _detect_effort(text: str) -> str:
    blob = text.lower()
    if any(k in blob for k in ("simple", "minimal", "single page", "spreadsheet", "printable", "preset")):
        return "low"
    if any(k in blob for k in ("app", "saas", "extension", "automation", "course", "membership")):
        return "high"
    return "medium"


def _detect_time(effort: str) -> str:
    return {"low": "3-5 days", "medium": "1-2 weeks", "high": "2 weeks"}.get(effort, "1-2 weeks")


def _make_title(text: str) -> str:
    # First non-empty line, trimmed
    for line in text.split("\n"):
        s = line.strip().strip(".:-").strip()
        if 8 <= len(s) <= 120:
            # Drop URL-only lines
            if s.startswith("http"):
                continue
            return s[:120]
    # Fallback: first 80 chars
    return (text[:80].strip() or "Digital product opportunity").rstrip(".,;:")


def extract_idea_heuristic(text: str, source: str | None = None) -> dict | None:
    """Pull a basic idea structure from raw text using rules. Lower quality than LLM but works offline."""
    if not text or is_spam(text):
        return None
    if not is_relevant_heuristic(text):
        return None

    title = _make_title(text)
    summary = text.strip().replace("\n", " ")[:280]
    category = _detect_category(text)
    niches = _detect_niches(text) or ["productivity"]
    effort = _detect_effort(text)
    time_to_build = _detect_time(effort)
    marketplace_fit = _detect_marketplace_fit(category)

    # Estimated price by category (rough)
    price_map = {
        "ebook": "$19-39", "course": "$99-299", "notion_template": "$29-79",
        "template": "$15-39", "canva_kit": "$24-49", "figma_kit": "$59-129",
        "calculator": "$15-29", "spreadsheet": "$15-29", "printable": "$8-19",
        "pod": "$59 bundle", "preset_pack": "$19-39", "swipe_file": "$29-59",
        "ai_product": "$39-99", "app": "$9-29/mo or $79 LTD",
        "membership": "$19-49/mo", "newsletter": "$9/mo paid tier",
        "dataset": "$49-149 + refresh fee", "code_product": "$79-149",
    }
    price = price_map.get(category, "$19-39")

    return {
        "title": title,
        "summary": summary,
        "category": category,
        "subcategory": None,
        "niches": niches,
        "product_format": None,
        "marketplace_fit": marketplace_fit,
        "estimated_price_range": price,
        "estimated_monthly_rev": None,
        "effort_to_build": effort,
        "time_to_build": time_to_build,
        "differentiation_angle": None,
    }


def score_alignment_heuristic(idea_summary: str, rules: list[str]) -> float:
    """Cheap heuristic alignment scorer — counts negation phrases against rules."""
    if not idea_summary:
        return 0.5
    blob = idea_summary.lower()
    score = 0.6  # base mild-positive
    for r in rules:
        rb = r.lower()
        # Penalty: golden-rule violations (regulated advice mentions)
        if any(w in blob for w in ("medical advice", "legal advice", "financial advisor", "diagnose")):
            if any(w in rb for w in ("medical", "legal", "financial advisor", "regulated")):
                score -= 0.4
        # Bonus: if rule says "prefer X" and X appears
        if "prefer" in rb:
            tokens = re.findall(r"prefer\s+([a-z\- ]{4,30})", rb)
            for t in tokens:
                if t.strip() in blob:
                    score += 0.05
    return max(0.0, min(1.0, score))
