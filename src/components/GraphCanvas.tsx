import { useEffect, useMemo, useRef, useState } from "react";
import { forceCollide, forceManyBody } from "d3-force";
import ForceGraph2D, {
  type ForceGraphMethods,
  type LinkObject,
  type NodeObject,
} from "react-force-graph-2d";
import {
  MOVEMENT_NODE_OUTLINE_COLOR,
  THEORY_NODE_OUTLINE_COLOR,
  NODE_TYPE_COLORS,
  GRAPH_BACKGROUND_COLOR,
} from "../constants/graphVisuals";
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
  pathwayNodeIds: string[];
  pathwayLinkIds: string[];
  anchoredNodeIds: Set<string>;
  onNodeAnchored: (nodeId: string) => void;
  onUnanchorAll: () => void;
  // Defaults to "clusters" (Explore's existing behavior) when omitted.
  // Only used to seed the UNCONTROLLED internal state — ignored if
  // viewMode (below) is provided.
  defaultViewMode?: "clusters" | "connections";
  // If provided, view mode becomes fully controlled by the parent instead
  // of GraphCanvas's own internal state. Needed by Stories: its GraphCanvas
  // instance unmounts/remounts each time you leave and return to the tab,
  // so its view mode has to be lifted to a parent that doesn't unmount
  // (App.tsx) in order to actually be remembered across visits.
  viewMode?: "clusters" | "connections";
  onViewModeChange?: (mode: "clusters" | "connections") => void;
  // When true: skips the camera-centering-on-selection effect, skips the
  // orange selection ring, renders the pathway badge for the selected node
  // green and larger instead, and fits to the full graph extent once on
  // mount. Used by Stories, where clicking through steps shouldn't yank
  // the camera around — the badge itself carries the "current step"
  // emphasis instead. Defaults to false (Explore's existing behavior).
  suppressSelectionFocus?: boolean;
  // Disables node dragging (and therefore movement-node anchoring) while
  // keeping hover tooltips and zoom/pan intact. Used by Stories, which
  // doesn't want its graph to be otherwise interactive.
  disableNodeDrag?: boolean;
}

function getEndpointId(endpoint: string | GraphNode): string {
  return typeof endpoint === "string" ? endpoint : endpoint.id;
}

// ===========================================================================
// Shape path helpers (pure — build a canvas path for each node symbol)
// ===========================================================================

function tracePortraitRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
) {
  const width = radius * 1.5;
  const height = radius * 2.1;
  context.beginPath();
  context.rect(x - width / 2, y - height / 2, width, height);
}

// A simple house silhouette: flat bottom, vertical walls, peaked roof.
function traceHousePentagon(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
) {
  const halfWidth = radius * 1.05;
  const bottomY = radius * 1.1;
  const eaveY = radius * 0.1;
  const peakY = -radius * 1.3;

  context.beginPath();
  context.moveTo(x - halfWidth, y + bottomY);
  context.lineTo(x + halfWidth, y + bottomY);
  context.lineTo(x + halfWidth, y + eaveY);
  context.lineTo(x, y + peakY);
  context.lineTo(x - halfWidth, y + eaveY);
  context.closePath();
}

function traceHexagon(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
) {
  context.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    const pointX = x + radius * Math.cos(angle);
    const pointY = y + radius * Math.sin(angle);
    if (i === 0) {
      context.moveTo(pointX, pointY);
    } else {
      context.lineTo(pointX, pointY);
    }
  }
  context.closePath();
}

function traceDiamond(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
) {
  context.beginPath();
  context.moveTo(x, y - radius);
  context.lineTo(x + radius, y);
  context.lineTo(x, y + radius);
  context.lineTo(x - radius, y);
  context.closePath();
}

// ===========================================================================
// Explode-view tween (bypasses d3-force entirely — see the effect below)
// ===========================================================================

const EXPLODE_DURATION_MS = 350;
const COLLAPSE_DURATION_MS = 300;
const EXPLODE_BASE_RADIUS = 25;
const EXPLODE_RADIUS_PER_NODE = 5;
const EXPLODE_MAX_RADIUS = 120;

interface NodeTweenEntry {
  node: GraphNode;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}

