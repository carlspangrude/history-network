import type {
  GraphNode,
  KnowledgeEdge,
} from "../types/graph";

interface DetailsPanelProps {
  isOpen: boolean;
  selectedNode: GraphNode | null;
  relationships: KnowledgeEdge[];
  graphNodes: GraphNode[];
  onNodeSelect: (node: GraphNode) => void;
  onToggle: () => void;
}

function formatRelationship(value: string) {
  return value.replaceAll("_", " ");
}

function DetailsPanel({
  isOpen,
  selectedNode,
  relationships,
  graphNodes,
  onNodeSelect,
  onToggle,
}: DetailsPanelProps) {
  const findNode = (id: string) =>
    graphNodes.find((node) => node.id === id);

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
                  <div className="relationship-list">
                    {relationships.map((edge) => {
                      const isOutgoing =
                        edge.source === selectedNode.id;

                      const connectedNodeId = isOutgoing
                        ? edge.target
                        : edge.source;

                      const connectedNode = findNode(connectedNodeId);

                      return (
                        <article
                          className="relationship-item"
                          key={edge.id}
                        >
                          <p className="relationship-direction">
                            {isOutgoing ? "Outgoing" : "Incoming"}
                          </p>

                          <p>
                          <strong>{formatRelationship(edge.relationship)}</strong>{" "}

                          {connectedNode ? (
                            <button
                              className="relationship-node-link"
                              type="button"
                              onClick={() => onNodeSelect(connectedNode)}
                            >
                              {connectedNode.name}
                            </button>
                          ) : (
                            connectedNodeId
                          )}
                        </p>
                      
                          {edge.description && (
                            <p className="relationship-description">
                              {edge.description}
                            </p>
                          )}

                          {edge.confidence !== undefined && (
                            <p className="relationship-confidence">
                              Confidence:{" "}
                              {Math.round(edge.confidence * 100)}%
                            </p>
                          )}
                        </article>
                      );
                    })}
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