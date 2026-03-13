import { useState } from "react";
import Map from "./components/Map";
import NavBar from "./components/NavBar";
import { useEvents } from "./hooks/useEvents";

export default function App() {
  const events = useEvents(30000);
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedEvent, setSelectedEvent] = useState(null);

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#0a0a0a", overflow: "hidden" }}>
      <Map
        events={events}
        activeFilter={activeFilter}
        onEventSelect={setSelectedEvent}
      />
      <NavBar
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        events={events}
        selectedEvent={selectedEvent}
      />
    </div>
  );
}
