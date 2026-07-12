import { useState } from "react";
import DetailsPanel from "./components/DetailsPanel";
import GraphCanvas from "./components/GraphCanvas";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import Timeline from "./components/Timeline";

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  return (
    <div className="app">
      <Header />

      <main
        className={[
          "main",
          isSidebarOpen ? "sidebar-open" : "sidebar-closed",
          isDetailsOpen ? "details-open" : "details-closed",
        ].join(" ")}
      >
        <Sidebar
          isOpen={isSidebarOpen}
          onToggle={() => setIsSidebarOpen((current) => !current)}
        />

        <GraphCanvas />

        <DetailsPanel
          isOpen={isDetailsOpen}
          onToggle={() => setIsDetailsOpen((current) => !current)}
        />
      </main>

      <Timeline />
    </div>
  );
}

export default App;