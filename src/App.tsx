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
  // ===========================================================================
  // State
  // ===========================================================================

  const [activeView, setActiveView] = useState<AppView>("explore");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isTimelineOpen, setIsTimelineOpen] = useState(true);

  // ===========================================================================
  // Knowledge Graph
  // ===========================================================================

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
    nodesIgnoringYearFilter,
    yearRange,
    pathwaySearchSourceId,
    activePathway,
    pathwaySteps,
    pathwayNotFound,
    pathwayNotFoundTargetName,
    anchoredNodeIds,
    handleDisciplineToggle,
    handleDisciplineSelectAll,
    handleNodeSelect,
    handleNodeTypeToggle,
    handleNodeTypeSelectAll,
    handleRelationshipOpen,
    handleRelationshipSelect,
    handleSelectionClear,
    handleYearRangeChange,
    handlePathwaySearchStart,
    handlePathwaySearchCancel,
    handlePathwayTargetSelect,
    handlePathwayClear,
    handleNodeAnchored,
    handleNodeUnanchor,
    handleUnanchorAll,
  } = useKnowledgeGraph({
    onSelectionCleared: () => setIsDetailsOpen(false),
    onSelectionOpened: () => setIsDetailsOpen(true),
  });

  // ===========================================================================
  // Layout
  // ===========================================================================

  // A long node-type badge (e.g. "institution", "movement", "publication")
  // crowds the top row enough to wrap the Find a path button onto two
  // lines, even when the node's own title is short — so it needs to
  // trigger the wide layout independently of name length.
  const isSelectedNodeTypeWide = (selectedNode?.type.length ?? 0) > 7;

  // The pathway search and result views need extra width to avoid
  // horizontal overflow (long node names in search results / path steps).
  const isPathwayModeActive = Boolean(pathwaySearchSourceId) || Boolean(activePathway);

  const shouldUseWideDetails =
    (selectedNode?.name.length ?? 0) > 24 ||
    isSelectedNodeTypeWide ||
    isPathwayModeActive ||
    [
      selectedRelationship
        ? graphData.nodes.find(
            (node) => node.id === selectedRelationship.source,
          )?.name ?? ""
        : "",
      selectedRelationship
        ? graphData.nodes.find(
            (node) => node.id === selectedRelationship.target,
          )?.name ?? ""
        : "",
    ].some((name) => name.length > 24);

  const pathwayNodeIds = activePathway?.nodeIds ?? [];
  const pathwayLinkIds = activePathway?.linkIds ?? [];

  // ===========================================================================
  // Render
  // ===========================================================================

  return (
    <div className="app">
      <Header
        nodes={graphData.nodes}
        selectedNode={selectedNode}
        onNodeSelect={handleNodeSelect}
      />

      <nav className="app-tabs" aria-label="Application views">
        <button
          className={
            activeView === "explore"
              ? "app-tab app-tab--active"
              : "app-tab"
          }
          type="button"
          aria-current={activeView === "explore" ? "page" : undefined}
          onClick={() => setActiveView("explore")}
        >
          Explore
        </button>

        <button
          className={
            activeView === "citations"
              ? "app-tab app-tab--active"
              : "app-tab"
          }
          type="button"
          aria-current={activeView === "citations" ? "page" : undefined}
          onClick={() => setActiveView("citations")}
        >
          Citations
        </button>
      </nav>

      <div
        className={
          activeView === "explore"
            ? "explore-view"
            : "explore-view explore-view--hidden"
        }
        aria-hidden={activeView !== "explore"}
        style={
          {
            "--timeline-height": isTimelineOpen ? "275px" : "44px",
          } as React.CSSProperties
        }
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
            pathwayNodeIds={pathwayNodeIds}
            pathwayLinkIds={pathwayLinkIds}
            anchoredNodeIds={anchoredNodeIds}
            onNodeAnchored={handleNodeAnchored}
            onUnanchorAll={handleUnanchorAll}
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
            pathwaySearchSourceId={pathwaySearchSourceId}
            activePathway={activePathway}
            pathwaySteps={pathwaySteps}
            pathwayNotFound={pathwayNotFound}
            pathwayNotFoundTargetName={pathwayNotFoundTargetName}
            onPathwaySearchStart={handlePathwaySearchStart}
            onPathwaySearchCancel={handlePathwaySearchCancel}
            onPathwayTargetSelect={handlePathwayTargetSelect}
            onPathwayClear={handlePathwayClear}
            anchoredNodeIds={anchoredNodeIds}
            onNodeUnanchor={handleNodeUnanchor}
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
            nodesIgnoringYearFilter={nodesIgnoringYearFilter}
            pathwayNodeIds={pathwayNodeIds}
            pathwayLinkIds={pathwayLinkIds}
            anchoredNodeIds={anchoredNodeIds}
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
