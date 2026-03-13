import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const SEVERITY_COLORS = {
  critical: "#FF0000",
  high: "#FF6600",
  medium: "#FFCC00",
  low: "#0066FF",
};

export default function Map({ events, activeFilter, onEventSelect }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    if (map.current) return;
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [44, 32],
      zoom: 4.5,
      projection: "mercator",
    });
  }, []);

  useEffect(() => {
    if (!map.current) return;

    // Remove old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const filtered =
      activeFilter === "all"
        ? events
        : events.filter((e) => e.event_type === activeFilter);

    filtered.forEach((event) => {
      if (!event.latitude || !event.longitude) return;

      const color = SEVERITY_COLORS[event.severity] || "#888888";

      const el = document.createElement("div");
      el.className = "event-marker";
      el.style.cssText = `
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: ${color};
        border: 2px solid rgba(255,255,255,0.4);
        cursor: pointer;
        box-shadow: 0 0 8px ${color}88;
        transition: transform 0.15s;
      `;
      el.addEventListener("mouseenter", () => (el.style.transform = "scale(1.6)"));
      el.addEventListener("mouseleave", () => (el.style.transform = "scale(1)"));

      const popup = new mapboxgl.Popup({
        offset: 12,
        closeButton: false,
        className: "event-popup",
      }).setHTML(`
        <div style="font-family: monospace; font-size: 11px; max-width: 220px; line-height: 1.5;">
          <div style="font-weight: bold; margin-bottom: 4px; font-size: 12px;">${event.title}</div>
          <div style="color: #aaa; margin-bottom: 6px;">${event.location_name}</div>
          <div style="margin-bottom: 6px;">${event.description || ""}</div>
          <a href="${event.source_url}" target="_blank" rel="noopener noreferrer"
             style="color: #66aaff; text-decoration: none;">
            ${event.source_name} ↗
          </a>
        </div>
      `);

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([event.longitude, event.latitude])
        .setPopup(popup)
        .addTo(map.current);

      el.addEventListener("click", () => {
        onEventSelect?.(event);
        map.current.flyTo({
          center: [event.longitude, event.latitude],
          zoom: 8,
          duration: 1000,
        });
      });

      markersRef.current.push(marker);
    });
  }, [events, activeFilter]);

  return <div ref={mapContainer} style={{ width: "100%", height: "100%" }} />;
}