// Animates a set of nodes' x/y (and fx/fy, to pin them mid-transition)
// directly via requestAnimationFrame. This never touches d3Force or
// d3ReheatSimulation, so nothing else in the graph reheats. Returns a
// cancel function so an interrupted transition can be stopped cleanly.
function animateNodePositions(
  entries: NodeTweenEntry[],
  durationMs: number,
  onComplete: () => void,
): () => void {
  const startTime = performance.now();
  let frameId = 0;
  let cancelled = false;

  const step = (now: number) => {
    if (cancelled) {
      return;
    }

    const elapsed = now - startTime;
    const t = Math.min(elapsed / durationMs, 1);
    const eased = 1 - Math.pow(1 - t, 3);

    entries.forEach(({ node, fromX, fromY, toX, toY }) => {
      const x = fromX + (toX - fromX) * eased;
      const y = fromY + (toY - fromY) * eased;
      node.x = x;
      node.y = y;
      node.fx = x;
      node.fy = y;
    });

    if (t < 1) {
      frameId = requestAnimationFrame(step);
    } else {
      onComplete();
    }
  };

  frameId = requestAnimationFrame(step);

  return () => {
    cancelled = true;
    cancelAnimationFrame(frameId);
  };
}

function GraphCanvas({
  graphData,
  selectedNode,
  selectedRelationshipId,
  onNodeSelect,
  onRelationshipOpen,
  onSelectionClear,
  pathwayNodeIds,
  pathwayLinkIds,
  anchoredNodeIds,
  onNodeAnchored,
  onUnanchorAll,
  defaultViewMode = "clusters",
  viewMode,
  onViewModeChange,
  suppressSelectionFocus = false,
  disableNodeDrag = false,
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

const hasDimensions = dimensions.width > 0 && dimensions.height > 0;

// Whether an explode/collapse tween is currently animating. Only true for
// the ~300ms transition itself — toggles autoPauseRedraw so the canvas
// repaints every frame during the tween without needing to touch the
// physics simulation at all.
const [isExploding, setIsExploding] = useState(false);

// Snapshots each primary node's pre-explosion position, keyed by node id,
// so deselecting can restore them exactly rather than approximately.
const explodeSnapshotRef = useRef<
  Map<string, { x: number; y: number; fx?: number; fy?: number }>
>(new Map());

// Tracks the previous anchoredNodeIds value so the release effect can
// diff and detect exactly which node(s) were just removed (released).
const previousAnchoredNodeIdsRef = useRef<Set<string>>(new Set());

// Controls how strongly nodes push apart in the collision force — see the
// collision-force effect below. Optionally-controlled: when the parent
// provides viewMode (Stories, lifted to App.tsx so it survives this
// component unmounting/remounting), that value wins; otherwise falls back
// to internal state seeded from defaultViewMode (Explore's usage, which
// never unmounts so internal state already persists correctly on its own).
const [internalViewMode, setInternalViewMode] = useState<
  "clusters" | "connections"
>(defaultViewMode);

const graphViewMode = viewMode ?? internalViewMode;

const handleViewModeChange = (mode: "clusters" | "connections") => {
  if (onViewModeChange) {
    onViewModeChange(mode);
  } else {
    setInternalViewMode(mode);
  }
};

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

  const isPathwayActive = pathwayNodeIds.length > 0;

  const pathwayNodeIndex = useMemo(() => {
    const map = new Map<string, number>();
    pathwayNodeIds.forEach((id, index) => map.set(id, index));
    return map;
  }, [pathwayNodeIds]);

  const pathwayLinkIdSet = useMemo(
    () => new Set(pathwayLinkIds),
    [pathwayLinkIds],
  );

  // ===========================================================================
  // Explode View
  // ===========================================================================

  // Scoped narrowly to plain node selection — skipped for relationship
  // selection or an active pathway, since "primary nodes around a center"
  // doesn't have a clear meaning in those modes.
  useEffect(() => {
    if (
      !selectedNode ||
      selectedNode.x === undefined ||
      selectedNode.y === undefined ||
      selectedRelationshipId ||
      isPathwayActive
    ) {
      return;
    }

    const centerX = selectedNode.x;
    const centerY = selectedNode.y;
    const snapshotMap = explodeSnapshotRef.current;

    const primaryNodes = graphData.nodes.filter(
      (node) => node.id !== selectedNode.id && connectedNodeIds.has(node.id),
    );

    if (primaryNodes.length === 0) {
      return;
    }

    primaryNodes.forEach((node) => {
      if (!snapshotMap.has(node.id)) {
        snapshotMap.set(node.id, {
          x: node.x ?? centerX,
          y: node.y ?? centerY,
          fx: node.fx,
          fy: node.fy,
        });
      }
    });

    const radius = Math.min(
      EXPLODE_MAX_RADIUS,
      EXPLODE_BASE_RADIUS + primaryNodes.length * EXPLODE_RADIUS_PER_NODE,
    );

    const explodeEntries: NodeTweenEntry[] = primaryNodes.map((node, index) => {
      const angle = (2 * Math.PI * index) / primaryNodes.length;
      return {
        node,
        fromX: node.x ?? centerX,
        fromY: node.y ?? centerY,
        toX: centerX + radius * Math.cos(angle),
        toY: centerY + radius * Math.sin(angle),
      };
    });

    let cancelExplode: (() => void) | null = null;

    const startExplodeFrame = window.requestAnimationFrame(() => {
      setIsExploding(true);
      cancelExplode = animateNodePositions(
        explodeEntries,
        EXPLODE_DURATION_MS,
        () => setIsExploding(false),
      );
    });

    return () => {
      window.cancelAnimationFrame(startExplodeFrame);
      cancelExplode?.();

      const collapseEntries: NodeTweenEntry[] = primaryNodes
        .map((node) => {
          const snapshot = snapshotMap.get(node.id);
          if (!snapshot) {
            return null;
          }

          return {
            node,
            fromX: node.x ?? snapshot.x,
            fromY: node.y ?? snapshot.y,
            toX: snapshot.x,
            toY: snapshot.y,
          };
        })
        .filter((entry): entry is NodeTweenEntry => entry !== null);

      window.requestAnimationFrame(() => {
        setIsExploding(true);

        animateNodePositions(collapseEntries, COLLAPSE_DURATION_MS, () => {
          collapseEntries.forEach(({ node }) => {
            const snapshot = snapshotMap.get(node.id);
            node.fx = snapshot?.fx;
            node.fy = snapshot?.fy;
            snapshotMap.delete(node.id);
          });
          setIsExploding(false);
        });
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNode]);

  // ===========================================================================
  // Node Anchor Release
  // ===========================================================================

  // anchoredNodeIds is the shared source of truth (owned by
  // useKnowledgeGraph) for which movement nodes are anchored. DetailsPanel
  // only ever removes an id from this set to request a release — this
  // effect is what actually performs the physics-level release (clearing
  // fx/fy) and a deliberate reheat, since GraphCanvas is the component
  // that owns the simulation. Diffs against the previous set so this only
  // fires for ids that were just removed, not on every unrelated update.
  useEffect(() => {
    const previouslyAnchoredIds = previousAnchoredNodeIdsRef.current;
    let didReleaseAny = false;

    previouslyAnchoredIds.forEach((nodeId) => {
      if (anchoredNodeIds.has(nodeId)) {
        return;
      }

      const node = graphData.nodes.find((n) => n.id === nodeId);

      if (node) {
        node.fx = undefined;
        node.fy = undefined;
        didReleaseAny = true;
      }
    });

    previousAnchoredNodeIdsRef.current = anchoredNodeIds;

    if (didReleaseAny) {
      graphRef.current?.d3ReheatSimulation();
    }
  }, [anchoredNodeIds, graphData.nodes]);

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
      suppressSelectionFocus ||
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
  }, [dimensions.height, dimensions.width, selectedNode, suppressSelectionFocus]);

  // Fit to the full graph extent shortly after mount — not at literal
  // tick-zero (a rAF fires essentially immediately, before the simulation
  // has run even one tick, when most/all nodes can still be sitting at
  // nearly identical default positions; zoomToFit against that
  // near-zero-area point cloud forces an extreme zoom scale, which is
  // what broke pan/zoom, node rendering, and the badges entirely) and not
  // waiting for full settle either (onEngineStop's alpha-decay-based stop
  // event can take 10+ seconds to fire, reading as an abrupt, unexplained
  // jump once it finally does). A short fixed delay is enough ticks for
  // positions to become sane without either failure mode. Only relevant
  // when camera-follow is suppressed (Stories); the camera never moves
  // again after this fit, so the nodes settle within a fixed frame.
  const hasFitOnMountRef = useRef(false);
  const FIT_ON_MOUNT_DELAY_MS = 300;

  useEffect(() => {
    if (
      !suppressSelectionFocus ||
      !hasDimensions ||
      hasFitOnMountRef.current
    ) {
      return;
    }

    hasFitOnMountRef.current = true;

    const timeoutId = window.setTimeout(() => {
      graphRef.current?.zoomToFit(0, 60);
    }, FIT_ON_MOUNT_DELAY_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [suppressSelectionFocus, hasDimensions]);

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
    if (isPathwayActive) {
      return pathwayNodeIndex.has(node.id)
        ? "#ffb703"
        : "rgba(110, 110, 110, 0.15)";
    }

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

  // Whether a node should currently read as de-emphasized, under whichever
  // highlight system (pathway / selected relationship / selected node) is
  // active. Shared by the hollow-shape fill/outline helpers below so
  // movement and theory nodes dim in sync with everything else.
  const isNodeDimmed = (node: GraphNode) => {
    if (isPathwayActive) {
      return !pathwayNodeIndex.has(node.id);
    }

    if (selectedRelationshipId) {
      return !selectedRelationshipNodeIds.has(node.id);
    }

    if (selectedNode) {
      return node.id !== selectedNode.id && !connectedNodeIds.has(node.id);
    }

    return false;
  };

  // Fill for "hollow" shapes (movement's circle, theory's hexagon): reads
  // as background/transparent by default, white when it's the selected
  // node itself, the pathway highlight color when active, or dimmed gray
  // otherwise — mirrors getNodeColor's branching but with a background
  // default instead of the type's solid color.
  const getHollowShapeFill = (node: GraphNode) => {
    if (isNodeDimmed(node)) {
      return "rgba(110, 110, 110, 0.2)";
    }

    if (isPathwayActive) {
      return "#ffb703";
    }

    if (node.id === selectedNode?.id) {
      return "#ffffff";
    }

    if (node.type === "movement" && anchoredNodeIds.has(node.id)) {
      return MOVEMENT_NODE_OUTLINE_COLOR;
    }

    return GRAPH_BACKGROUND_COLOR;
  };

  const getHollowShapeStroke = (node: GraphNode, activeColor: string) => {
    return isNodeDimmed(node) ? "rgba(110, 110, 110, 0.3)" : activeColor;
  };

  const getNodeSize = (node: GraphNode) => {
    const importance = node.importance ?? 5;
    const isKeyNode = importance >= 8;
  
    let area = isKeyNode ? 110 : 24;

    if (isPathwayActive) {
      area = pathwayNodeIndex.has(node.id) ? area * 1.6 : area * 0.7;
    } else if (
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
    if (isPathwayActive) {
      return pathwayLinkIdSet.has(link.id)
        ? "rgba(255, 183, 3, 1)"
        : "rgba(110, 110, 110, 0.06)";
    }

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
    if (isPathwayActive) {
      return pathwayLinkIdSet.has(link.id) ? 4 : 0.5;
    }

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
    if (isPathwayActive) {
      return pathwayLinkIdSet.has(link.id) ? 10 : 5;
    }

    return link.id === selectedRelationshipId ? 10 : 5;
  };

  // Curve parallel edges (multiple relationships between the same node pair)
  // apart from one another so each is individually visible and clickable —
  // by default ForceGraph2D renders them as identical overlapping straight lines.
  const linkCurvature = useMemo(() => {
    const curvatureByLinkId = new Map<string, number>();
    const groupsByPairKey = new Map<
      string,
      { linkId: string; isReversed: boolean }[]
    >();

    graphData.links.forEach((link) => {
      const sourceId = getEndpointId(link.source);
      const targetId = getEndpointId(link.target);
      const [canonicalFirst, canonicalSecond] = [sourceId, targetId].sort();
      const pairKey = `${canonicalFirst}|${canonicalSecond}`;

      // ForceGraph2D's curvature sign is relative to each link's own
      // source->target order. Two edges between the same pair stored in
      // opposite directions (e.g. Newton->Descartes and Descartes->Newton)
      // can end up curving to the SAME visual side if we only offset by
      // iteration order — normalize against a canonical direction instead.
      const isReversed = sourceId !== canonicalFirst;

      const group = groupsByPairKey.get(pairKey) ?? [];
      group.push({ linkId: link.id, isReversed });
      groupsByPairKey.set(pairKey, group);
    });

    const spacing = 0.4;

    groupsByPairKey.forEach((entries) => {
      const count = entries.length;

      entries.forEach(({ linkId, isReversed }, index) => {
        const offsetIndex = index - (count - 1) / 2;
        const curvature = offsetIndex * spacing;

        curvatureByLinkId.set(linkId, isReversed ? -curvature : curvature);
      });
    });

    return curvatureByLinkId;
  }, [graphData.links]);

  const getLinkCurvature = (link: GraphLink) => {
    return linkCurvature.get(link.id) ?? 0;
  };
  
  // configure collision + link-distance + repulsion forces
  useEffect(() => {
    const fg = graphRef.current;
  
    if (!fg) {
      return;
    }

    const collisionPadding = graphViewMode === "connections" ? 60 : 5;

    const getBaseRadius = (node: GraphNode) => {
      const importance = node.importance ?? 5;
      const baseArea = importance >= 8 ? 110 : 24;
      const area = node.type === "movement" ? baseArea * 2 : baseArea;
      return Math.sqrt(area) + collisionPadding;
    };
  
    fg.d3Force("collide", forceCollide(getBaseRadius).iterations(2));
    fg.d3Force("link")?.distance(() => 8);
    // Bounded repulsion — caps how far apart nodes push each other so the
    // graph stays more contained overall instead of sprawling, without
    // changing its topology. Adopted from what was Test Mode 3.
    fg.d3Force("charge", forceManyBody().strength(-80).distanceMax(260));

    fg.d3ReheatSimulation();
  }, [graphData, hasDimensions, graphViewMode]);

  // ===========================================================================
  // Render
  // ===========================================================================

  return (
    <section className="canvas">
      <div className="graph-toolbar">
        <div className="graph-toolbar-title">
          <h2>Knowledge Graph</h2>

          <div className="graph-stats">
            <span>{graphData.nodes.length} nodes</span>
            <span>{graphData.links.length} relationships</span>
          </div>
        </div>

        <div className="graph-toolbar-actions">
          <button
            className="fit-graph-button"
            type="button"
            onClick={handleFitGraph}
          >
            Fit graph
          </button>

          {(() => {
            const visibleAnchoredCount = graphData.nodes.filter((node) =>
              anchoredNodeIds.has(node.id),
            ).length;

            if (visibleAnchoredCount === 0) {
              return <span className="graph-stats-inline">0 anchors</span>;
            }

            return (
              <button
                className="clear-all-anchors-button"
                type="button"
                onClick={onUnanchorAll}
              >
                <span className="clear-all-anchors-button-default">
                  {visibleAnchoredCount} anchors
                </span>
                <span className="clear-all-anchors-button-hover">
                  Clear all
                </span>
              </button>
            );
          })()}

          <button
            className={
              graphViewMode === "connections"
                ? "fit-graph-button fit-graph-button--active"
                : "fit-graph-button"
            }
            type="button"
            onClick={() => handleViewModeChange("connections")}
          >
            Connections
          </button>

          <button
            className={
              graphViewMode === "clusters"
                ? "fit-graph-button fit-graph-button--active"
                : "fit-graph-button"
            }
            type="button"
            onClick={() => handleViewModeChange("clusters")}
          >
            Clusters
          </button>
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
              node.type === "movement" ||
              node.type === "publication" ||
              node.type === "institution" ||
              node.type === "theory" ||
              node.type === "technology"
                ? "replace"
                : "after"
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
            
              if (node.type === "movement") {
                context.beginPath();
                context.arc(node.x, node.y, nodeRadius, 0, 2 * Math.PI);
                context.fillStyle = getHollowShapeFill(node);
                context.fill();
                context.strokeStyle = getHollowShapeStroke(
                  node,
                  MOVEMENT_NODE_OUTLINE_COLOR,
                );
                context.lineWidth = 2 / globalScale;
                context.stroke();
              } else if (node.type === "publication") {
                tracePortraitRect(context, node.x, node.y, nodeRadius);
                context.fillStyle = getNodeColor(node);
                context.fill();
                context.strokeStyle = GRAPH_BACKGROUND_COLOR;
                context.lineWidth = 1 / globalScale;
                context.stroke();
              } else if (node.type === "institution") {
                traceHousePentagon(context, node.x, node.y, nodeRadius);
                context.fillStyle = getNodeColor(node);
                context.fill();
                context.strokeStyle = GRAPH_BACKGROUND_COLOR;
                context.lineWidth = 1 / globalScale;
                context.stroke();
              } else if (node.type === "theory") {
                traceHexagon(context, node.x, node.y, nodeRadius);
                context.fillStyle = getHollowShapeFill(node);
                context.fill();
                context.strokeStyle = getHollowShapeStroke(
                  node,
                  THEORY_NODE_OUTLINE_COLOR,
                );
                context.lineWidth = 2 / globalScale;
                context.stroke();
              } else if (node.type === "technology") {
                traceDiamond(context, node.x, node.y, nodeRadius);
                context.fillStyle = getNodeColor(node);
                context.fill();
                context.strokeStyle = GRAPH_BACKGROUND_COLOR;
                context.lineWidth = 1 / globalScale;
                context.stroke();
              }

              // Draw the selection ring around the selected node (skipped
              // in story mode — the pathway badge below carries that
              // emphasis instead).
              if (!suppressSelectionFocus && node.id === selectedNode?.id) {
                const ringGap = 4 / globalScale;
                const ringRadius = nodeRadius + ringGap;
            
                context.beginPath();
                context.arc(node.x, node.y, ringRadius, 0, 2 * Math.PI);
                context.strokeStyle = "#e96500";
                context.lineWidth = 4 / globalScale;
                context.stroke();
              }

              // Draw a step-number badge on nodes that are part of the
              // active traced pathway. In story mode, the badge for the
              // currently selected/focused step renders green and larger
              // instead of drawing a separate selection ring.
              if (pathwayNodeIndex.has(node.id)) {
                const stepNumber = (pathwayNodeIndex.get(node.id) as number) + 1;
                const isCurrentStoryStep =
                  suppressSelectionFocus && node.id === selectedNode?.id;
                const badgeRadius = (isCurrentStoryStep ? 11 : 8) / globalScale;
                const badgeX = node.x + nodeRadius * 0.7;
                const badgeY = node.y - nodeRadius * 0.7;

                context.beginPath();
                context.arc(badgeX, badgeY, badgeRadius, 0, 2 * Math.PI);
                context.fillStyle = isCurrentStoryStep ? "#9FE2BF" : "#ffb703";
                context.fill();
                context.strokeStyle = "#181818";
                context.lineWidth = 1.5 / globalScale;
                context.stroke();

                context.fillStyle = "#181818";
                context.font = `${(isCurrentStoryStep ? 10 : 9) / globalScale}px sans-serif`;
                context.textAlign = "center";
                context.textBaseline = "middle";
                context.fillText(String(stepNumber), badgeX, badgeY);
              }
            }}            
            linkSource="source"
            linkTarget="target"
            linkCurvature={getLinkCurvature}
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
            enableNodeDrag={!disableNodeDrag}
            autoPauseRedraw={!isExploding}
            onBackgroundClick={onSelectionClear}
            onNodeClick={(node: GraphNode) => onNodeSelect(node)}
            onNodeDragEnd={(
              node: GraphNode,
              translate: { x: number; y: number },
            ) => {
              if (node.type !== "movement") {
                return;
              }

              // Even a "click" on a node almost always registers a tiny bit
              // of pointer movement, which still fires this handler. Only
              // treat it as a genuine drag — and re-anchor — above the same
              // 5px tolerance the library itself uses to distinguish a
              // click from a drag. Below that, do nothing: this was
              // click-adjacent jitter, not an intentional move.
              const DRAG_TOLERANCE_PX = 5;
              const moveDistance = Math.hypot(translate.x, translate.y);

              if (moveDistance <= DRAG_TOLERANCE_PX) {
                return;
              }

              // The library releases fx/fy back to unpinned on drag end for
              // any node that wasn't already pinned before the drag
              // started. For movement nodes specifically, override that
              // and anchor them at the dropped position instead —
              // everything else keeps the default float-free-after-drag
              // behavior.
              node.fx = node.x;
              node.fy = node.y;
              onNodeAnchored(node.id);
            }}
          />
        )}
      </div>
    </section>
  );
}

export default GraphCanvas;
