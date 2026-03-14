import { useState, useEffect } from "react";
import SAMPLE_EVENTS from "../data/events";

const API_URL = "/api/events";

export function useEvents(intervalMs = 30000) {
  const [events, setEvents] = useState(SAMPLE_EVENTS);

  const fetchEvents = async () => {
    try {
      const res = await fetch(API_URL);
      if (res.ok) {
        const data = await res.json();
        if (data.length > 0) {
          setEvents(data);
          return;
        }
      }
    } catch {
      // Backend unavailable — keep using sample data
    }
  };

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, intervalMs);
    return () => clearInterval(interval);
  }, []);

  return events;
}
