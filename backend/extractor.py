from __future__ import annotations

import google.generativeai as genai
import json
import os
import logging
import time

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# Gemini free tier: 15 RPM for gemini-2.0-flash
REQUEST_DELAY = 5  # seconds between requests (12 per minute, safely under 15 RPM)
MAX_RETRIES = 3
BACKOFF_BASE = 30  # seconds to wait on rate limit before retrying
BATCH_SIZE = 10  # articles per Gemini call

api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
if not api_key:
    logger.error("No Gemini API key found. Set GEMINI_API_KEY in .env")
genai.configure(api_key=api_key)
client = genai.GenerativeModel("gemini-2.0-flash")

SYSTEM_PROMPT = """You are a conflict intelligence analyst. Given a batch of news articles, extract structured event data for each. Respond ONLY with a valid JSON array, no markdown, no explanation.

For each article, produce an object with this schema:
{
  "index": <article index from input>,
  "is_conflict_event": true/false,
  "event_type": "airstrike" | "missile_launch" | "explosion" | "ground_operation" | "diplomatic" | "naval" | "cyber" | "other",
  "severity": "low" | "medium" | "high" | "critical",
  "location_name": "City, Country (be as specific as possible)",
  "summary": "1-2 sentence neutral factual summary of the event"
}

Severity guide:
- critical: mass casualties, major infrastructure destroyed, escalation risk
- high: significant military engagement, confirmed strikes, naval confrontation
- medium: skirmishes, intercepted attacks, protests with violence
- low: diplomatic tensions, minor incidents, unconfirmed reports

Set is_conflict_event to false if the article is an opinion piece, historical analysis, or not about a specific current conflict event."""


def extract_event(title: str, description: str) -> dict | None:
    """Extract a single event (fallback for one-off calls)."""
    results = extract_events_batch([(title, description)])
    return results[0] if results else None


def extract_events_batch(articles: list[tuple[str, str]]) -> list[dict | None]:
    """Extract events from a batch of (title, description) tuples in one API call."""
    prompt_parts = [SYSTEM_PROMPT, "\n\nArticles:\n"]
    for i, (title, desc) in enumerate(articles):
        prompt_parts.append(f"\n[{i}] Title: {title}\nDescription: {desc}\n")

    for attempt in range(MAX_RETRIES):
        try:
            time.sleep(REQUEST_DELAY)
            response = client.generate_content("".join(prompt_parts))
            text = response.text.strip()
            # Strip markdown code fences if present
            if text.startswith("```"):
                text = text.split("```")[1]
                if text.startswith("json"):
                    text = text[4:]
            data = json.loads(text)
            if not isinstance(data, list):
                data = [data]
            # Build index-based lookup
            results_map = {}
            for item in data:
                idx = item.get("index", 0)
                if item.get("is_conflict_event"):
                    results_map[idx] = item
            return [results_map.get(i) for i in range(len(articles))]
        except json.JSONDecodeError as e:
            logger.warning(f"JSON parse error for batch: {e}")
            return [None] * len(articles)
        except Exception as e:
            if "429" in str(e) or "quota" in str(e).lower() or "resource_exhausted" in str(e).lower():
                wait = BACKOFF_BASE * (2 ** attempt)
                logger.warning(f"Rate limited, retrying in {wait}s (attempt {attempt + 1}/{MAX_RETRIES})")
                time.sleep(wait)
                continue
            logger.error(f"Batch extraction failed: {e}")
            return [None] * len(articles)
    logger.error("Max retries exceeded for batch")
    return [None] * len(articles)
