const FILTERS = [
  { key: "all", label: "ALL" },
  { key: "airstrike", label: "AIRSTRIKE" },
  { key: "missile_launch", label: "MISSILE" },
  { key: "explosion", label: "EXPLOSION" },
  { key: "ground_operation", label: "GROUND" },
  { key: "diplomatic", label: "DIPLOMATIC" },
  { key: "naval", label: "NAVAL" },
  { key: "cyber", label: "CYBER" },
];

const SEVERITY_DOT = {
  critical: "#FF0000",
  high: "#FF6600",
  medium: "#FFCC00",
  low: "#0066FF",
};

export default function NavBar({ activeFilter, onFilterChange, events, selectedEvent }) {
  const recentEvents = [...events]
    .sort((a, b) => new Date(b.published_at) - new Date(a.published_at))
    .slice(0, 1)[0];

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: "52px",
        background: "rgba(10, 10, 10, 0.92)",
        backdropFilter: "blur(12px)",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px",
        zIndex: 1000,
        gap: "12px",
      }}
    >
      {/* Brand */}
      <div
        style={{
          fontFamily: "monospace",
          fontSize: "11px",
          fontWeight: "bold",
          color: "#FF3333",
          letterSpacing: "2px",
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
      >
        WAR MAP
      </div>

      {/* Divider */}
      <div style={{ width: "1px", height: "24px", background: "rgba(255,255,255,0.1)", flexShrink: 0 }} />

      {/* Filters */}
      <div style={{ display: "flex", gap: "4px", overflowX: "auto", flexShrink: 1 }}>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => onFilterChange(f.key)}
            style={{
              background: activeFilter === f.key ? "rgba(255,255,255,0.12)" : "transparent",
              border: activeFilter === f.key ? "1px solid rgba(255,255,255,0.25)" : "1px solid transparent",
              color: activeFilter === f.key ? "#fff" : "rgba(255,255,255,0.4)",
              fontFamily: "monospace",
              fontSize: "10px",
              letterSpacing: "1px",
              padding: "4px 10px",
              borderRadius: "3px",
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "all 0.15s",
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Divider */}
      <div style={{ width: "1px", height: "24px", background: "rgba(255,255,255,0.1)", flexShrink: 0 }} />

      {/* Event count + latest */}
      <div
        style={{
          fontFamily: "monospace",
          fontSize: "10px",
          color: "rgba(255,255,255,0.35)",
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
      >
        {events.length > 0 ? (
          <>
            <span style={{ color: "rgba(255,255,255,0.6)" }}>{events.length}</span> events
          </>
        ) : (
          "no events"
        )}
      </div>

      {/* Severity legend */}
      <div style={{ display: "flex", gap: "10px", flexShrink: 0 }}>
        {Object.entries(SEVERITY_DOT).map(([severity, color]) => (
          <div
            key={severity}
            style={{ display: "flex", alignItems: "center", gap: "4px", fontFamily: "monospace", fontSize: "9px", color: "rgba(255,255,255,0.3)", letterSpacing: "0.5px" }}
          >
            <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: color }} />
            {severity.toUpperCase()}
          </div>
        ))}
      </div>
    </nav>
  );
}
