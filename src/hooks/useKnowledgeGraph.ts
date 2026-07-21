import { useMemo, useState } from "react";
import { sampleGraph } from "../data/sampleGraph";
import type {
  ForceGraphData,
  GraphNode,
  KnowledgeEdge,
  NodeType,
} from "../types/graph";
import { FILTERABLE_NODE_TYPES } from "../constants/graphVisuals";
import { findDirectedPath } from "../utils/pathfinding";

interface UseKnowledgeGraphOptions {
  onSelectionCleared: () => void;
  onSelectionOpened: () => void;
}

export interface ActivePathway {
  sourceId: string;
  targetId: string;
  nodeIds: string[];
  linkIds: string[];
}

function getEndpointId(endpoint: string | GraphNode): string {
  return typeof endpoint === "string" ? endpoint : endpoint.id;
}

function getNodeYear(node: GraphNode): number | undefined {
  return node.startYear ?? node.endYear;
}

export function useKnowledgeGraph({
  onSelectionCleared,
  onSelectionOpened,
}: UseKnowledgeGraphOptions) {

  // ===========================================================================
  // Base Graph Data
  // ===========================================================================

  const fullGraphData = useMemo<ForceGraphData>(
    () => ({
      nodes: sampleGraph.nodes.map((node) => ({ ...node })),
      links: sampleGraph.edges.map((edge) => ({ ...edge })),
    }),
    [],
  );

  // ===========================================================================
  // Available Filters
  // ===========================================================================

  const availableDisciplines = useMemo(
    () =>
      Array.from(
        new Set(
          fullGraphData.nodes.flatMap(
            (node) => node.disciplines ?? [],
          ),
        ),
      ).sort(),
    [fullGraphData.nodes],
  );

  const yearBounds = useMemo<[number, number]>(() => {
    const years = fullGraphData.nodes.flatMap((node) => {
      const values: number[] = [];
      if (node.startYear !== undefined) values.push(node.startYear);
      if (node.endYear !== undefined) values.push(node.endYear);
      return values;
    });

    let min = years.length === 0 ? 0 : Math.min(...years);
    let max = years.length === 0 ? 1 : Math.max(...years);

    if (min === max) {
      min -= 1;
      max += 1;
    }

    return [min, max];
  }, [fullGraphData.nodes]);

  // ===========================================================================
  // State
  // ===========================================================================

  const [selectedNode, setSelectedNode] =
    useState<GraphNode | null>(null);

  const [selectedRelationshipId, setSelectedRelationshipId] =
    useState<string | null>(null);

  const [visibleDisciplines, setVisibleDisciplines] =
    useState<Set<string>>(
      () => new Set(availableDisciplines),
    );

  const [visibleNodeTypes, setVisibleNodeTypes] =
    useState<Set<NodeType>>(
      () => new Set(FILTERABLE_NODE_TYPES),
    );

  const [yearRange, setYearRange] =
    useState<[number, number]>(yearBounds);

  // Pathway tracing: pathwaySearchSourceId is set while the details panel
  // is prompting for a target node to trace to; activePathway holds the
  // computed result once a target has been chosen.
  const [pathwaySearchSourceId, setPathwaySearchSourceId] =
    useState<string | null>(null);

  const [activePathway, setActivePathway] =
    useState<ActivePathway | null>(null);

  const [pathwayNotFound, setPathwayNotFound] = useState(false);
  const [pathwayNotFoundTargetName, setPathwayNotFoundTargetName] =
    useState<string | null>(null);

  // Tracks which movement nodes are currently anchored (dragged and pinned
  // in place). This is the single source of truth for both GraphCanvas
  // (which performs the actual fx/fy mutation and reheat) and DetailsPanel
  // (which shows/hides the release button) — plain object mutation alone
  // isn't visible to React, so this Set is what makes anchoring state
  // properly reactive across both components.
  const [anchoredNodeIds, setAnchoredNodeIds] = useState<Set<string>>(
    new Set(),
  );

  // ===========================================================================
  // Filtered Graph
  // ===========================================================================

  // Deliberately excludes yearRange — this is the type/discipline-filtered
  // node set as it would look with every year visible. TimelineCanvas's
  // playback feature needs this specifically: since playback itself
  // animates yearRange, using the (year-filtered) graphData to drive that
  // same animation creates a feedback loop where the population keeps
  // growing mid-animation. Everything else should keep using graphData/
  // visibleNodeIds below, which correctly include the year filter.
  const nodesIgnoringYearFilter = useMemo(() => {
    return fullGraphData.nodes.filter((node) => {
      const isTypeVisible = visibleNodeTypes.has(node.type);

      const matchesVisibleDiscipline =
        node.disciplines == null ||
        node.disciplines.some((discipline) =>
          visibleDisciplines.has(discipline),
        );

      return isTypeVisible && matchesVisibleDiscipline;
    });
  }, [fullGraphData.nodes, visibleNodeTypes, visibleDisciplines]);

  const visibleNodeIds = useMemo(() => {
    return fullGraphData.nodes
      .filter((node) => {
        const isTypeVisible = visibleNodeTypes.has(node.type);

        const matchesVisibleDiscipline =
          node.disciplines == null ||
          node.disciplines.some((discipline) =>
            visibleDisciplines.has(discipline),
          );

        const year = getNodeYear(node);
        const matchesYearRange =
          year === undefined ||
          (year >= yearRange[0] && year <= yearRange[1]);

        return isTypeVisible && matchesVisibleDiscipline && matchesYearRange;
      })
      .map((node) => node.id)
      .sort();
  }, [
    fullGraphData.nodes,
    visibleDisciplines,
    visibleNodeTypes,
    yearRange,
  ]);

  const visibleNodeKey = visibleNodeIds.join("|");

  const graphData = useMemo<ForceGraphData>(() => {
    const visibleNodeIdSet = new Set(
      visibleNodeKey ? visibleNodeKey.split("|") : [],
    );

    const nodes = fullGraphData.nodes.filter((node) =>
      visibleNodeIdSet.has(node.id),
    );

    const links = fullGraphData.links.filter((link) => {
      const sourceId = getEndpointId(link.source);
      const targetId = getEndpointId(link.target);

      return (
        visibleNodeIdSet.has(sourceId) &&
        visibleNodeIdSet.has(targetId)
      );
    });

    return {
      nodes,
      links,
    };
  }, [fullGraphData, visibleNodeKey]);

  // ===========================================================================
  // Selected Graph Entities
  // ===========================================================================

  const selectedRelationships = useMemo<KnowledgeEdge[]>(() => {
    if (!selectedNode) {
      return [];
    }

    const visibleNodeIdSet = new Set(
      graphData.nodes.map((node) => node.id),
    );

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

  const pathwaySteps = useMemo<KnowledgeEdge[]>(() => {
    if (!activePathway) {
      return [];
    }

    const linkIdSet = new Set(activePathway.linkIds);

    // Preserve path order rather than dataset order.
    return activePathway.linkIds
      .map((linkId) => sampleGraph.edges.find((edge) => edge.id === linkId))
      .filter((edge): edge is KnowledgeEdge => edge !== undefined && linkIdSet.has(edge.id));
  }, [activePathway]);

  // ===========================================================================
  // Visibility Helpers
  // ===========================================================================

  const isNodeVisibleWithFilters = (
    node: GraphNode,
    nodeTypes: Set<NodeType>,
    disciplines: Set<string>,
    range: [number, number],
  ) => {
    const isTypeVisible = nodeTypes.has(node.type);

    const matchesDiscipline =
      node.disciplines == null ||
      node.disciplines.some((discipline) =>
        disciplines.has(discipline),
      );

    const year = getNodeYear(node);
    const matchesYearRange =
      year === undefined || (year >= range[0] && year <= range[1]);

    return isTypeVisible && matchesDiscipline && matchesYearRange;
  };

  const isRelationshipVisibleWithFilters = (
    relationship: KnowledgeEdge,
    nodeTypes: Set<NodeType>,
    disciplines: Set<string>,
    range: [number, number],
  ) => {
    const sourceNode = fullGraphData.nodes.find(
      (node) => node.id === relationship.source,
    );

    const targetNode = fullGraphData.nodes.find(
      (node) => node.id === relationship.target,
    );

    return (
      sourceNode !== undefined &&
      targetNode !== undefined &&
      isNodeVisibleWithFilters(sourceNode, nodeTypes, disciplines, range) &&
      isNodeVisibleWithFilters(targetNode, nodeTypes, disciplines, range)
    );
  };

  // ===========================================================================
  // Selection Handlers
  // ===========================================================================

  const handleNodeSelect = (node: GraphNode) => {
    setSelectedNode(node);
    setSelectedRelationshipId(null);
    setPathwaySearchSourceId(null);
    setActivePathway(null);
    setPathwayNotFound(false);
    setPathwayNotFoundTargetName(null);
    onSelectionOpened();
  };

  const handleRelationshipOpen = (relationshipId: string) => {
    setSelectedNode(null);
    setSelectedRelationshipId(relationshipId);
    setPathwaySearchSourceId(null);
    setActivePathway(null);
    setPathwayNotFound(false);
    setPathwayNotFoundTargetName(null);
    onSelectionOpened();
  };

  const handleRelationshipSelect = (relationshipId: string) => {
    setSelectedRelationshipId((current) =>
      current === relationshipId ? null : relationshipId,
    );
  };

  const handleSelectionClear = () => {
    setSelectedNode(null);
    setSelectedRelationshipId(null);
    setPathwaySearchSourceId(null);
    setActivePathway(null);
    setPathwayNotFound(false);
    setPathwayNotFoundTargetName(null);
    onSelectionCleared();
  };

  // ===========================================================================
  // Pathway Handlers
  // ===========================================================================

  // Called from the details panel's "Find path to..." button on the
  // currently selected node — puts the panel into target-search mode.
  const handlePathwaySearchStart = () => {
    if (!selectedNode) {
      return;
    }

    setPathwaySearchSourceId(selectedNode.id);
    setPathwayNotFound(false);
    setPathwayNotFoundTargetName(null);
  };

  const handlePathwaySearchCancel = () => {
    setPathwaySearchSourceId(null);
  };

  // Called once a target node has been chosen from the search UI.
  const handlePathwayTargetSelect = (targetNode: GraphNode) => {
    if (!pathwaySearchSourceId) {
      return;
    }

    const result = findDirectedPath(
      graphData,
      pathwaySearchSourceId,
      targetNode.id,
    );

    setPathwaySearchSourceId(null);

    if (!result) {
      setActivePathway(null);
      setPathwayNotFound(true);
      setPathwayNotFoundTargetName(targetNode.name);
      return;
    }

    setSelectedNode(null);
    setSelectedRelationshipId(null);
    setPathwayNotFound(false);
    setPathwayNotFoundTargetName(null);
    setActivePathway({
      sourceId: pathwaySearchSourceId,
      targetId: targetNode.id,
      nodeIds: result.nodeIds,
      linkIds: result.linkIds,
    });
    onSelectionOpened();
  };

  const handlePathwayClear = () => {
    setActivePathway(null);
    setPathwayNotFound(false);
    setPathwayNotFoundTargetName(null);
    onSelectionCleared();
  };

  // ===========================================================================
  // Node Anchoring
  // ===========================================================================

  // Called by GraphCanvas once it has actually pinned a movement node's
  // fx/fy after a genuine drag.
  const handleNodeAnchored = (nodeId: string) => {
    setAnchoredNodeIds((current) => {
      if (current.has(nodeId)) {
        return current;
      }

      const next = new Set(current);
      next.add(nodeId);
      return next;
    });
  };

  // Called by DetailsPanel's "Release anchor" button. This only updates
  // the tracked set — GraphCanvas is what actually clears fx/fy and
  // reheats the simulation, reacting to the node disappearing from this
  // set, since it's the component that owns the physics simulation.
  const handleNodeUnanchor = (nodeId: string) => {
    setAnchoredNodeIds((current) => {
      if (!current.has(nodeId)) {
        return current;
      }

      const next = new Set(current);
      next.delete(nodeId);
      return next;
    });
  };

  // Releasing everything at once is just "the set becomes empty" —
  // GraphCanvas's release effect already diffs against the previous set
  // and releases every id that disappeared, so this needs no separate
  // handling there.
  const handleUnanchorAll = () => {
    setAnchoredNodeIds((current) => (current.size === 0 ? current : new Set()));
  };

  // ===========================================================================
  // Filter Handlers
  // ===========================================================================

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
      isNodeVisibleWithFilters(selectedNode, nextNodeTypes, visibleDisciplines, yearRange);

    const selectedRelationshipWillRemainVisible =
      !selectedRelationship ||
      isRelationshipVisibleWithFilters(selectedRelationship, nextNodeTypes, visibleDisciplines, yearRange);

    if (!selectedNodeWillRemainVisible || !selectedRelationshipWillRemainVisible) {
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
      isNodeVisibleWithFilters(selectedNode, visibleNodeTypes, nextDisciplines, yearRange);

    const selectedRelationshipWillRemainVisible =
      !selectedRelationship ||
      isRelationshipVisibleWithFilters(selectedRelationship, visibleNodeTypes, nextDisciplines, yearRange);

    if (!selectedNodeWillRemainVisible || !selectedRelationshipWillRemainVisible) {
      handleSelectionClear();
    }
  };

  const handleNodeTypeSelectAll = (selected: boolean) => {
    const nextNodeTypes = selected
      ? new Set<NodeType>(FILTERABLE_NODE_TYPES)
      : new Set<NodeType>();

    setVisibleNodeTypes(nextNodeTypes);

    const selectedNodeWillRemainVisible =
      !selectedNode ||
      isNodeVisibleWithFilters(selectedNode, nextNodeTypes, visibleDisciplines, yearRange);

    const selectedRelationshipWillRemainVisible =
      !selectedRelationship ||
      isRelationshipVisibleWithFilters(selectedRelationship, nextNodeTypes, visibleDisciplines, yearRange);

    if (!selectedNodeWillRemainVisible || !selectedRelationshipWillRemainVisible) {
      handleSelectionClear();
    }
  };

  const handleDisciplineSelectAll = (selected: boolean) => {
    const nextDisciplines = selected
      ? new Set<string>(availableDisciplines)
      : new Set<string>();

    setVisibleDisciplines(nextDisciplines);

    const selectedNodeWillRemainVisible =
      !selectedNode ||
      isNodeVisibleWithFilters(selectedNode, visibleNodeTypes, nextDisciplines, yearRange);

    const selectedRelationshipWillRemainVisible =
      !selectedRelationship ||
      isRelationshipVisibleWithFilters(selectedRelationship, visibleNodeTypes, nextDisciplines, yearRange);

    if (!selectedNodeWillRemainVisible || !selectedRelationshipWillRemainVisible) {
      handleSelectionClear();
    }
  };

  const handleYearRangeChange = (nextRange: [number, number]) => {
    setYearRange(nextRange);

    const selectedNodeWillRemainVisible =
      !selectedNode ||
      isNodeVisibleWithFilters(selectedNode, visibleNodeTypes, visibleDisciplines, nextRange);

    const selectedRelationshipWillRemainVisible =
      !selectedRelationship ||
      isRelationshipVisibleWithFilters(selectedRelationship, visibleNodeTypes, visibleDisciplines, nextRange);

    if (!selectedNodeWillRemainVisible || !selectedRelationshipWillRemainVisible) {
      handleSelectionClear();
    }
  };

  // ===========================================================================
  // Public API
  // ===========================================================================

  return {
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
  };
}
