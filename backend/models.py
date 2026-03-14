from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from sqlalchemy.orm import declarative_base
from datetime import datetime

Base = declarative_base()


class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    description = Column(Text)
    event_type = Column(String)   # airstrike | missile_launch | explosion | ground_operation | diplomatic | naval | cyber | other
    severity = Column(String)     # low | medium | high | critical
    location_name = Column(String)
    latitude = Column(Float)
    longitude = Column(Float)
    source_url = Column(String, unique=True, index=True)
    source_name = Column(String)
    published_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
