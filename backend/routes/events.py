from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from database import get_db
from models import Event

router = APIRouter()


@router.get("/events")
def get_events(
    db: Session = Depends(get_db),
    limit: int = Query(default=200, ge=1, le=500),
):
    events = (
        db.query(Event)
        .order_by(Event.published_at.desc())
        .limit(limit)
        .all()
    )
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
