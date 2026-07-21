import { useState } from "react";

import {
  FILTERABLE_NODE_TYPES,
  GRAPH_BACKGROUND_COLOR,
  MOVEMENT_NODE_OUTLINE_COLOR,
  NODE_TYPE_COLORS,
  NODE_TYPE_LABELS,
  THEORY_NODE_OUTLINE_COLOR,
} from "../constants/graphVisuals";
import type { NodeType } from "../types/graph";

interface SidebarProps {
  availableDisciplines: string[];
  isOpen: boolean;
  visibleDisciplines: Set<string>;
  visibleNodeTypes: Set<NodeType>;
  onDisciplineSelectAll: (selected: boolean) => void;
  onDisciplineToggle: (discipline: string) => void;
  onNodeTypeSelectAll: (selected: boolean) => void;
  onNodeTypeToggle: (nodeType: NodeType) => void;
  onToggle: () => void;
}

const visibleLegendTypes: NodeType[] = [
  "person",
  "publication",
  "theory",
  "institution",
  "movement",
];

interface LegendSwatchProps {
  type: NodeType;
}

// Mirrors the exact shape/fill treatment used for each node type in
// GraphCanvas and TimelineCanvas, so the legend actually shows what you'll
// see on the graph instead of a generic colored dot for every type.
function LegendSwatch({ type }: LegendSwatchProps) {
  const color = NODE_TYPE_COLORS[type];

  if (type === "movement") {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
        <circle
          cx="8"
          cy="8"
          r="6"
          fill={GRAPH_BACKGROUND_COLOR}
          stroke={MOVEMENT_NODE_OUTLINE_COLOR}
          strokeWidth="1.5"
        />
      </svg>
    );
  }

  if (type === "theory") {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
        <polygon
          points="8,2 13.2,5 13.2,11 8,14 2.8,11 2.8,5"
          fill={GRAPH_BACKGROUND_COLOR}
          stroke={THEORY_NODE_OUTLINE_COLOR}
          strokeWidth="1.5"
        />
      </svg>
    );
  }

  if (type === "publication") {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
        <rect x="4" y="2" width="8" height="12" fill={color} />
      </svg>
    );
  }

  if (type === "institution") {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
        <polygon points="2,13 14,13 14,7 8,2 2,7" fill={color} />
      </svg>
    );
  }

  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="6" fill={color} />
    </svg>
  );
}

function Sidebar({
  availableDisciplines,
  isOpen,
  visibleDisciplines,
  visibleNodeTypes,
  onDisciplineSelectAll,
  onDisciplineToggle,
  onNodeTypeSelectAll,
  onNodeTypeToggle,
  onToggle,
}: SidebarProps) {
  // ===========================================================================
  // State
  // ===========================================================================

  const [areNodeTypesExpanded, setAreNodeTypesExpanded] =
    useState(true);

  const [areDisciplinesExpanded, setAreDisciplinesExpanded] =
    useState(true);

  // ===========================================================================
  // Derived State
  // ===========================================================================

  const areAllNodeTypesSelected =
    FILTERABLE_NODE_TYPES.length > 0 &&
    FILTERABLE_NODE_TYPES.every((nodeType) =>
      visibleNodeTypes.has(nodeType)
    );

  const areAllDisciplinesSelected =
    availableDisciplines.length > 0 &&
    availableDisciplines.every((discipline) =>
      visibleDisciplines.has(discipline)
    );

  // ===========================================================================
  // Render
  // ===========================================================================

  return (
    <aside
      className={`sidebar ${
        isOpen ? "panel-open" : "panel-closed"
      }`}
    >
      <button
        className="panel-toggle sidebar-toggle"
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-label={
          isOpen
            ? "Close filters panel"
            : "Open filters panel"
        }
      >
        {isOpen ? "‹" : "›"}
      </button>

      {isOpen && (
        <div className="panel-content">
          <h2>Filters</h2>

          {/* ================================================================
              Node Type Filters
              ================================================================ */}

          <section className="filter-section">
            <button
              className="filter-section__heading"
              type="button"
              aria-expanded={areNodeTypesExpanded}
              aria-controls="node-type-filters"
              onClick={() =>
                setAreNodeTypesExpanded(
                  (current) => !current
                )
              }
            >
              <span>Node Types</span>

              <span
                className="filter-section__chevron"
                aria-hidden="true"
                style={{
                  transform: areNodeTypesExpanded
                    ? "rotate(90deg)"
                    : "rotate(0deg)",
                }}
              >
                ›
              </span>
            </button>

            {areNodeTypesExpanded && (
              <div
                className="filter-section__content"
                id="node-type-filters"
              >
                <label className="filter-option filter-option--all">
                  <input
                    type="checkbox"
                    checked={areAllNodeTypesSelected}
                    onChange={(event) =>
                      onNodeTypeSelectAll(
                        event.target.checked
                      )
                    }
                  />

                  <span>Select all</span>
                </label>

                {FILTERABLE_NODE_TYPES.map((nodeType) => (
                  <label
                    className="filter-option"
                    key={nodeType}
                  >
                    <input
                      type="checkbox"
                      checked={visibleNodeTypes.has(nodeType)}
                      onChange={() =>
                        onNodeTypeToggle(nodeType)
                      }
                    />

                    <span>
                      {NODE_TYPE_LABELS[nodeType]}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </section>

          {/* ================================================================
              Discipline Filters
              ================================================================ */}

          <section className="filter-section">
            <button
              className="filter-section__heading"
              type="button"
              aria-expanded={areDisciplinesExpanded}
              aria-controls="discipline-filters"
              onClick={() =>
                setAreDisciplinesExpanded(
                  (current) => !current
                )
              }
            >
              <span>Disciplines</span>

              <span
                className="filter-section__chevron"
                aria-hidden="true"
                style={{
                  transform: areDisciplinesExpanded
                    ? "rotate(90deg)"
                    : "rotate(0deg)",
                }}
              >
                ›
              </span>
            </button>

            {areDisciplinesExpanded && (
              <div
                className="filter-section__content"
                id="discipline-filters"
              >
                <label className="filter-option filter-option--all">
                  <input
                    type="checkbox"
                    checked={areAllDisciplinesSelected}
                    onChange={(event) =>
                      onDisciplineSelectAll(
                        event.target.checked
                      )
                    }
                  />

                  <span>Select all</span>
                </label>

                {availableDisciplines.map(
                  (discipline) => (
                    <label
                      className="filter-option"
                      key={discipline}
                    >
                      <input
                        type="checkbox"
                        checked={visibleDisciplines.has(
                          discipline
                        )}
                        onChange={() =>
                          onDisciplineToggle(discipline)
                        }
                      />

                      <span>{discipline}</span>
                    </label>
                  )
                )}
              </div>
            )}
          </section>

          {/* ================================================================
              Graph Legend
              ================================================================ */}

          <section className="graph-legend">
            <h3>Legend</h3>

            <div className="legend-list">
              {visibleLegendTypes.map((type) => (
                <div
                  className="legend-item"
                  key={type}
                >
                  <LegendSwatch type={type} />

                  <span>
                    {NODE_TYPE_LABELS[type]}
                  </span>
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
