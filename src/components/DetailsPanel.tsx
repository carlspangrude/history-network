import { useMemo, useState } from "react";
import { formatHistoricalYearRange } from "../utils/formatHistoricalDate";
import type {
  GraphNode,
  KnowledgeEdge,
  RelationshipType,
} from "../types/graph";
import type { ActivePathway } from "../hooks/useKnowledgeGraph";

interface DetailsPanelProps {
  isOpen: boolean;
  selectedNode: GraphNode | null;
  selectedRelationship: KnowledgeEdge | null;
  selectedRelationshipId: string | null;
  relationships: KnowledgeEdge[];
  graphNodes: GraphNode[];
  onNodeSelect: (node: GraphNode) => void;
  onRelationshipSelect: (relationshipId: string) => void;
  onSelectionClear: () => void;
  onToggle: () => void;
  pathwaySearchSourceId: string | null;
  activePathway: ActivePathway | null;
  pathwaySteps: KnowledgeEdge[];
  pathwayNotFound: boolean;
  pathwayNotFoundTargetName: string | null;
  onPathwaySearchStart: () => void;
  onPathwaySearchCancel: () => void;
  onPathwayTargetSelect: (node: GraphNode) => void;
  onPathwayClear: () => void;
  anchoredNodeIds: Set<string>;
  onNodeUnanchor: (nodeId: string) => void;
}

interface RelationshipGroup {
  relationship: RelationshipType;
  edges: KnowledgeEdge[];
}

// Two nodes joined by a line, in the same orange used to highlight a
// traced pathway elsewhere in the app — a small visual cue that "Find a
// path" starts that same kind of trace.
function ConnectedPathIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="3.5" cy="12.5" r="2.1" fill="#ffb703" />
      <circle cx="12.5" cy="3.5" r="2.1" fill="#ffb703" />
      <path
        d="M5.2 10.8L10.8 5.2"
        stroke="#ffb703"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
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

      case "advanced":
        return "Advanced by";

      case "anticipated":
        return "Anticipated by";

      case "formalized":
        return "Formalized by";

      case "challenged":
        return "Challenged by";

      case "complemented":
        return "Complemented by";

      case "enabled":
        return "Enabled by";

      case "extended":
        return "Extended by";

      case "explained":
        return "Explained by";

      case "developed":
        return "Developed by";

      case "discovered":
        return "Discovered by";

      case "invented":
        return "Invented by";

      case "improved":
        return "Improved by";

      case "inspired":
        return "Inspired by";

      case "popularized":
        return "Popularized by";

      case "preserved":
        return "Preserved by";
        
      case "proposed":
        return "Proposed by";

      case "published":
        return "Published by";
        
      case "mentored":
        return "Mentored by";

      case "criticized":
        return "Criticized by";

      case "refined":
        return "Refined by";

      case "supported":
        return "Supported by";

      case "synthesized":
        return "Synthesized by";
        
      case "responded_to":
        return "Responded to by";

      case "transformed":
        return "Transformed by";

      case "translated":
        return "Translated by";

      default:
        return formatted;
    }
  }

  return formatted;
}

function DetailsPanel({
  isOpen,
  selectedNode,
  selectedRelationship,
  selectedRelationshipId,
  relationships,
  graphNodes,
  onNodeSelect,
  onRelationshipSelect,
  onSelectionClear,
  onToggle,
  pathwaySearchSourceId,
  activePathway,
  pathwaySteps,
  pathwayNotFound,
  pathwayNotFoundTargetName,
  onPathwaySearchStart,
  onPathwaySearchCancel,
  onPathwayTargetSelect,
  onPathwayClear,
  anchoredNodeIds,
  onNodeUnanchor,
}: DetailsPanelProps) {
  
  // ===========================================================================
  // State
  // ===========================================================================

const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
  new Set(),
);

const [relationshipSearchQuery, setRelationshipSearchQuery] = useState("");

