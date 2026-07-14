import { useMemo } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { NODE_TYPE_COLORS } from "../constants/graphVisuals";
import type {
  ForceGraphData,
  GraphLink,
  GraphNode,
} from "../types/graph";

interface GraphCanvasProps {
  graphData: ForceGraphData;
  selectedNode: GraphNode | null;
  onNodeSelect: (node: GraphNode) => void;
}

function getEndpointId(endpoint: string | GraphNode): string {
  return typeof endpoint === "string" ? endpoint : endpoint.id;
}

function GraphCanvas({
  graphData,
  selectedNode,
  onNodeSelect,
}: GraphCanvasProps) {
  // ===========================================================================
  // Derived Data
  // ===========================================================================

  const connectedNodeIds = useMemo(() => {
    const ids = new Set<string>();

    if (!selectedNode) {
      return ids;
    }

    ids.add(selectedNode.id);

    graphData.links.forEach((link) => {
      const sourceId = getEndpointId(link.source);
      const targetId = getEndpointId(link.target);

      if (sourceId === selectedNode.id) {
        ids.add(targetId);
      }

      if (targetId === selectedNode.id) {
        ids.add(sourceId);
      }
    });

    return ids;
  }, [graphData.links, selectedNode]);

  // ===========================================================================
  // Visual Accessors
  // ===========================================================================

  const getNodeColor = (node: GraphNode) => {
    if (!selectedNode) {
      return NODE_TYPE_COLORS[node.type];
    }

    if (node.id === selectedNode.id) {
      return "#ffffff";
    }

    if (connectedNodeIds.has(node.id)) {
      return NODE_TYPE_COLORS[node.type];
    }

    return "rgba(110, 110, 110, 0.22)";
  };

  const getNodeSize = (node: GraphNode) => {
    const importance = node.importance ?? 5;
    const isKeyNode = importance >= 8;
  
    let area = isKeyNode ? 110 : 24;
  
    if (node.id === selectedNode?.id) {
      area *= 1.8;
    } else if (selectedNode && connectedNodeIds.has(node.id)) {
      area *= 1.15;
    }
  
    return area;
  };

  const getLinkColor = (link: GraphLink) => {
    if (!selectedNode) {
      return "rgba(220, 220, 220, 0.6)";
    }

    const sourceId = getEndpointId(link.source);
    const targetId = getEndpointId(link.target);

    const isConnected =
      sourceId === selectedNode.id || targetId === selectedNode.id;

    return isConnected
      ? "rgba(255, 255, 255, 0.9)"
      : "rgba(110, 110, 110, 0.12)";
  };

  const getLinkWidth = (link: GraphLink) => {
    if (!selectedNode) {
      return 1.5;
    }

    const sourceId = getEndpointId(link.source);
    const targetId = getEndpointId(link.target);

    return sourceId === selectedNode.id || targetId === selectedNode.id
      ? 3
      : 0.75;
  };

  // ===========================================================================
  // Render
  // ===========================================================================

  return (
    <section className="canvas">
      <div className="graph-toolbar">
        <div>
          <p className="eyebrow">Prototype dataset</p>
          <h2>Knowledge Graph</h2>
        </div>

        <div className="graph-stats">
          <span>{graphData.nodes.length} nodes</span>
          <span>{graphData.links.length} relationships</span>
        </div>
      </div>

      <div className="force-graph-container">
        <ForceGraph2D<GraphNode, GraphLink>
          graphData={graphData}
          nodeId="id"
          nodeLabel={(node: GraphNode) => `${node.name} · ${node.type}`}
          nodeColor={getNodeColor}
          nodeVal={getNodeSize}
          nodeRelSize={1}
          linkSource="source"
          linkTarget="target"
          linkColor={getLinkColor}
          linkWidth={getLinkWidth}
          linkDirectionalArrowLength={5}
          linkDirectionalArrowRelPos={1}
          backgroundColor="#181818"
          onNodeClick={(node: GraphNode) => onNodeSelect(node)}
        />
      </div>
    </section>
  );
}

export default GraphCanvas;