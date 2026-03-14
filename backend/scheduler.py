import logging
from datetime import datetime, timezone

from apscheduler.schedulers.background import BackgroundScheduler
from fetcher import fetch_all_articles
from extractor import extract_event
from geocoder import geocode
from database import SessionLocal
from models import Event

logger = logging.getLogger(__name__)


def run_pipeline():
    logger.info("Running news pipeline...")
    db = SessionLocal()
    new_count = 0

    try:
        articles = fetch_all_articles()

        for article in articles:
            url = article.get("url", "")
            if not url:
                continue

            # Skip duplicates
            existing = db.query(Event).filter_by(source_url=url).first()
            if existing:
                continue

            extracted = extract_event(article["title"], article["description"])
            if not extracted:
                continue

            coords = geocode(extracted["location_name"])
            if not coords:
                logger.warning(f"Could not geocode: {extracted['location_name']}")
                continue

            event = Event(
                title=article["title"],
                description=extracted["summary"],
                event_type=extracted["event_type"],
                severity=extracted["severity"],
                location_name=extracted["location_name"],
                latitude=coords[0],
                longitude=coords[1],
                source_url=url,
                source_name=article["source"],
                published_at=datetime.now(timezone.utc),
            )
            db.add(event)
            new_count += 1

        db.commit()
        logger.info(f"Pipeline complete — {new_count} new events added.")
    except Exception as e:
        db.rollback()
        logger.error(f"Pipeline error: {e}")
    finally:
        db.close()


def start_scheduler():
    scheduler = BackgroundScheduler()
    # Run once after a short delay so the server can start accepting requests
    scheduler.add_job(run_pipeline, "date")
    scheduler.add_job(run_pipeline, "interval", minutes=15)
    scheduler.start()
    logger.info("Scheduler started — pipeline runs every 15 minutes.")
    return scheduler
