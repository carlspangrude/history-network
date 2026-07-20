import { useState } from "react";
import DetailsPanel from "./components/DetailsPanel";
import GraphCanvas from "./components/GraphCanvas";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import TimelineCanvas from "./components/TimelineCanvas";
import { useKnowledgeGraph } from "./hooks/useKnowledgeGraph";
import CitationsView from "./components/CitationsView";

type AppView = "explore" | "citations";

function App() {
  const [activeView, setActiveView] = useState<AppView>("explore");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isTimelineOpen, setIsTimelineOpen] = useState(true);

  const {
    availableDisciplines,
    graphData,
    selectedNode,
    selectedRelationship,
    selectedRelationshipId,
    selectedRelationships,
    visibleDisciplines,
    visibleNodeTypes,
    yearBounds,
    yearRange,
    handleDisciplineToggle,
    handleDisciplineSelectAll,
    handleNodeSelect,
    handleNodeTypeToggle,
    handleNodeTypeSelectAll,
    handleRelationshipOpen,
    handleRelationshipSelect,
    handleSelectionClear,
    handleYearRangeChange,
  } = useKnowledgeGraph({
    onSelectionCleared: () => setIsDetailsOpen(false),
    onSelectionOpened: () => setIsDetailsOpen(true),
  });

  const shouldUseWideDetails =
    (selectedNode?.name.length ?? 0) > 24 ||
    [
      selectedRelationship
        ? graphData.nodes.find((node) => node.id === selectedRelationship.source)?.name ?? ""
        : "",
      selectedRelationship
        ? graphData.nodes.find((node) => node.id === selectedRelationship.target)?.name ?? ""
        : "",
    ].some((name) => name.length > 24);

  return (
    <div className="app">
      <Header nodes={graphData.nodes} onNodeSelect={handleNodeSelect} />

      <nav className="app-tabs" aria-label="Application views">
        <button
          className={activeView === "explore" ? "app-tab app-tab--active" : "app-tab"}
          type="button"
          aria-current={activeView === "explore" ? "page" : undefined}
          onClick={() => setActiveView("explore")}
        >
          Explore
        </button>

        <button
          className={activeView === "citations" ? "app-tab app-tab--active" : "app-tab"}
          type="button"
          aria-current={activeView === "citations" ? "page" : undefined}
          onClick={() => setActiveView("citations")}
        >
          Citations
        </button>
      </nav>

      <div
        className={activeView === "explore" ? "explore-view" : "explore-view explore-view--hidden"}
        aria-hidden={activeView !== "explore"}
        style={{ "--timeline-height": isTimelineOpen ? "220px" : "44px" } as React.CSSProperties}
      >
        <main
          className={[
            "main",
            isSidebarOpen ? "sidebar-open" : "sidebar-closed",
            isDetailsOpen ? "details-open" : "details-closed",
            shouldUseWideDetails ? "details-wide" : "details-standard",
          ].join(" ")}
        >
          <Sidebar
            availableDisciplines={availableDisciplines}
            isOpen={isSidebarOpen}
            visibleDisciplines={visibleDisciplines}
            visibleNodeTypes={visibleNodeTypes}
            onDisciplineToggle={handleDisciplineToggle}
            onDisciplineSelectAll={handleDisciplineSelectAll}
            onNodeTypeToggle={handleNodeTypeToggle}
            onNodeTypeSelectAll={handleNodeTypeSelectAll}
            onToggle={() => setIsSidebarOpen((current) => !current)}
          />

          <GraphCanvas
            graphData={graphData}
            selectedNode={selectedNode}
            selectedRelationshipId={selectedRelationshipId}
            onNodeSelect={handleNodeSelect}
            onRelationshipOpen={handleRelationshipOpen}
            onSelectionClear={handleSelectionClear}
          />

          <DetailsPanel
            isOpen={isDetailsOpen}
            selectedNode={selectedNode}
            selectedRelationship={selectedRelationship}
            selectedRelationshipId={selectedRelationshipId}
            relationships={selectedRelationships}
            graphNodes={graphData.nodes}
            onNodeSelect={handleNodeSelect}
            onRelationshipSelect={handleRelationshipSelect}
            onSelectionClear={handleSelectionClear}
            onToggle={() => setIsDetailsOpen((current) => !current)}
          />
        </main>

        <div className="timeline-strip">
          <TimelineCanvas
            compact
            isOpen={isTimelineOpen}
            onToggle={() => setIsTimelineOpen((current) => !current)}
            graphData={graphData}
            selectedNode={selectedNode}
            selectedRelationshipId={selectedRelationshipId}
            onNodeSelect={handleNodeSelect}
            onRelationshipOpen={handleRelationshipOpen}
            onSelectionClear={handleSelectionClear}
            yearBounds={yearBounds}
            yearRange={yearRange}
            onYearRangeChange={handleYearRangeChange}
          />
        </div>
      </div>

      <div
        className={
          activeView === "citations"
            ? "citations-view-container"
            : "citations-view-container citations-view-container--hidden"
        }
        aria-hidden={activeView !== "citations"}
      >
        <CitationsView />
      </div>
    </div>
  );
}

export default App;