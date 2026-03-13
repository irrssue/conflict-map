# Conflict Map Tracker — Build Plan
> Iran-Israel live conflict map with OSINT aggregation, AI event extraction, and interactive map UI

---

## Project Overview

Build a full-stack web app that:
1. Pulls news from public APIs/RSS feeds every 60 seconds
2. Uses Claude AI to extract structured event data (type, location, severity)
3. Geocodes locations to lat/lng coordinates
4. Displays events as pins on an interactive map in real time

**Stack:** Python (FastAPI) + PostgreSQL + React + Mapbox GL JS

---

## Folder Structure

```
conflict-map/
├── backend/
│   ├── main.py               # FastAPI app entry point
│   ├── scheduler.py          # APScheduler cron jobs
│   ├── fetcher.py            # RSS/NewsAPI feed fetcher
│   ├── extractor.py          # Claude API event extraction
│   ├── geocoder.py           # Location → lat/lng
│   ├── models.py             # SQLAlchemy DB models
│   ├── database.py           # DB connection setup
│   ├── routes/
│   │   └── events.py         # GET /api/events endpoint
│   ├── requirements.txt
│   └── .env                  # API keys (never commit this)
│
├── frontend/
│   ├── index.html
│   ├── package.json
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── components/
│       │   ├── Map.jsx        # Mapbox map with event pins
│       │   ├── Sidebar.jsx    # Event feed list
│       │   ├── EventCard.jsx  # Individual event item
│       │   └── FilterBar.jsx  # Filter by event type
│       └── hooks/
│           └── useEvents.js   # Polling hook for live updates
│
├── docker-compose.yml         # Postgres + backend + frontend
└── README.md
```

---

## Phase 1 — Backend Data Pipeline

### Step 1: Project Setup

```bash
mkdir conflict-map && cd conflict-map
mkdir backend frontend
cd backend
python -m venv venv
source venv/bin/activate
pip install fastapi uvicorn sqlalchemy psycopg2-binary apscheduler \
            httpx feedparser anthropic python-dotenv
```

Create `backend/.env`:
```
DATABASE_URL=postgresql://user:password@localhost:5432/conflictmap
ANTHROPIC_API_KEY=your_key_here
NEWSAPI_KEY=your_key_here         # optional, free tier at newsapi.org
MAPBOX_TOKEN=your_token_here      # public token, safe in frontend
```

---

### Step 2: Database Model (`models.py`)

Create a single `events` table:

```python
# models.py
from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    description = Column(Text)
    event_type = Column(String)       # "airstrike" | "missile" | "explosion" | "diplomatic" | "other"
    severity = Column(String)         # "low" | "medium" | "high" | "critical"
    location_name = Column(String)
    latitude = Column(Float)
    longitude = Column(Float)
    source_url = Column(String)
    source_name = Column(String)
    published_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
```

---

### Step 3: News Fetcher (`fetcher.py`)

Fetch from RSS feeds — no API key needed for most:

```python
# fetcher.py
import feedparser
import httpx

RSS_FEEDS = [
    # Al Jazeera Middle East
    "https://www.aljazeera.com/xml/rss/all.xml",
    # Reuters World News
    "https://feeds.reuters.com/Reuters/worldNews",
    # BBC Middle East
    "http://feeds.bbci.co.uk/news/world/middle_east/rss.xml",
    # Times of Israel
    "https://www.timesofisrael.com/feed/",
    # Jerusalem Post
    "https://www.jpost.com/Rss/RssFeedsHeadlines.aspx",
]

KEYWORDS = [
    "iran", "israel", "idf", "irgc", "tehran", "tel aviv",
    "airstrike", "missile", "drone", "hezbollah", "hamas",
    "explosion", "attack", "nuclear", "strike"
]

def fetch_all_articles():
    articles = []
    for feed_url in RSS_FEEDS:
        feed = feedparser.parse(feed_url)
        for entry in feed.entries:
            text = (entry.get("title", "") + " " + entry.get("summary", "")).lower()
            if any(kw in text for kw in KEYWORDS):
                articles.append({
                    "title": entry.get("title", ""),
                    "description": entry.get("summary", ""),
                    "url": entry.get("link", ""),
                    "source": feed.feed.get("title", "Unknown"),
                    "published": entry.get("published", ""),
                })
    return articles
```

