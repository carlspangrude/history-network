interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

function Sidebar({ isOpen, onToggle }: SidebarProps) {
  return (
    <aside className={`sidebar ${isOpen ? "panel-open" : "panel-closed"}`}>
      <button
        className="panel-toggle sidebar-toggle"
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-label={isOpen ? "Close filters panel" : "Open filters panel"}
      >
        {isOpen ? "‹" : "›"}
      </button>

      {isOpen && (
        <div className="panel-content">
          <p className="eyebrow">Explore</p>
          <h2>Filters</h2>

          <div className="filter-section">
            <h3>Node type</h3>

            <label>
              <input type="checkbox" defaultChecked />
              People
            </label>

            <label>
              <input type="checkbox" defaultChecked />
              Theories
            </label>

            <label>
              <input type="checkbox" defaultChecked />
              Publications
            </label>
          </div>

          <div className="filter-section">
            <h3>Discipline</h3>

            <label>
              <input type="checkbox" defaultChecked />
              Physics
            </label>

            <label>
              <input type="checkbox" defaultChecked />
              Mathematics
            </label>

            <label>
              <input type="checkbox" />
              Philosophy
            </label>
          </div>
        </div>
      )}
    </aside>
  );
}

export default Sidebar;