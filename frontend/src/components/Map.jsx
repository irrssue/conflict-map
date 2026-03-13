import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import ICONS from "../data/markerIcons";

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

function svgToImage(svgStr, size) {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    const blob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const img = new Image(size, size);
    img.onload = () => {
      ctx.drawImage(img, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve({
        width: size,
        height: size,
        data: new Uint8Array(ctx.getImageData(0, 0, size, size).data),
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

async function loadAllIcons(m) {
  const promises = [];
  for (const [type, svg] of Object.entries(ICONS)) {
    for (const [severity, color] of Object.entries(SEVERITY_COLORS)) {
      const name = `icon-${type}-${severity}`;
      if (m.hasImage(name)) continue;
      const coloredSvg = svg.replace(/currentColor/g, color);
      promises.push(
        svgToImage(coloredSvg, 32).then((data) => {
          if (data && !m.hasImage(name)) m.addImage(name, data);
        })
      );
    }
  }
  await Promise.all(promises);
}

function formatTimeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function toGeoJSON(events, activeFilter) {
  const filtered =
    activeFilter === "all"
      ? events
      : events.filter((e) => e.event_type === activeFilter);

  return {
    type: "FeatureCollection",
    features: filtered
      .filter((e) => e.latitude && e.longitude)
      .map((event, i) => ({
        type: "Feature",
        id: i,
        geometry: {
          type: "Point",
          coordinates: [event.longitude, event.latitude],
        },
        properties: {
          severity: event.severity || "medium",
          event_type: event.event_type || "other",
          title: event.title || "",
          description: event.description || "",
          location_name: event.location_name || "",
          source_name: event.source_name || "",
          source_url: event.source_url || "",
          published_at: event.published_at || "",
        },
      })),
  };
}

const SEVERITY_MATCH = [
  "match",
  ["get", "severity"],
  "critical", "#FF0000",
  "high", "#FF6600",
  "medium", "#FFCC00",
  "low", "#0066FF",
  "#888888",
];

export default function Map({ events, activeFilter, onEventSelect }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const popupRef = useRef(null);
  const sourceReady = useRef(false);
  const latestData = useRef({ events: [], activeFilter: "all" });
  const onEventSelectRef = useRef(onEventSelect);

  onEventSelectRef.current = onEventSelect;
  latestData.current = { events, activeFilter };

  useEffect(() => {
    if (map.current) return;

    const m = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://tiles.openfreemap.org/styles/dark",
      center: [44, 32],
      zoom: 4.5,
      projection: "mercator",
    });
    map.current = m;

    m.on("load", async () => {
      await loadAllIcons(m);

      m.addSource("events", {
        type: "geojson",
        data: toGeoJSON(
          latestData.current.events,
          latestData.current.activeFilter
        ),
      });

      // Outer glow
      m.addLayer({
        id: "events-glow",
        type: "circle",
        source: "events",
        paint: {
          "circle-radius": 20,
          "circle-color": SEVERITY_MATCH,
          "circle-opacity": 0.15,
          "circle-blur": 1,
        },
      });

      // Background circle
      m.addLayer({
        id: "events-bg",
        type: "circle",
        source: "events",
        paint: {
          "circle-radius": 14,
          "circle-color": "rgba(10, 10, 10, 0.85)",
          "circle-stroke-width": 2,
          "circle-stroke-color": SEVERITY_MATCH,
        },
      });

      // SVG icons inside circles
      m.addLayer({
        id: "events-icons",
        type: "symbol",
        source: "events",
        layout: {
          "icon-image": [
            "concat",
            "icon-",
            ["get", "event_type"],
            "-",
            ["get", "severity"],
          ],
          "icon-size": 0.5,
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
        },
      });

      sourceReady.current = true;

      // Click → popup + fly
      m.on("click", "events-bg", (e) => {
        if (!e.features?.length) return;
        const f = e.features[0];
        const coords = f.geometry.coordinates.slice();
        const p = f.properties;
        const color = SEVERITY_COLORS[p.severity] || "#888888";
        const typeLabel = TYPE_LABELS[p.event_type] || "EVENT";
        const timeAgo = p.published_at
          ? formatTimeAgo(p.published_at)
          : "";

        if (popupRef.current) popupRef.current.remove();

        popupRef.current = new maplibregl.Popup({
          offset: 20,
          closeButton: false,
          className: "event-popup",
          maxWidth: "280px",
        })
          .setLngLat(coords)
          .setHTML(
            `<div style="font-family: monospace; font-size: 11px; line-height: 1.6;">
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
                ">${p.severity}</span>
                <span style="color: rgba(255,255,255,0.3); font-size: 9px; margin-left: auto;">${timeAgo}</span>
              </div>
              <div style="font-weight: bold; margin-bottom: 4px; font-size: 12px; color: #f0f0f0;">${p.title}</div>
              <div style="color: rgba(255,255,255,0.45); margin-bottom: 6px; font-size: 10px;">
                ${p.location_name}
              </div>
              <div style="color: rgba(255,255,255,0.65); margin-bottom: 8px;">${p.description}</div>
              <a href="${p.source_url}" target="_blank" rel="noopener noreferrer"
                 style="color: #66aaff; text-decoration: none; font-size: 10px;">
                ${p.source_name} &#8599;
              </a>
            </div>`
          )
          .addTo(m);

        onEventSelectRef.current?.(p);
        m.flyTo({ center: coords, zoom: 8, duration: 1000 });
      });

      m.on("mouseenter", "events-bg", () => {
        m.getCanvas().style.cursor = "pointer";
      });
      m.on("mouseleave", "events-bg", () => {
        m.getCanvas().style.cursor = "";
      });
    });

    return () => {
      map.current?.remove();
      map.current = null;
      sourceReady.current = false;
    };
  }, []);

  // Update source data when events or filter changes
  useEffect(() => {
    if (!map.current || !sourceReady.current) return;
    const source = map.current.getSource("events");
    if (source) {
      source.setData(toGeoJSON(events, activeFilter));
    }
  }, [events, activeFilter]);

  return <div ref={mapContainer} style={{ width: "100%", height: "100%" }} />;
}