---

### Step 4: AI Event Extractor (`extractor.py`)

Use Claude to parse raw news into structured data:

```python
# extractor.py
import anthropic
import json
import os

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

SYSTEM_PROMPT = """You are a conflict intelligence analyst. Given a news headline and description,
extract structured event data. Respond ONLY with valid JSON, no markdown, no explanation.

JSON schema:
{
  "is_conflict_event": true/false,
  "event_type": "airstrike" | "missile_launch" | "explosion" | "ground_operation" | "diplomatic" | "naval" | "cyber" | "other",
  "severity": "low" | "medium" | "high" | "critical",
  "location_name": "City, Country (be specific)",
  "summary": "1-2 sentence neutral summary of the event"
}

If the article is not about a specific conflict event, set is_conflict_event to false."""

def extract_event(title: str, description: str) -> dict | None:
    prompt = f"Title: {title}\n\nDescription: {description}"
    
    message = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=300,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}]
    )
    
    try:
        data = json.loads(message.content[0].text)
        if not data.get("is_conflict_event"):
            return None
        return data
    except (json.JSONDecodeError, IndexError):
        return None
```

---

### Step 5: Geocoder (`geocoder.py`)

Convert location names to coordinates using free Nominatim API:

```python
# geocoder.py
import httpx
import time

GEOCODE_CACHE = {}

def geocode(location_name: str) -> tuple[float, float] | None:
    if location_name in GEOCODE_CACHE:
        return GEOCODE_CACHE[location_name]
    
    time.sleep(1)  # Nominatim rate limit: 1 req/sec
    
    url = "https://nominatim.openstreetmap.org/search"
    params = {"q": location_name, "format": "json", "limit": 1}
    headers = {"User-Agent": "ConflictMapTracker/1.0"}
    
    try:
        resp = httpx.get(url, params=params, headers=headers, timeout=5)
        results = resp.json()
        if results:
            lat = float(results[0]["lat"])
            lon = float(results[0]["lon"])
            GEOCODE_CACHE[location_name] = (lat, lon)
            return lat, lon
    except Exception:
        pass
    
    return None
```

---

### Step 6: Scheduler (`scheduler.py`)

Wire everything together with a cron job:

```python
# scheduler.py
from apscheduler.schedulers.background import BackgroundScheduler
from fetcher import fetch_all_articles
from extractor import extract_event
from geocoder import geocode
from database import SessionLocal
from models import Event
from datetime import datetime

def run_pipeline():
    print("Running news pipeline...")
    db = SessionLocal()
    articles = fetch_all_articles()
    
    for article in articles:
        # Skip duplicates by URL
        existing = db.query(Event).filter_by(source_url=article["url"]).first()
        if existing:
            continue
        
        extracted = extract_event(article["title"], article["description"])
        if not extracted:
            continue
        
        coords = geocode(extracted["location_name"])
        if not coords:
            continue
        
        event = Event(
            title=article["title"],
            description=extracted["summary"],
            event_type=extracted["event_type"],
            severity=extracted["severity"],
            location_name=extracted["location_name"],
            latitude=coords[0],
            longitude=coords[1],
            source_url=article["url"],
            source_name=article["source"],
            published_at=datetime.utcnow(),
        )
        db.add(event)
    
    db.commit()
    db.close()
    print("Pipeline complete.")

def start_scheduler():
    scheduler = BackgroundScheduler()
    scheduler.add_job(run_pipeline, "interval", minutes=1)
    scheduler.start()
    return scheduler
```

---

### Step 7: FastAPI App (`main.py`)

```python
# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from scheduler import start_scheduler
from routes.events import router as events_router

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Conflict Map API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(events_router, prefix="/api")

@app.on_event("startup")
def startup():
    start_scheduler()
```

---

### Step 8: Events Route (`routes/events.py`)

```python
# routes/events.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import Event

router = APIRouter()

@router.get("/events")
def get_events(db: Session = Depends(get_db), limit: int = 100):
    events = db.query(Event).order_by(Event.published_at.desc()).limit(limit).all()
    return [
        {
            "id": e.id,
            "title": e.title,
            "description": e.description,
            "event_type": e.event_type,
            "severity": e.severity,
            "location_name": e.location_name,
            "latitude": e.latitude,
            "longitude": e.longitude,
            "source_url": e.source_url,
            "source_name": e.source_name,
            "published_at": e.published_at.isoformat() if e.published_at else None,
        }
        for e in events
    ]
```

