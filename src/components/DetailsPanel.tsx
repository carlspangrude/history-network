interface DetailsPanelProps {
  isOpen: boolean;
  onToggle: () => void;
}

function DetailsPanel({ isOpen, onToggle }: DetailsPanelProps) {
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
          <h2>Details</h2>

          <div className="empty-details">
            <p>Select a person, idea, publication, or discovery to explore it.</p>
          </div>
        </div>
      )}
    </aside>
  );
}

export default DetailsPanel;