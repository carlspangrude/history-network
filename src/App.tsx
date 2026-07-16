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

const INITIAL_DISCIPLINES = Array.from(
  new Set(
    sampleGraph.nodes.flatMap((node) => node.disciplines ?? []),
  ),
).sort();

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
    new Set(INITIAL_DISCIPLINES),
  );

  const [selectedRelationshipId, setSelectedRelationshipId] = useState<string | null>(null);

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
  
  const availableDisciplines = useMemo(() => {
    const disciplines = new Set<string>();
  
    fullGraphData.nodes.forEach((node) => {
      node.disciplines?.forEach((discipline) => {
        disciplines.add(discipline);
      });
    });
  
    return Array.from(disciplines).sort();
  }, [fullGraphData.nodes]);
  
  const visibleNodeIds = useMemo(() => {
    return fullGraphData.nodes
      .filter((node) => {
        const isTypeVisible = visibleNodeTypes.has(node.type);
  
        const matchesVisibleDiscipline =
          node.disciplines == null ||
          node.disciplines.some((discipline) =>
            visibleDisciplines.has(discipline),
          );
  
        return isTypeVisible && matchesVisibleDiscipline;
      })
      .map((node) => node.id)
      .sort();
  }, [fullGraphData.nodes, visibleDisciplines, visibleNodeTypes]);
  
  const visibleNodeKey = visibleNodeIds.join("|");
  
  const graphData = useMemo<ForceGraphData>(() => {
    const visibleNodeIdSet = new Set(
      visibleNodeKey ? visibleNodeKey.split("|") : [],
    );
  
    const visibleNodes = fullGraphData.nodes.filter((node) =>
      visibleNodeIdSet.has(node.id),
    );
  
    const visibleLinks = fullGraphData.links.filter((link) => {
      const sourceId =
        typeof link.source === "string" ? link.source : link.source.id;
  
      const targetId =
        typeof link.target === "string" ? link.target : link.target.id;
  
      return (
        visibleNodeIdSet.has(sourceId) &&
        visibleNodeIdSet.has(targetId)
      );
    });
  
    return {
      nodes: visibleNodes,
      links: visibleLinks,
    };
  }, [fullGraphData, visibleNodeKey]);

  const selectedRelationships = useMemo(() => {
    if (!selectedNode) {
      return [];
    }
  
    const visibleNodeIdSet = new Set(graphData.nodes.map((node) => node.id));
  
    return sampleGraph.edges.filter(
      (edge) =>
        visibleNodeIdSet.has(edge.source) &&
        visibleNodeIdSet.has(edge.target) &&
        (edge.source === selectedNode.id ||
          edge.target === selectedNode.id),
    );
  }, [graphData.nodes, selectedNode]);

  const selectedRelationship = useMemo(
    () =>
      selectedRelationshipId
        ? sampleGraph.edges.find(
            (edge) => edge.id === selectedRelationshipId,
          ) ?? null
        : null,
    [selectedRelationshipId],
  );

  const shouldUseWideDetails =
  (selectedNode?.name.length ?? 0) > 24 ||
  (selectedRelationship &&
    [
      sampleGraph.nodes.find(
        (node) => node.id === selectedRelationship.source,
      )?.name ?? "",
      sampleGraph.nodes.find(
        (node) => node.id === selectedRelationship.target,
      )?.name ?? "",
    ].some((name) => name.length > 24));

    const isNodeVisibleWithFilters = (
      node: GraphNode,
      nodeTypes: Set<NodeType>,
      disciplines: Set<string>,
    ) => {
      const isTypeVisible = nodeTypes.has(node.type);
    
      const matchesDiscipline =
        node.disciplines == null ||
        node.disciplines.some((discipline) =>
          disciplines.has(discipline),
        );
    
      return isTypeVisible && matchesDiscipline;
    };

  // ===========================================================================
  // Event Handlers
  // ===========================================================================

  const handleNodeSelect = (node: GraphNode) => {
    setSelectedNode(node);
    setSelectedRelationshipId(null);
    setIsDetailsOpen(true);
  };

  const handleSelectionClear = () => {
    setSelectedNode(null);
    setSelectedRelationshipId(null);
    setIsDetailsOpen(false);
  };

  const handleRelationshipSelect = (relationshipId: string) => {
    setSelectedRelationshipId((current) =>
      current === relationshipId ? null : relationshipId,
    );
  };

  const handleRelationshipOpen = (relationshipId: string) => {
    setSelectedNode(null);
    setSelectedRelationshipId(relationshipId);
    setIsDetailsOpen(true);
  };

  const handleNodeTypeToggle = (nodeType: NodeType) => {
    const nextNodeTypes = new Set(visibleNodeTypes);
  
    if (nextNodeTypes.has(nodeType)) {
      nextNodeTypes.delete(nodeType);
    } else {
      nextNodeTypes.add(nodeType);
    }
  
    setVisibleNodeTypes(nextNodeTypes);
  
    const selectedNodeWillRemainVisible =
      !selectedNode ||
      isNodeVisibleWithFilters(
        selectedNode,
        nextNodeTypes,
        visibleDisciplines,
      );
  
    const selectedRelationshipWillRemainVisible = (() => {
      if (!selectedRelationship) {
        return true;
      }
  
      const sourceNode = fullGraphData.nodes.find(
        (node) => node.id === selectedRelationship.source,
      );
  
      const targetNode = fullGraphData.nodes.find(
        (node) => node.id === selectedRelationship.target,
      );
  
      return (
        sourceNode !== undefined &&
        targetNode !== undefined &&
        isNodeVisibleWithFilters(
          sourceNode,
          nextNodeTypes,
          visibleDisciplines,
        ) &&
        isNodeVisibleWithFilters(
          targetNode,
          nextNodeTypes,
          visibleDisciplines,
        )
      );
    })();
  
    if (
      !selectedNodeWillRemainVisible ||
      !selectedRelationshipWillRemainVisible
    ) {
      handleSelectionClear();
    }
  };

  const handleDisciplineToggle = (discipline: string) => {
    const nextDisciplines = new Set(visibleDisciplines);
  
    if (nextDisciplines.has(discipline)) {
      nextDisciplines.delete(discipline);
    } else {
      nextDisciplines.add(discipline);
    }
  
    setVisibleDisciplines(nextDisciplines);
  
    const selectedNodeWillRemainVisible =
      !selectedNode ||
      isNodeVisibleWithFilters(
        selectedNode,
        visibleNodeTypes,
        nextDisciplines,
      );
  
    const selectedRelationshipWillRemainVisible = (() => {
      if (!selectedRelationship) {
        return true;
      }
  
      const sourceNode = fullGraphData.nodes.find(
        (node) => node.id === selectedRelationship.source,
      );
  
      const targetNode = fullGraphData.nodes.find(
        (node) => node.id === selectedRelationship.target,
      );
  
      return (
        sourceNode !== undefined &&
        targetNode !== undefined &&
        isNodeVisibleWithFilters(
          sourceNode,
          visibleNodeTypes,
          nextDisciplines,
        ) &&
        isNodeVisibleWithFilters(
          targetNode,
          visibleNodeTypes,
          nextDisciplines,
        )
      );
    })();
  
    if (
      !selectedNodeWillRemainVisible ||
      !selectedRelationshipWillRemainVisible
    ) {
      handleSelectionClear();
    }
  };

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
          shouldUseWideDetails ? "details-wide" : "details-standard",
        ].join(" ")}
      >
        <Sidebar
          availableDisciplines={availableDisciplines}
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

      <Timeline />
    </div>
  );
}

export default App;