---

## Phase 2 — Frontend (React + Mapbox)

### Step 1: Setup

```bash
cd ../frontend
npm create vite@latest . -- --template react
npm install mapbox-gl @mapbox/mapbox-gl-geocoder axios
```

---

### Step 2: Map Component (`Map.jsx`)

- Initialize Mapbox map centered on Middle East (lat: 32, lng: 44, zoom: 5)
- On load, fetch `/api/events`
- For each event, add a colored circle marker based on severity:
  - `critical` → red `#FF0000`
  - `high` → orange `#FF6600`
  - `medium` → yellow `#FFCC00`
  - `low` → blue `#0066FF`
- On marker click, show a popup with title, description, source link
- Poll `/api/events` every 30 seconds and update markers

---

### Step 3: Sidebar (`Sidebar.jsx`)

- Scrollable list of events sorted newest first
- Each `EventCard` shows: event type icon, location, severity badge, time ago, source name
- Clicking a card flies the map to that event's coordinates
- Filter buttons at top: `All | Airstrike | Missile | Diplomatic | Naval`

---

### Step 4: Live Polling Hook (`useEvents.js`)

```javascript
// hooks/useEvents.js
import { useState, useEffect } from "react";
import axios from "axios";

export function useEvents(intervalMs = 30000) {
  const [events, setEvents] = useState([]);

  const fetchEvents = async () => {
    const res = await axios.get("http://localhost:8000/api/events");
    setEvents(res.data);
  };

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, intervalMs);
    return () => clearInterval(interval);
  }, []);

  return events;
}
```

---

## Phase 3 — Docker Setup

```yaml
# docker-compose.yml
version: "3.8"
services:
  db:
    image: postgres:15
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: conflictmap
    ports:
      - "5432:5432"

  backend:
    build: ./backend
    ports:
      - "8000:8000"
    env_file: ./backend/.env
    depends_on:
      - db
    command: uvicorn main:app --host 0.0.0.0 --port 8000 --reload

  frontend:
    build: ./frontend
    ports:
      - "5173:5173"
    environment:
      - VITE_MAPBOX_TOKEN=your_mapbox_public_token
```

---

## Phase 4 — Build Order for Claude Code

Tell Claude Code to build in this exact order:

1. `backend/database.py` — DB connection
2. `backend/models.py` — Event schema
3. `backend/fetcher.py` — RSS feed fetcher
4. `backend/extractor.py` — Claude AI extractor
5. `backend/geocoder.py` — Nominatim geocoder
6. `backend/scheduler.py` — Cron job pipeline
7. `backend/routes/events.py` — API route
8. `backend/main.py` — FastAPI app
9. `backend/requirements.txt` — all dependencies
10. `frontend/src/hooks/useEvents.js` — polling hook
11. `frontend/src/components/EventCard.jsx`
12. `frontend/src/components/FilterBar.jsx`
13. `frontend/src/components/Sidebar.jsx`
14. `frontend/src/components/Map.jsx`
15. `frontend/src/App.jsx`
16. `docker-compose.yml`
17. `README.md` with setup instructions

---

## API Keys Needed (All Free Tier)

| Service | Purpose | Get it at |
|---|---|---|
| Anthropic | Event extraction AI | console.anthropic.com |
| Mapbox | Interactive map | mapbox.com (free 50k loads/mo) |
| Nominatim | Geocoding | Built-in, no key needed |
| NewsAPI | Optional extra news source | newsapi.org (free 100 req/day) |

---

## Notes for Claude Code

- Use `python-dotenv` to load all secrets from `.env` — never hardcode keys
- Deduplicate events by `source_url` before inserting to DB
- Add a `try/except` around every external API call
- Nominatim requires `User-Agent` header and 1 req/sec max — respect this
- Use `claude-sonnet-4-20250514` as the model in extractor.py
- The frontend Mapbox token is public — put it in `VITE_MAPBOX_TOKEN`
- Run `run_pipeline()` once immediately on startup before the scheduler begins
