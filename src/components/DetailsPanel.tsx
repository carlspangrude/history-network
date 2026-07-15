import { useMemo, useState } from "react";
import type {
  GraphNode,
  KnowledgeEdge,
  RelationshipType,
} from "../types/graph";

interface DetailsPanelProps {
  isOpen: boolean;
  selectedNode: GraphNode | null;
  relationships: KnowledgeEdge[];
  graphNodes: GraphNode[];
  onNodeSelect: (node: GraphNode) => void;
  onSelectionClear: () => void;
  onToggle: () => void;
}

interface RelationshipGroup {
  relationship: RelationshipType;
  edges: KnowledgeEdge[];
}

function formatRelationship(
  relationship: RelationshipType,
  direction: "incoming" | "outgoing",
) {
  const formatted = relationship.replaceAll("_", " ");

  if (direction === "incoming") {
    switch (relationship) {
      case "influenced":
        return "Influenced by";

      case "authored":
        return "Authored by";

      case "formalized":
        return "Formalized by";

      case "discovered":
        return "Discovered by";

      case "invented":
        return "Invented by";

      default:
        return formatted;
    }
  }

  return formatted;
}

function DetailsPanel({
  isOpen,
  selectedNode,
  relationships,
  graphNodes,
  onNodeSelect,
  onSelectionClear,
  onToggle,
}: DetailsPanelProps) {
  
  // ===========================================================================
  // State
  // ===========================================================================

const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
  new Set(),
);
  
  // ===========================================================================
  // Derived Data
  // ===========================================================================

  const incomingRelationshipGroups = useMemo<RelationshipGroup[]>(() => {
    if (!selectedNode) {
      return [];
    }

    const incomingEdges = relationships.filter(
      (edge) => edge.target === selectedNode.id,
    );

    const groupedEdges = new Map<RelationshipType, KnowledgeEdge[]>();

    incomingEdges.forEach((edge) => {
      const existingEdges = groupedEdges.get(edge.relationship) ?? [];
      groupedEdges.set(edge.relationship, [...existingEdges, edge]);
    });

    return Array.from(groupedEdges, ([relationship, edges]) => ({
      relationship,
      edges,
    })).sort((firstGroup, secondGroup) =>
      firstGroup.relationship.localeCompare(secondGroup.relationship),
    );
  }, [relationships, selectedNode]);

  const outgoingRelationshipGroups = useMemo<RelationshipGroup[]>(() => {
    if (!selectedNode) {
      return [];
    }

    const outgoingEdges = relationships.filter(
      (edge) => edge.source === selectedNode.id,
    );

    const groupedEdges = new Map<RelationshipType, KnowledgeEdge[]>();

    outgoingEdges.forEach((edge) => {
      const existingEdges = groupedEdges.get(edge.relationship) ?? [];
      groupedEdges.set(edge.relationship, [...existingEdges, edge]);
    });

    return Array.from(groupedEdges, ([relationship, edges]) => ({
      relationship,
      edges,
    })).sort((firstGroup, secondGroup) =>
      firstGroup.relationship.localeCompare(secondGroup.relationship),
    );
  }, [relationships, selectedNode]);

  // ===========================================================================
  // Helpers
  // ===========================================================================

  const getRelationshipGroupKey = (
    relationship: RelationshipType,
    direction: "incoming" | "outgoing",
  ) => `${direction}:${relationship}`;
  
  const findNode = (id: string) =>
    graphNodes.find((node) => node.id === id);

  const renderRelationshipGroup = (
    group: RelationshipGroup,
    direction: "incoming" | "outgoing",
  ) => {
    const groupKey = getRelationshipGroupKey(
      group.relationship,
      direction,
    );
  
    const isCollapsed = collapsedGroups.has(groupKey);
  
    return (
      <section className="relationship-group" key={groupKey}>
        <button
          className="relationship-group-toggle"
          type="button"
          onClick={() => handleRelationshipGroupToggle(groupKey)}
          aria-expanded={!isCollapsed}
        >
          <span className="relationship-group-icon" aria-hidden="true">
            {isCollapsed ? "›" : "⌄"}
          </span>
  
          <span className="relationship-group-label">
            {formatRelationship(group.relationship, direction)}
          </span>
  
          <span className="relationship-group-count">
            {group.edges.length}
          </span>
        </button>
  
        {!isCollapsed && (
          <div className="relationship-group-items">
            {group.edges.map((edge) => {
              const connectedNodeId =
                direction === "outgoing" ? edge.target : edge.source;
  
              const connectedNode = findNode(connectedNodeId);
  
              return (
                <article className="relationship-item" key={edge.id}>
                  {connectedNode ? (
                    <button
                      className="relationship-node-link"
                      type="button"
                      onClick={() => onNodeSelect(connectedNode)}
                    >
                      {connectedNode.name}
                    </button>
                  ) : (
                    <p>{connectedNodeId}</p>
                  )}
  
                  {edge.description && (
                    <p className="relationship-description">
                      {edge.description}
                    </p>
                  )}
  
                  {edge.confidence !== undefined && (
                    <p className="relationship-confidence">
                      Confidence: {Math.round(edge.confidence * 100)}%
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    );
  };

  // ===========================================================================
  // Event Handlers
  // ===========================================================================
  
  const handleRelationshipGroupToggle = (groupKey: string) => {
    setCollapsedGroups((current) => {
      const next = new Set(current);
  
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
  
      return next;
    });
  };

  // ===========================================================================
  // Render
  // ===========================================================================

  return (
    <aside className={`details ${isOpen ? "panel-open" : "panel-closed"}`}>
      <button
        className="panel-toggle details-toggle"
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-label={isOpen ? "Close details panel" : "Open details panel"}
      >
        {isOpen ? "›" : "‹"}
      </button>

      {isOpen && (
        <div className="panel-content">
          <p className="eyebrow">Selection</p>

          {selectedNode ? (
            <article className="node-details">
              <span className="details-node-type">
                {selectedNode.type}
              </span>

              <button
                className="clear-selection-button"
                type="button"
                onClick={onSelectionClear}
              >
                Clear selection
              </button>

              <h2>{selectedNode.name}</h2>

              {(selectedNode.startYear !== undefined ||
                selectedNode.endYear !== undefined) && (
                <p className="details-years">
                  {selectedNode.startYear ?? "Unknown"}
                  {selectedNode.endYear !== undefined
                    ? `–${selectedNode.endYear}`
                    : ""}
                </p>
              )}

              <p className="details-description">
                {selectedNode.description}
              </p>

              {selectedNode.disciplines &&
                selectedNode.disciplines.length > 0 && (
                  <section className="details-section">
                    <h3>Disciplines</h3>

                    <div className="tag-list">
                      {selectedNode.disciplines.map((discipline) => (
                        <span key={discipline}>{discipline}</span>
                      ))}
                    </div>
                  </section>
                )}

              {selectedNode.tags && selectedNode.tags.length > 0 && (
                <section className="details-section">
                  <h3>Tags</h3>

                  <div className="tag-list">
                    {selectedNode.tags.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                </section>
              )}

              <section className="details-section">
                <h3>Relationships</h3>

                {relationships.length > 0 ? (
                  <div className="relationship-directions">
                    {incomingRelationshipGroups.length > 0 && (
                      <section className="relationship-direction-group">
                        <h4 className="relationship-direction-title">
                          Incoming
                        </h4>

                        <div className="relationship-groups">
                          {incomingRelationshipGroups.map((group) =>
                            renderRelationshipGroup(group, "incoming"),
                          )}
                        </div>
                      </section>
                    )}

                    {outgoingRelationshipGroups.length > 0 && (
                      <section className="relationship-direction-group">
                        <h4 className="relationship-direction-title">
                          Outgoing
                        </h4>

                        <div className="relationship-groups">
                          {outgoingRelationshipGroups.map((group) =>
                            renderRelationshipGroup(group, "outgoing"),
                          )}
                        </div>
                      </section>
                    )}
                  </div>
                ) : (
                  <p className="empty-relationships">
                    No relationships recorded.
                  </p>
                )}
              </section>
            </article>
          ) : (
            <div className="empty-details">
              <h2>Details</h2>

              <p>
                Select a person, theory, publication, or discovery to explore
                it.
              </p>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}

export default DetailsPanel;