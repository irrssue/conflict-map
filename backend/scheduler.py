import logging
from datetime import datetime, timezone

from apscheduler.schedulers.background import BackgroundScheduler
from fetcher import fetch_all_articles
from extractor import extract_events_batch, BATCH_SIZE
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

        # Filter out duplicates and articles without URLs
        new_articles = []
        for article in articles:
            url = article.get("url", "")
            if not url:
                continue
            existing = db.query(Event).filter_by(source_url=url).first()
            if existing:
                continue
            new_articles.append(article)

        logger.info(f"{len(new_articles)} new articles to process in batches of {BATCH_SIZE}")

        # Process in batches
        for i in range(0, len(new_articles), BATCH_SIZE):
            batch = new_articles[i:i + BATCH_SIZE]
            batch_tuples = [(a["title"], a.get("description", "")) for a in batch]
            results = extract_events_batch(batch_tuples)

            batch_count = 0
            for article, extracted in zip(batch, results):
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
                    source_url=article["url"],
                    source_name=article["source"],
                    published_at=datetime.now(timezone.utc),
                )
                db.add(event)
                batch_count += 1

            # Commit after each batch so events appear on frontend immediately
            db.commit()
            new_count += batch_count
            logger.info(f"Batch {i // BATCH_SIZE + 1}: {batch_count} events added ({new_count} total)")

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
    scheduler.add_job(run_pipeline, "interval", hours=2)
    scheduler.start()
    logger.info("Scheduler started — pipeline runs every 2 hours.")
    return scheduler
