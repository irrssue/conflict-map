const FILTERS = [
  { key: "all", label: "ALL", icon: "◉" },
  { key: "airstrike", label: "AIRSTRIKE", icon: "⚡" },
  { key: "missile_launch", label: "MISSILE", icon: "🚀" },
  { key: "explosion", label: "EXPLOSION", icon: "💥" },
  { key: "ground_operation", label: "GROUND", icon: "⊕" },
  { key: "diplomatic", label: "DIPLOMATIC", icon: "⚑" },
  { key: "naval", label: "NAVAL", icon: "⚓" },
  { key: "cyber", label: "CYBER", icon: "⟨/⟩" },
];

const SEVERITY_DOT = {
  critical: "#FF0000",
  high: "#FF6600",
  medium: "#FFCC00",
  low: "#0066FF",
};

export default function NavBar({ activeFilter, onFilterChange, events }) {
  const getFilterCount = (key) => {
    if (key === "all") return events.length;
    return events.filter((e) => e.event_type === key).length;
  };

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
      <div style={{ display: "flex", gap: "4px", overflowX: "auto", flexShrink: 1, scrollbarWidth: "none", msOverflowStyle: "none" }}>
        {FILTERS.map((f) => {
          const count = getFilterCount(f.key);
          const isActive = activeFilter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => onFilterChange(f.key)}
              style={{
                background: isActive ? "rgba(255,255,255,0.12)" : "transparent",
                border: isActive ? "1px solid rgba(255,255,255,0.25)" : "1px solid transparent",
                color: isActive ? "#fff" : "rgba(255,255,255,0.4)",
                fontFamily: "monospace",
                fontSize: "10px",
                letterSpacing: "1px",
                padding: "4px 10px",
                borderRadius: "3px",
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.15s",
                display: "flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <span style={{ fontSize: "11px" }}>{f.icon}</span>
              {f.label}
              <span
                style={{
                  fontSize: "9px",
                  color: isActive ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.25)",
                  marginLeft: "2px",
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Divider */}
      <div style={{ width: "1px", height: "24px", background: "rgba(255,255,255,0.1)", flexShrink: 0 }} />

      {/* Event count */}
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
            <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: color, boxShadow: `0 0 4px ${color}66` }} />
            {severity.toUpperCase()}
          </div>
        ))}
      </div>
    </nav>
  );
}
