import { useEffect, useMemo, useRef, useState } from "react";
import ForceGraph2D, {
  type ForceGraphMethods,
  type LinkObject,
  type NodeObject,
} from "react-force-graph-2d";
import { NODE_TYPE_COLORS } from "../constants/graphVisuals";
import type {
  ForceGraphData,
  GraphLink,
  GraphNode,
} from "../types/graph";

interface GraphCanvasProps {
  graphData: ForceGraphData;
  selectedNode: GraphNode | null;
  selectedRelationshipId: string | null;
  onNodeSelect: (node: GraphNode) => void;
  onRelationshipOpen: (relationshipId: string) => void;
  onSelectionClear: () => void;
}

function getEndpointId(endpoint: string | GraphNode): string {
  return typeof endpoint === "string" ? endpoint : endpoint.id;
}

function GraphCanvas({
  graphData,
  selectedNode,
  selectedRelationshipId,
  onNodeSelect,
  onRelationshipOpen,
  onSelectionClear
}: GraphCanvasProps) {

  // ===========================================================================
  // Refs and State
  // ===========================================================================

const graphRef = useRef<
  | ForceGraphMethods<
      NodeObject<GraphNode>,
      LinkObject<GraphNode, GraphLink>
    >
  | undefined
>(undefined);

const containerRef = useRef<HTMLDivElement | null>(null);

const [dimensions, setDimensions] = useState({
  width: 0,
  height: 0,
});

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

  const selectedRelationshipNodeIds = useMemo(() => {
    const ids = new Set<string>();
  
    if (!selectedRelationshipId) {
      return ids;
    }
  
    const selectedLink = graphData.links.find(
      (link) => link.id === selectedRelationshipId,
    );
  
    if (!selectedLink) {
      return ids;
    }
  
    ids.add(getEndpointId(selectedLink.source));
    ids.add(getEndpointId(selectedLink.target));
  
    return ids;
  }, [graphData.links, selectedRelationshipId]);

  // ===========================================================================
  // Effects
  // ===========================================================================

  // measure container
  useEffect(() => {
    const container = containerRef.current;
  
    if (!container) {
      return;
    }
  
    const updateDimensions = () => {
      setDimensions({
        width: container.clientWidth,
        height: container.clientHeight,
      });
    };
  
    updateDimensions();
  
    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(container);
  
    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // center on selected node
  useEffect(() => {
    if (
      !selectedNode ||
      selectedNode.x === undefined ||
      selectedNode.y === undefined
    ) {
      return;
    }
  
    const animationFrame = window.requestAnimationFrame(() => {
      graphRef.current?.centerAt(selectedNode.x, selectedNode.y, 500);
      graphRef.current?.zoom(3, 500);
    });
  
    return () => {
      window.cancelAnimationFrame(animationFrame);
    };
  }, [dimensions.height, dimensions.width, selectedNode]);

  // ===========================================================================
  // Event Handlers
  // ===========================================================================

  const handleFitGraph = () => {
    graphRef.current?.zoomToFit(500, 60);
  };

  // ===========================================================================
  // Visual Accessors
  // ===========================================================================

  const getNodeColor = (node: GraphNode) => {
    if (selectedRelationshipId) {
      if (selectedRelationshipNodeIds.has(node.id)) {
        return NODE_TYPE_COLORS[node.type];
      }
  
      return "rgba(110, 110, 110, 0.18)";
    }
  
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
  
    if (
      selectedRelationshipId &&
      selectedRelationshipNodeIds.has(node.id)
    ) {
      area *= 1.35;
    } else if (node.id === selectedNode?.id) {
      area *= 1.8;
    } else if (selectedNode && connectedNodeIds.has(node.id)) {
      area *= 1.15;
    }
  
    // Make movement nodes slightly larger.
    if (node.type === "movement") {
      area *= 2.;
    }
  
    return area;
  };

  const getLinkColor = (link: GraphLink) => {
    if (selectedRelationshipId) {
      return link.id === selectedRelationshipId
        ? "rgba(255, 230, 64, 1)"
        : "rgba(110, 110, 110, 0.08)";
    }
  
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
    if (selectedRelationshipId) {
      return link.id === selectedRelationshipId ? 5 : 0.5;
    }
  
    if (!selectedNode) {
      return 1.5;
    }
  
    const sourceId = getEndpointId(link.source);
    const targetId = getEndpointId(link.target);
  
    return sourceId === selectedNode.id || targetId === selectedNode.id
      ? 3
      : 0.75;
  };

  const getLinkArrowLength = (link: GraphLink) => {
    return link.id === selectedRelationshipId ? 10 : 5;
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

        <div className="graph-toolbar-actions">
          <button
            className="fit-graph-button"
            type="button"
            onClick={handleFitGraph}
          >
            Fit graph
          </button>

          <div className="graph-stats">
            <span>{graphData.nodes.length} nodes</span>
            <span>{graphData.links.length} relationships</span>
          </div>
        </div>
      </div>

      <div className="force-graph-container" ref={containerRef}>
        {dimensions.width > 0 && dimensions.height > 0 && (
          <ForceGraph2D<GraphNode, GraphLink>
            ref={graphRef}
            width={dimensions.width}
            height={dimensions.height}
            graphData={graphData}
            nodeId="id"
            nodeLabel={(node: GraphNode) => `${node.name} · ${node.type}`}
            nodeColor={getNodeColor}
            nodeVal={getNodeSize}
            nodeRelSize={1}
            nodeCanvasObjectMode={(node: GraphNode) =>
              node.type === "movement" ? "replace" : "after"
            }
            nodeCanvasObject={(
              node: GraphNode,
              context: CanvasRenderingContext2D,
              globalScale: number,
            ) => {
              if (node.x === undefined || node.y === undefined) {
                return;
              }
            
              const nodeRadius = Math.sqrt(getNodeSize(node));
            
              // Draw movement nodes as hollow circles.
              if (node.type === "movement") {
                context.beginPath();
                context.arc(node.x, node.y, nodeRadius, 0, 2 * Math.PI);
                context.strokeStyle = getNodeColor(node);
                context.lineWidth = 2 / globalScale;
                context.stroke();
              }
            
              // Draw the yellow selection ring around the selected node.
              if (node.id === selectedNode?.id) {
                const ringGap = 3 / globalScale;
                const ringRadius = nodeRadius + ringGap;
            
                context.beginPath();
                context.arc(node.x, node.y, ringRadius, 0, 2 * Math.PI);
                context.strokeStyle = "#e96500";
                context.lineWidth = 4 / globalScale;
                context.stroke();
              }
            }}            
            linkSource="source"
            linkTarget="target"
            linkColor={getLinkColor}
            linkWidth={getLinkWidth}
            linkDirectionalArrowColor={getLinkColor}
            linkDirectionalArrowLength={getLinkArrowLength}
            linkDirectionalArrowRelPos={1}
            linkHoverPrecision={8}
            onLinkClick={(link: GraphLink) =>
              onRelationshipOpen(link.id)
            }
            backgroundColor="#181818"
            onBackgroundClick={onSelectionClear}
            onNodeClick={(node: GraphNode) => onNodeSelect(node)}
          />
        )}
      </div>
    </section>
  );
}

export default GraphCanvas;