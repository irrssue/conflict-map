import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import ICONS from "../data/markerIcons";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const SEVERITY_COLORS = {
  critical: "#FF0000",
  high: "#FF6600",
  medium: "#FFCC00",
  low: "#0066FF",
};

const TYPE_LABELS = {
  airstrike: "AIRSTRIKE",
  missile_launch: "MISSILE",
  explosion: "EXPLOSION",
  ground_operation: "GROUND OP",
  diplomatic: "DIPLOMATIC",
  naval: "NAVAL",
  cyber: "CYBER",
  other: "OTHER",
};

function createMarkerElement(event) {
  const color = SEVERITY_COLORS[event.severity] || "#888888";
  const iconSvg = ICONS[event.event_type] || ICONS.other;
  const isCritical = event.severity === "critical";

  const wrapper = document.createElement("div");
  wrapper.className = "event-marker-wrapper";
  wrapper.style.cssText = `
    position: relative;
    width: 36px;
    height: 36px;
    cursor: pointer;
  `;

  // Pulse ring for critical events
  if (isCritical) {
    const pulse = document.createElement("div");
    pulse.className = "marker-pulse";
    pulse.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      width: 36px;
      height: 36px;
      transform: translate(-50%, -50%);
      border-radius: 50%;
      border: 2px solid ${color};
      animation: pulse-ring 2s ease-out infinite;
      pointer-events: none;
    `;
    wrapper.appendChild(pulse);
  }

  // Icon container (the circle with icon inside)
  const container = document.createElement("div");
  container.style.cssText = `
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: rgba(10, 10, 10, 0.85);
    border: 2px solid ${color};
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 0 12px ${color}66, 0 2px 8px rgba(0,0,0,0.5);
    transition: transform 0.2s, box-shadow 0.2s;
    color: ${color};
  `;

  const iconEl = document.createElement("div");
  iconEl.style.cssText = `
    width: 16px;
    height: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
  `;
  iconEl.innerHTML = iconSvg;

  container.appendChild(iconEl);
  wrapper.appendChild(container);

  // Hover effects
  wrapper.addEventListener("mouseenter", () => {
    container.style.transform = "translate(-50%, -50%) scale(1.3)";
    container.style.boxShadow = `0 0 20px ${color}aa, 0 2px 12px rgba(0,0,0,0.6)`;
  });
  wrapper.addEventListener("mouseleave", () => {
    container.style.transform = "translate(-50%, -50%) scale(1)";
    container.style.boxShadow = `0 0 12px ${color}66, 0 2px 8px rgba(0,0,0,0.5)`;
  });

  return wrapper;
}

function formatTimeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

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
      const typeLabel = TYPE_LABELS[event.event_type] || "EVENT";
      const timeAgo = event.published_at ? formatTimeAgo(event.published_at) : "";

      const el = createMarkerElement(event);

      const popup = new mapboxgl.Popup({
        offset: 20,
        closeButton: false,
        className: "event-popup",
        maxWidth: "280px",
      }).setHTML(`
        <div style="font-family: monospace; font-size: 11px; line-height: 1.6;">
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
            <span style="
              background: ${color}22;
              border: 1px solid ${color};
              color: ${color};
              font-size: 9px;
              padding: 1px 6px;
              border-radius: 3px;
              letter-spacing: 1px;
              font-weight: bold;
            ">${typeLabel}</span>
            <span style="
              background: ${color}22;
              border: 1px solid ${color}66;
              color: ${color};
              font-size: 9px;
              padding: 1px 6px;
              border-radius: 3px;
              text-transform: uppercase;
            ">${event.severity}</span>
            <span style="color: rgba(255,255,255,0.3); font-size: 9px; margin-left: auto;">${timeAgo}</span>
          </div>
          <div style="font-weight: bold; margin-bottom: 4px; font-size: 12px; color: #f0f0f0;">${event.title}</div>
          <div style="color: rgba(255,255,255,0.45); margin-bottom: 6px; font-size: 10px;">
            ${event.location_name}
          </div>
          <div style="color: rgba(255,255,255,0.65); margin-bottom: 8px;">${event.description || ""}</div>
          <a href="${event.source_url}" target="_blank" rel="noopener noreferrer"
             style="color: #66aaff; text-decoration: none; font-size: 10px;">
            ${event.source_name} &#8599;
          </a>
        </div>
      `);

      const marker = new mapboxgl.Marker({ element: el, anchor: "center" })
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
