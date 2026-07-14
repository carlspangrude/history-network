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
  NodeType,
} from "./types/graph";

function App() {
  // ===========================================================================
  // State
  // ===========================================================================

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  const [visibleNodeTypes, setVisibleNodeTypes] = useState<Set<NodeType>>(
    new Set<NodeType>(["person", "theory", "publication"]),
  );

  const [visibleDisciplines, setVisibleDisciplines] = useState<Set<string>>(
    new Set(["Physics", "Mathematics", "Philosophy"]),
  );

  // ===========================================================================
  // Derived Data
  // ===========================================================================

  const fullGraphData = useMemo<ForceGraphData>(
    () => ({
      nodes: sampleGraph.nodes.map((node) => ({ ...node })),
      links: sampleGraph.edges.map((edge) => ({ ...edge })),
    }),
    [],
  );
  
  const graphData = useMemo<ForceGraphData>(() => {
  const visibleNodes = fullGraphData.nodes.filter((node) => {
    const isTypeVisible = visibleNodeTypes.has(node.type);

      const matchesVisibleDiscipline =
      node.disciplines == null ||
      node.disciplines.some((discipline) =>
        visibleDisciplines.has(discipline),
      );

    return isTypeVisible && matchesVisibleDiscipline;
  });

  const visibleNodeIds = new Set(visibleNodes.map((node) => node.id));

  const visibleLinks = fullGraphData.links.filter((link) => {
    const sourceId =
      typeof link.source === "string" ? link.source : link.source.id;

    const targetId =
      typeof link.target === "string" ? link.target : link.target.id;

    return visibleNodeIds.has(sourceId) && visibleNodeIds.has(targetId);
  });

  return {
    nodes: visibleNodes,
    links: visibleLinks,
  };
}, [fullGraphData, visibleDisciplines, visibleNodeTypes]);

const selectedRelationships = useMemo(() => {
  if (!selectedNode) {
    return [];
  }

  const visibleNodeIds = new Set(graphData.nodes.map((node) => node.id));

  return sampleGraph.edges.filter(
    (edge) =>
      visibleNodeIds.has(edge.source) &&
      visibleNodeIds.has(edge.target) &&
      (edge.source === selectedNode.id ||
        edge.target === selectedNode.id),
  );
}, [graphData.nodes, selectedNode]);

  // ===========================================================================
  // Event Handlers
  // ===========================================================================

  const handleNodeSelect = (node: GraphNode) => {
    setSelectedNode(node);
    setIsDetailsOpen(true);
  };

  const handleSelectionClear = () => {
    setSelectedNode(null);
    setIsDetailsOpen(false);
  };

  const handleNodeTypeToggle = (nodeType: NodeType) => {
    const isBeingHidden = visibleNodeTypes.has(nodeType);
  
    setVisibleNodeTypes((current) => {
      const next = new Set(current);
  
      if (next.has(nodeType)) {
        next.delete(nodeType);
      } else {
        next.add(nodeType);
      }
  
      return next;
    });
  
    if (isBeingHidden && selectedNode?.type === nodeType) {
      handleSelectionClear();
    }
  };

  const handleDisciplineToggle = (discipline: string) => {
    const isBeingHidden = visibleDisciplines.has(discipline);
  
    setVisibleDisciplines((current) => {
      const next = new Set(current);
  
      if (next.has(discipline)) {
        next.delete(discipline);
      } else {
        next.add(discipline);
      }
  
      return next;
    });
  
    if (
      isBeingHidden &&
      selectedNode?.disciplines?.includes(discipline) &&
      selectedNode.disciplines.every(
        (nodeDiscipline) =>
          nodeDiscipline === discipline ||
          !visibleDisciplines.has(nodeDiscipline),
      )
    ) {
      handleSelectionClear();
    }
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
          visibleDisciplines={visibleDisciplines}
          visibleNodeTypes={visibleNodeTypes}
          onDisciplineToggle={handleDisciplineToggle}
          onNodeTypeToggle={handleNodeTypeToggle}
          onToggle={() => setIsSidebarOpen((current) => !current)}
        />

        <GraphCanvas
          graphData={graphData}
          selectedNode={selectedNode}
          onNodeSelect={handleNodeSelect}
          onSelectionClear={handleSelectionClear}
        />

        <DetailsPanel
          isOpen={isDetailsOpen}
          selectedNode={selectedNode}
          relationships={selectedRelationships}
          graphNodes={graphData.nodes}
          onNodeSelect={handleNodeSelect}
          onSelectionClear={handleSelectionClear}
          onToggle={() => setIsDetailsOpen((current) => !current)}
        />
      </main>

      <Timeline />
    </div>
  );
}

export default App;