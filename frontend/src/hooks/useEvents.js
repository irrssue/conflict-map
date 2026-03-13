import { useState, useEffect } from "react";
import axios from "axios";

export function useEvents(intervalMs = 30000) {
  const [events, setEvents] = useState([]);

  const fetchEvents = async () => {
    try {
      const res = await axios.get("http://localhost:8000/api/events");
      setEvents(res.data);
    } catch (err) {
      console.error("Failed to fetch events:", err);
    }
  };

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, intervalMs);
    return () => clearInterval(interval);
  }, []);

  return events;
}
