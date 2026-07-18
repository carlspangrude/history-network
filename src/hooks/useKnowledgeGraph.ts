import { useMemo, useState } from "react";
import { sampleGraph } from "../data/sampleGraph";
import type {
  ForceGraphData,
  GraphNode,
  KnowledgeEdge,
  NodeType,
} from "../types/graph";
import { FILTERABLE_NODE_TYPES } from "../constants/graphVisuals";

interface UseKnowledgeGraphOptions {
  onSelectionCleared: () => void;
  onSelectionOpened: () => void;
}

function getEndpointId(endpoint: string | GraphNode): string {
  return typeof endpoint === "string" ? endpoint : endpoint.id;
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

  // ===========================================================================
  // Filtered Graph
  // ===========================================================================

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
  }, [
    fullGraphData.nodes,
    visibleDisciplines,
    visibleNodeTypes,
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

  // ===========================================================================
  // Visibility Helpers
  // ===========================================================================

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

  const isRelationshipVisibleWithFilters = (
    relationship: KnowledgeEdge,
    nodeTypes: Set<NodeType>,
    disciplines: Set<string>,
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
      isNodeVisibleWithFilters(
        sourceNode,
        nodeTypes,
        disciplines,
      ) &&
      isNodeVisibleWithFilters(
        targetNode,
        nodeTypes,
        disciplines,
      )
    );
  };

  // ===========================================================================
  // Selection Handlers
  // ===========================================================================

  const handleNodeSelect = (node: GraphNode) => {
    setSelectedNode(node);
    setSelectedRelationshipId(null);
    onSelectionOpened();
  };

  const handleRelationshipOpen = (relationshipId: string) => {
    setSelectedNode(null);
    setSelectedRelationshipId(relationshipId);
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
    onSelectionCleared();
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
      isNodeVisibleWithFilters(
        selectedNode,
        nextNodeTypes,
        visibleDisciplines,
      );

    const selectedRelationshipWillRemainVisible =
      !selectedRelationship ||
      isRelationshipVisibleWithFilters(
        selectedRelationship,
        nextNodeTypes,
        visibleDisciplines,
      );

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

    const selectedRelationshipWillRemainVisible =
      !selectedRelationship ||
      isRelationshipVisibleWithFilters(
        selectedRelationship,
        visibleNodeTypes,
        nextDisciplines,
      );

    if (
      !selectedNodeWillRemainVisible ||
      !selectedRelationshipWillRemainVisible
    ) {
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
      isNodeVisibleWithFilters(
        selectedNode,
        nextNodeTypes,
        visibleDisciplines,
      );
  
    const selectedRelationshipWillRemainVisible =
      !selectedRelationship ||
      isRelationshipVisibleWithFilters(
        selectedRelationship,
        nextNodeTypes,
        visibleDisciplines,
      );
  
    if (
      !selectedNodeWillRemainVisible ||
      !selectedRelationshipWillRemainVisible
    ) {
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
      isNodeVisibleWithFilters(
        selectedNode,
        visibleNodeTypes,
        nextDisciplines,
      );
  
    const selectedRelationshipWillRemainVisible =
      !selectedRelationship ||
      isRelationshipVisibleWithFilters(
        selectedRelationship,
        visibleNodeTypes,
        nextDisciplines,
      );
  
    if (
      !selectedNodeWillRemainVisible ||
      !selectedRelationshipWillRemainVisible
    ) {
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
    handleDisciplineToggle,
    handleDisciplineSelectAll,
    handleNodeSelect,
    handleNodeTypeToggle,
    handleNodeTypeSelectAll,
    handleRelationshipOpen,
    handleRelationshipSelect,
    handleSelectionClear,
  };
}