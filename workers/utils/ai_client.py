"""Cheap-model client for relevance filtering + structured idea extraction.

Routes via OpenRouter using its OpenAI-compatible API. Falls back to Anthropic if available.
"""

from __future__ import annotations
import os
import json
import re
from typing import Any
import httpx


OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "deepseek/deepseek-chat")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-5")


def call_cheap_model(system: str, user: str, max_tokens: int = 800, temperature: float = 0.2) -> str:
    """Call the cheap LLM. Returns text. Empty string on error/missing key."""
    if OPENROUTER_API_KEY:
        try:
            with httpx.Client(timeout=30.0) as client:
                r = client.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                        "HTTP-Referer": "https://localhost:4477",
                        "X-Title": "TrendForge",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": OPENROUTER_MODEL,
                        "messages": [
                            {"role": "system", "content": system},
                            {"role": "user", "content": user},
                        ],
                        "max_tokens": max_tokens,
                        "temperature": temperature,
                    },
                )
                r.raise_for_status()
                data = r.json()
                return data["choices"][0]["message"]["content"]
        except Exception as e:
            print(f"[ai_client] OpenRouter call failed: {e}")

    if ANTHROPIC_API_KEY:
        try:
            with httpx.Client(timeout=30.0) as client:
                r = client.post(
                    "https://api.anthropic.com/v1/messages",
                    headers={
                        "x-api-key": ANTHROPIC_API_KEY,
                        "anthropic-version": "2023-06-01",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": ANTHROPIC_MODEL,
                        "max_tokens": max_tokens,
                        "system": system,
                        "messages": [{"role": "user", "content": user}],
                    },
                )
                r.raise_for_status()
                data = r.json()
                return data["content"][0]["text"]
        except Exception as e:
            print(f"[ai_client] Anthropic call failed: {e}")

    return ""


def extract_json_from_response(text: str) -> dict | list | None:
    """Pull JSON from a model response, handling fenced code blocks and lead-in prose."""
    if not text:
        return None
    # Try fenced code block first
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
    candidate = fence.group(1).strip() if fence else text.strip()
    # Trim to outermost braces if there's leading/trailing prose
    first_brace = min((candidate.find("{"), candidate.find("[")), key=lambda x: (x if x >= 0 else 10**9))
    if first_brace == -1:
        return None
    last_brace = max(candidate.rfind("}"), candidate.rfind("]"))
    if last_brace <= first_brace:
        return None
    snippet = candidate[first_brace : last_brace + 1]
    try:
        return json.loads(snippet)
    except Exception:
        # Last-ditch: try removing trailing commas
        cleaned = re.sub(r",\s*([}\]])", r"\1", snippet)
        try:
            return json.loads(cleaned)
        except Exception:
            return None


RELEVANCE_SYSTEM = (
    "You are a binary classifier for digital-product opportunities. "
    "A relevant text mentions, asks for, or describes a sellable digital product "
    "(ebook, course, template, calculator, app, AI tool, dataset, printable, POD design, "
    "membership, newsletter, etc.) OR a clear demand signal for one. "
    "Respond with EXACTLY 'YES' or 'NO' on a single line."
)


def has_any_llm_key() -> bool:
    return bool(OPENROUTER_API_KEY) or bool(ANTHROPIC_API_KEY)


def is_relevant(text: str) -> bool:
    """Cheap binary relevance classifier. Falls back to heuristic if no LLM key."""
    if not text or len(text) < 30:
        return False
    if not has_any_llm_key():
        from utils.heuristics import is_relevant_heuristic
        return is_relevant_heuristic(text)
    out = call_cheap_model(RELEVANCE_SYSTEM, text[:1500], max_tokens=8, temperature=0.0)
    if not out:
        from utils.heuristics import is_relevant_heuristic
        return is_relevant_heuristic(text)
    return out.strip().upper().startswith("Y")


EXTRACT_SYSTEM = (
    "You analyze raw text from forums, marketplaces, or web pages and extract a single most-promising "
    "digital-product opportunity. Output ONLY valid JSON with these fields:\n"
    "{\n"
    '  "title": str (specific, sellable),\n'
    '  "summary": str (2-3 sentences),\n'
    '  "category": one of [ebook, course, notion_template, template, canva_kit, figma_kit, calculator, '
    "spreadsheet, printable, pod, preset_pack, swipe_file, ai_product, app, membership, newsletter, "
    'dataset, stock_assets, code_product, three_d],\n'
    '  "subcategory": str | null,\n'
    '  "niches": [str] (lowercase tags like fitness, finance, etsy, ai),\n'
    '  "product_format": str | null (pdf, notion-template, csv, web-app, etc),\n'
    '  "marketplace_fit": [str] (etsy, gumroad, whop, shopify, creative_market, appsumo, gpt_store),\n'
    '  "estimated_price_range": str | null,\n'
    '  "estimated_monthly_rev": str | null,\n'
    '  "effort_to_build": one of [low, medium, high],\n'
    '  "time_to_build": str | null,\n'
    '  "differentiation_angle": str | null\n'
    "}\n"
    "If the text is not a real product opportunity, output: null"
)


def extract_idea_json(raw_text: str, source: str | None = None) -> dict | None:
    if not raw_text:
        return None
    if not has_any_llm_key():
        from utils.heuristics import extract_idea_heuristic
        return extract_idea_heuristic(raw_text, source)
    user = raw_text[:3000]
    if source:
        user = f"Source: {source}\n\n{user}"
    out = call_cheap_model(EXTRACT_SYSTEM, user, max_tokens=600, temperature=0.2)
    parsed = extract_json_from_response(out)
    if isinstance(parsed, dict) and parsed.get("title"):
        return parsed
    # LLM call failed — fallback to heuristic
    from utils.heuristics import extract_idea_heuristic
    return extract_idea_heuristic(raw_text, source)


BRAIN_ALIGNMENT_SYSTEM = (
    "You score how well a candidate digital-product opportunity aligns with a set of operator rules. "
    "Output a single number from 0.0 to 1.0 (no other text). 1.0 = perfect alignment, 0.0 = clear violation."
)


def score_alignment(idea_summary: str, rules: list[str]) -> float:
    if not idea_summary or not rules:
        return 0.5
    if not has_any_llm_key():
        from utils.heuristics import score_alignment_heuristic
        return score_alignment_heuristic(idea_summary, rules)
    user = "Candidate idea:\n" + idea_summary[:1000] + "\n\nRules:\n" + "\n".join(f"- {r}" for r in rules)
    out = call_cheap_model(BRAIN_ALIGNMENT_SYSTEM, user, max_tokens=8, temperature=0.0).strip()
    try:
        v = float(out.split()[0])
        return max(0.0, min(1.0, v))
    except Exception:
        from utils.heuristics import score_alignment_heuristic
        return score_alignment_heuristic(idea_summary, rules)
