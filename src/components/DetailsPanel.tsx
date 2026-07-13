import type { GraphNode } from "../types/graph";

interface DetailsPanelProps {
  isOpen: boolean;
  selectedNode: GraphNode | null;
  onToggle: () => void;
}

function DetailsPanel({
  isOpen,
  selectedNode,
  onToggle,
}: DetailsPanelProps) {
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
              <span className="details-node-type">{selectedNode.type}</span>

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