const [pathwaySearchQuery, setPathwaySearchQuery] = useState("");
  
  // ===========================================================================
  // Derived Data
  // ===========================================================================

  const graphNodeById = useMemo(
    () => new Map(graphNodes.map((node) => [node.id, node])),
    [graphNodes],
  );

  const selectedRelationshipSource = selectedRelationship
    ? graphNodeById.get(selectedRelationship.source)
    : undefined;

  const selectedRelationshipTarget = selectedRelationship
    ? graphNodeById.get(selectedRelationship.target)
    : undefined;
  
  const selectedRelationshipDirectness = selectedRelationship
    ? formatDirectness(selectedRelationship.directness)
    : null;
  
  const selectedRelationshipEvidence = selectedRelationship
    ? formatEvidenceType(selectedRelationship.evidenceType)
    : null;

  const filteredRelationships = useMemo(() => {
    const normalizedQuery = relationshipSearchQuery.trim().toLowerCase();
  
    if (!selectedNode || !normalizedQuery) {
      return relationships;
    }
  
    return relationships.filter((edge) => {
      const direction =
        edge.source === selectedNode.id ? "outgoing" : "incoming";
  
      const connectedNodeId =
        direction === "outgoing" ? edge.target : edge.source;
  
      const connectedNode = graphNodeById.get(connectedNodeId);
  
      const searchableValues = [
        edge.relationship,
        formatRelationship(edge.relationship, direction),
        edge.description ?? "",
        connectedNode?.name ?? "",
        connectedNode?.type ?? "",
        ...(connectedNode?.disciplines ?? []),
        ...(connectedNode?.tags ?? []),
      ];
  
      return searchableValues.some((value) =>
        value.toLowerCase().includes(normalizedQuery),
      );
    });
  }, [
    graphNodeById,
    relationshipSearchQuery,
    relationships,
    selectedNode,
  ]);

  const incomingRelationshipGroups = useMemo<RelationshipGroup[]>(() => {
    if (!selectedNode) {
      return [];
    }

    const incomingEdges = filteredRelationships.filter(
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
  }, [filteredRelationships, selectedNode]);

  const outgoingRelationshipGroups = useMemo<RelationshipGroup[]>(() => {
    if (!selectedNode) {
      return [];
    }

    const outgoingEdges = filteredRelationships.filter(
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
  }, [filteredRelationships, selectedNode]);

  const selectedNodeYearRange = selectedNode
  ? formatHistoricalYearRange(selectedNode)
  : null;

  const pathwaySearchSourceNode = pathwaySearchSourceId
    ? graphNodeById.get(pathwaySearchSourceId)
    : undefined;

  const pathwaySearchResults = useMemo(() => {
    const normalizedQuery = pathwaySearchQuery.trim().toLowerCase();

    if (!normalizedQuery || !pathwaySearchSourceId) {
      return [];
    }

    return graphNodes
      .filter((node) => {
        if (node.id === pathwaySearchSourceId) {
          return false;
        }

        const searchableValues = [
          node.name,
          node.type,
          ...(node.disciplines ?? []),
          ...(node.tags ?? []),
        ];

        return searchableValues.some((value) =>
          value.toLowerCase().includes(normalizedQuery),
        );
      })
      .slice(0, 8);
  }, [graphNodes, pathwaySearchQuery, pathwaySearchSourceId]);

  const pathwaySourceNode = activePathway
    ? graphNodeById.get(activePathway.sourceId)
    : undefined;

  const pathwayTargetNode = activePathway
    ? graphNodeById.get(activePathway.targetId)
    : undefined;

  // ===========================================================================
  // Helpers
  // ===========================================================================

  const getRelationshipGroupKey = (
    relationship: RelationshipType,
    direction: "incoming" | "outgoing",
  ) => `${direction}:${relationship}`;
  
  const findNode = (id: string) => graphNodeById.get(id);

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
                <article
                  className={[
                    "relationship-item",
                    edge.id === selectedRelationshipId
                      ? "relationship-item-selected"
                      : "",
                  ].join(" ")}
                  key={edge.id}
                >
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
                  <button
                    className="relationship-highlight-button"
                    type="button"
                    onClick={() => onRelationshipSelect(edge.id)}
                    aria-pressed={edge.id === selectedRelationshipId}
                  >
                    {edge.id === selectedRelationshipId
                      ? "Remove highlight"
                      : "Highlight connection"}
                  </button>
                  
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

  const renderSelectedConnection = () => {
    if (!selectedRelationship) {
      return null;
    }
  
    return (
      <section className="details-section selected-connection">
        <div className="selected-connection-heading">
          <h3>Selected Connection</h3>
  
          <button
            className="selected-connection-clear"
            type="button"
            onClick={() =>
              onRelationshipSelect(selectedRelationship.id)
            }
          >
            Clear
          </button>
        </div>
  
        <div className="selected-connection-path">
          {selectedRelationshipSource ? (
            <button
              className="relationship-node-link"
              type="button"
              onClick={() => onNodeSelect(selectedRelationshipSource)}
            >
              {selectedRelationshipSource.name}
            </button>
          ) : (
            <span>{selectedRelationship.source}</span>
          )}
  
          <p className="selected-connection-type">
            {formatRelationship(
              selectedRelationship.relationship,
              "outgoing",
            )}
          </p>
  
          {selectedRelationshipTarget ? (
            <button
              className="relationship-node-link"
              type="button"
              onClick={() => onNodeSelect(selectedRelationshipTarget)}
            >
              {selectedRelationshipTarget.name}
            </button>
          ) : (
            <span>{selectedRelationship.target}</span>
          )}
        </div>
  
        {selectedRelationship.description && (
          <p className="selected-connection-description">
            {selectedRelationship.description}
          </p>
        )}

        {(selectedRelationshipDirectness ||
          selectedRelationshipEvidence) && (
          <div className="relationship-metadata">
            {selectedRelationshipDirectness && (
              <span className="relationship-metadata-badge">
                {selectedRelationshipDirectness}
              </span>
            )}

            {selectedRelationshipEvidence && (
              <span className="relationship-metadata-badge">
                {selectedRelationshipEvidence}
              </span>
            )}
          </div>
        )}
  
        {selectedRelationship.confidence !== undefined && (
          <p className="selected-connection-confidence">
            Confidence:{" "}
            {Math.round(selectedRelationship.confidence * 100)}%
          </p>
        )}
      </section>
    );
  };

  const renderPathwaySearch = () => {
    if (!pathwaySearchSourceId) {
      return null;
    }

    return (
      <div className="pathway-search">
        <p className="eyebrow">Trace pathway</p>

        <h2>
          Find path from{" "}
          {pathwaySearchSourceNode ? pathwaySearchSourceNode.name : "…"}
        </h2>

        <p className="pathway-search-hint">
          Search for the node you want to trace a connection to. Paths only
          follow connections in the direction they point.
        </p>

        <div className="search">
          <label className="search-label" htmlFor="pathway-search">
            Search for a destination
          </label>

          <input
            id="pathway-search"
            className="search-input"
            type="search"
            value={pathwaySearchQuery}
            placeholder="Search people, theories, publications..."
            autoComplete="off"
            autoFocus
            onChange={(event) => setPathwaySearchQuery(event.target.value)}
          />

          {pathwaySearchQuery.trim() && (
            <div className="search-results">
              {pathwaySearchResults.length > 0 ? (
                pathwaySearchResults.map((node) => (
                  <button
                    className="search-result"
                    type="button"
                    key={node.id}
                    onClick={() => {
                      onPathwayTargetSelect(node);
                      setPathwaySearchQuery("");
                    }}
                  >
                    <span className="search-result-name">{node.name}</span>
                  </button>
                ))
              ) : (
                <p className="search-empty">No matching nodes found.</p>
              )}
            </div>
          )}
        </div>

        <button
          className="pathway-search-cancel"
          type="button"
          onClick={() => {
            onPathwaySearchCancel();
            setPathwaySearchQuery("");
          }}
        >
          Back
        </button>
      </div>
    );
  };

  const renderPathwayResult = () => {
    if (!activePathway) {
      return null;
    }

    return (
      <div className="pathway-result">
        <p className="eyebrow">Traced pathway</p>

        <div className="pathway-result-heading">
          <h2>
            {pathwaySourceNode?.name ?? activePathway.sourceId} →{" "}
            {pathwayTargetNode?.name ?? activePathway.targetId}
          </h2>

          <button
            className="clear-selection-button"
            type="button"
            onClick={onPathwayClear}
          >
            Clear pathway
          </button>
        </div>

        <p className="pathway-result-hint">
          {activePathway.nodeIds.length - 1} hop
          {activePathway.nodeIds.length - 1 === 1 ? "" : "s"}, following
          directed relationships forward.
        </p>

        <ol className="pathway-steps">
          {activePathway.nodeIds.map((nodeId, index) => {
            const node = findNode(nodeId);
            const nextEdge = pathwaySteps[index];

            return (
              <li className="pathway-step" key={nodeId}>
                <div className="pathway-step-node">
                  <span className="pathway-step-number">{index + 1}</span>

                  {node ? (
                    <button
                      className="relationship-node-link"
                      type="button"
                      onClick={() => onNodeSelect(node)}
                    >
                      {node.name}
                    </button>
                  ) : (
                    <span>{nodeId}</span>
                  )}
                </div>

                {nextEdge && (
                  <p className="pathway-step-relationship">
                    {formatRelationship(nextEdge.relationship, "outgoing")}
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    );
  };

  function formatDirectness(
    directness?: KnowledgeEdge["directness"],
  ): string | null {
    switch (directness) {
      case "direct":
        return "Direct relationship";
      case "indirect":
        return "Indirect relationship";
      case "summary":
        return "Summary relationship";
      default:
        return null;
    }
  }
  
  function formatEvidenceType(
    evidenceType?: KnowledgeEdge["evidenceType"],
  ): string | null {
    switch (evidenceType) {
      case "primary_source":
        return "Primary source";
      case "secondary_source":
        return "Secondary source";
      case "scholarly_consensus":
        return "Scholarly consensus";
      case "editorial_summary":
        return "Editorial summary";
      default:
        return null;
    }
  }

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

  const handleUnanchorNode = () => {
    if (!selectedNode) {
      return;
    }

    onNodeUnanchor(selectedNode.id);
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
          {pathwaySearchSourceId ? (
            renderPathwaySearch()
          ) : activePathway ? (
            renderPathwayResult()
          ) : (
            <>
              <p className="eyebrow">Selection</p>

              {selectedNode ? (
                <article className="node-details">
                  <div className="node-details-header">
                    <span className="details-node-type">
                      {selectedNode.type}
                    </span>

                    <button
                      className="find-path-button"
                      type="button"
                      onClick={onPathwaySearchStart}
                    >
                      Find a path
                      <ConnectedPathIcon />
                    </button>
                  </div>

                  <div className="node-details-actions">
                    <button
                      className="clear-selection-button"
                      type="button"
                      onClick={onSelectionClear}
                    >
                      Clear
                    </button>

                    {selectedNode.type === "movement" &&
                      anchoredNodeIds.has(selectedNode.id) && (
                        <button
                          className="unanchor-button"
                          type="button"
                          onClick={handleUnanchorNode}
                        >
                          Release anchor
                        </button>
                      )}
                  </div>

                  {pathwayNotFound && (
                    <p className="pathway-not-found">
                      No directed path found
                      {pathwayNotFoundTargetName
                        ? ` to ${pathwayNotFoundTargetName}`
                        : ""}
                      .
                    </p>
                  )}

                  <h2>{selectedNode.name}</h2>
                  
                  {selectedNode.epigraph?.text && (
                    <p className="details-epigraph">
                      “{selectedNode.epigraph.text}”
                    </p>
                  )}

                  {selectedNodeYearRange && (
                    <p className="details-years">
                      {selectedNodeYearRange}
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
                  
                  {renderSelectedConnection()}

                  <section className="details-section">
                    <div className="relationship-section-heading">
                      <h3>Relationships</h3>
                    </div>

                    {relationships.length > 0 && (
                      <div className="relationship-search-row">
                        <div className="relationship-search">
                          <input
                            id="relationship-search"
                            className="relationship-search-input"
                            type="search"
                            value={relationshipSearchQuery}
                            placeholder="Search relationships..."
                            autoComplete="off"
                            onChange={(event) =>
                              setRelationshipSearchQuery(event.target.value)
                            }
                          />
                        </div>

                        {relationshipSearchQuery && (
                          <button
                            className="relationship-search-clear"
                            type="button"
                            onClick={() => setRelationshipSearchQuery("")}
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    )}

                    {relationships.length > 0 ? (
                      filteredRelationships.length > 0 ? (
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
                          No relationships match “{relationshipSearchQuery}”.
                        </p>
                      )
                    ) : (
                      <p className="empty-relationships">
                        No relationships recorded.
                      </p>
                    )}
                  </section>
                </article>
              ) : selectedRelationship ? (
                <article className="connection-details">
                  {renderSelectedConnection()}
                </article>
              ) : (
                <div className="empty-details">
                  <h2>Details</h2>

                  <p>
                    Select a person, theory, publication, or discovery to
                    explore it.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </aside>
  );
}

export default DetailsPanel;
