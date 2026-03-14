from __future__ import annotations

import google.generativeai as genai
import json
import os
import logging
import time

logger = logging.getLogger(__name__)

# Gemini free tier: 15 RPM for gemini-2.0-flash
REQUEST_DELAY = 5  # seconds between requests (12 per minute, safely under 15 RPM)
MAX_RETRIES = 3
BACKOFF_BASE = 30  # seconds to wait on rate limit before retrying

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
client = genai.GenerativeModel("gemini-2.0-flash")

SYSTEM_PROMPT = """You are a conflict intelligence analyst. Given a news headline and description, extract structured event data. Respond ONLY with valid JSON, no markdown, no explanation.

JSON schema:
{
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
    for attempt in range(MAX_RETRIES):
        try:
            time.sleep(REQUEST_DELAY)
            response = client.generate_content(f"{SYSTEM_PROMPT}\n\nTitle: {title}\n\nDescription: {description}")
            text = response.text.strip()
            # Strip markdown code fences if present
            if text.startswith("```"):
                text = text.split("```")[1]
                if text.startswith("json"):
                    text = text[4:]
            data = json.loads(text)
            if not data.get("is_conflict_event"):
                return None
            return data
        except json.JSONDecodeError as e:
            logger.warning(f"JSON parse error for '{title}': {e}")
            return None
        except Exception as e:
            if "429" in str(e) or "quota" in str(e).lower() or "resource_exhausted" in str(e).lower():
                wait = BACKOFF_BASE * (2 ** attempt)
                logger.warning(f"Rate limited, retrying in {wait}s (attempt {attempt + 1}/{MAX_RETRIES})")
                time.sleep(wait)
                continue
            logger.error(f"Extraction failed for '{title}': {e}")
            return None
    logger.error(f"Max retries exceeded for '{title}'")
    return None
