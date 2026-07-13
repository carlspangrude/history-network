import { useMemo, useState } from "react";
import DetailsPanel from "./components/DetailsPanel";
import GraphCanvas from "./components/GraphCanvas";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import Timeline from "./components/Timeline";
import { sampleGraph } from "./data/sampleGraph";
import type {
  ForceGraphData,
  GraphNode,
  KnowledgeEdge,
} from "./types/graph";

function App() {
  // ===========================================================================
  // State
  // ===========================================================================

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  // ===========================================================================
  // Derived Data
  // ===========================================================================

  const graphData = useMemo<ForceGraphData>(
    () => ({
      nodes: sampleGraph.nodes.map((node) => ({ ...node })),
      links: sampleGraph.edges.map((edge) => ({ ...edge })),
    }),
    [],
  );

  const selectedRelationships = useMemo<KnowledgeEdge[]>(() => {
    if (!selectedNode) {
      return [];
    }

    return sampleGraph.edges.filter(
      (edge) =>
        edge.source === selectedNode.id ||
        edge.target === selectedNode.id,
    );
  }, [selectedNode]);

  // ===========================================================================
  // Event Handlers
  // ===========================================================================

  const handleNodeSelect = (node: GraphNode) => {
    setSelectedNode(node);
    setIsDetailsOpen(true);
  };

  // ===========================================================================
  // Render
  // ===========================================================================

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

        <GraphCanvas
          graphData={graphData}
          selectedNode={selectedNode}
          onNodeSelect={handleNodeSelect}
        />

        <DetailsPanel
          isOpen={isDetailsOpen}
          selectedNode={selectedNode}
          relationships={selectedRelationships}
          graphNodes={graphData.nodes}
          onNodeSelect={handleNodeSelect}
          onToggle={() => setIsDetailsOpen((current) => !current)}
        />
      </main>

      <Timeline />
    </div>
  );
}

export default App;