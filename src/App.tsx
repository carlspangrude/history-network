import { useMemo, useState } from "react";
import DetailsPanel from "./components/DetailsPanel";
import GraphCanvas from "./components/GraphCanvas";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import Timeline from "./components/Timeline";
import { sampleGraph } from "./data/sampleGraph";
import type { ForceGraphData, GraphNode } from "./types/graph";

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  const graphData = useMemo<ForceGraphData>(
    () => ({
      nodes: sampleGraph.nodes.map((node) => ({ ...node })),
      links: sampleGraph.edges.map((edge) => ({ ...edge })),
    }),
    [],
  );

  const handleNodeSelect = (node: GraphNode) => {
    setSelectedNode(node);
    setIsDetailsOpen(true);
  };

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
          onToggle={() => setIsDetailsOpen((current) => !current)}
        />
      </main>

      <Timeline />
    </div>
  );
}

export default App;