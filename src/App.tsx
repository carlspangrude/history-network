import { useState } from "react";
import DetailsPanel from "./components/DetailsPanel";
import GraphCanvas from "./components/GraphCanvas";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import Timeline from "./components/Timeline";
import { useKnowledgeGraph } from "./hooks/useKnowledgeGraph";

function App() {
  // ===========================================================================
  // State
  // ===========================================================================

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

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
    handleDisciplineToggle,
    handleNodeSelect,
    handleNodeTypeToggle,
    handleRelationshipOpen,
    handleRelationshipSelect,
    handleSelectionClear,
  } = useKnowledgeGraph({
    onSelectionCleared: () => setIsDetailsOpen(false),
    onSelectionOpened: () => setIsDetailsOpen(true),
  });

  // ===========================================================================
  // Layout
  // ===========================================================================

  const shouldUseWideDetails =
  (selectedNode?.name.length ?? 0) > 24 ||
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

  // ===========================================================================
  // Render
  // ===========================================================================

  return (
    <div className="app">
      <Header
        nodes={graphData.nodes}
        onNodeSelect={handleNodeSelect}
      />

      <main
        className={[
          "main",
          isSidebarOpen ? "sidebar-open" : "sidebar-closed",
          isDetailsOpen ? "details-open" : "details-closed",
          shouldUseWideDetails 
            ? "details-wide" 
            : "details-standard",
        ].join(" ")}
      >
        <Sidebar
          availableDisciplines={availableDisciplines}
          isOpen={isSidebarOpen}
          visibleDisciplines={visibleDisciplines}
          visibleNodeTypes={visibleNodeTypes}
          onDisciplineToggle={handleDisciplineToggle}
          onNodeTypeToggle={handleNodeTypeToggle}
          onToggle={() => 
            setIsSidebarOpen((current) => !current)
          }
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
          onToggle={() => 
            setIsDetailsOpen((current) => !current)
          }
        />
      </main>

      <Timeline />
    </div>
  );
}

export default App;