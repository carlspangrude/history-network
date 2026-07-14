import {
  NODE_TYPE_COLORS,
  NODE_TYPE_LABELS,
} from "../constants/graphVisuals";
import type { NodeType } from "../types/graph";

interface SidebarProps {
  isOpen: boolean;
  visibleNodeTypes: Set<NodeType>;
  onNodeTypeToggle: (nodeType: NodeType) => void;
  onToggle: () => void;
}

const filterableNodeTypes: NodeType[] = [
  "person",
  "theory",
  "publication",
];

const visibleLegendTypes: NodeType[] = [
  "person",
  "theory",
  "publication",
  "discovery",
  "invention",
  "institution",
];

function Sidebar({
  isOpen,
  visibleNodeTypes,
  onNodeTypeToggle,
  onToggle,
}: SidebarProps) {
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

          {/* ================================================================
              Node Type Filters
              ================================================================ */}

          <div className="filter-section">
            <h3>Node Type</h3>

            {filterableNodeTypes.map((nodeType) => (
              <label key={nodeType}>
                <input
                  type="checkbox"
                  checked={visibleNodeTypes.has(nodeType)}
                  onChange={() => onNodeTypeToggle(nodeType)}
                />

                {NODE_TYPE_LABELS[nodeType]}
              </label>
            ))}
          </div>

          {/* ================================================================
              Discipline Filters
              ================================================================ */}

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

          {/* ================================================================
              Graph Legend
              ================================================================ */}

          <section className="graph-legend">
            <h3>Legend</h3>

            <div className="legend-list">
              {visibleLegendTypes.map((type) => (
                <div className="legend-item" key={type}>
                  <span
                    className="legend-swatch"
                    style={{
                      backgroundColor: NODE_TYPE_COLORS[type],
                    }}
                  />

                  <span>{NODE_TYPE_LABELS[type]}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </aside>
  );
}

export default Sidebar;