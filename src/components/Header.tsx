import { useMemo, useState } from "react";
import type { GraphNode } from "../types/graph";

interface HeaderProps {
  nodes: GraphNode[];
  selectedNode: GraphNode | null;
  onNodeSelect: (node: GraphNode) => void;
}

// A wireframe d20 silhouette: hexagon outline, a large triangle from the
// top vertex to the two lower side vertices, the medial triangle formed by
// connecting that triangle's three side-midpoints (naturally pointing the
// opposite way), and three short connector lines from the top-left,
// top-right, and bottom hexagon vertices to those same midpoints — 10
// visible facets in total. Hollow by default (outer stroke stays yellow
// always; internal lines are also yellow, so the interior reads as black
// through the transparent fill). On hover, the shape fills solid yellow
// and the internal lines flip to black for contrast, while the outer
// hexagon edge stays yellow throughout (see .random-node-die-face/
// .random-node-die-lines in styles.css).
function DieIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" aria-hidden="true">
      <polygon
        className="random-node-die-face"
        points="12,2 20,8 20,16 12,22 4,16 4,8"
      />
      <path
        className="random-node-die-lines"
        d="M12,2 L4,16 M12,2 L20,16 M4,16 L20,16 M8,9 L16,9 M16,9 L12,16 M8,9 L12,16 M4,8 L8,9 M20,8 L16,9 M12,22 L12,16"
        fill="none"
      />
    </svg>
  );
}

function Header({ nodes, selectedNode, onNodeSelect }: HeaderProps) {
  // ===========================================================================
  // State
  // ===========================================================================

  const [searchQuery, setSearchQuery] = useState("");

  // ===========================================================================
  // Derived Data
  // ===========================================================================

  const searchResults = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return [];
    }

    return nodes
      .filter((node) => {
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
  }, [nodes, searchQuery]);

  // ===========================================================================
  // Event Handlers
  // ===========================================================================

  const handleResultSelect = (node: GraphNode) => {
    onNodeSelect(node);
    setSearchQuery("");
  };

  // Excludes the currently selected node from the candidate pool (when
  // there's more than one node to choose from), so repeated clicks always
  // land on something new rather than occasionally re-selecting the same
  // node by chance.
  const handleRandomNodeSelect = () => {
    const candidates =
      selectedNode && nodes.length > 1
        ? nodes.filter((node) => node.id !== selectedNode.id)
        : nodes;

    if (candidates.length === 0) {
      return;
    }

    const randomNode =
      candidates[Math.floor(Math.random() * candidates.length)];

    onNodeSelect(randomNode);
  };

  // ===========================================================================
  // Render
  // ===========================================================================

  return (
    <header className="header">
      <h1>History Network</h1>

      <div className="header-search-group">
        <div className="search">
          <label className="search-label" htmlFor="graph-search">
            Search the knowledge graph
          </label>

          <input
            id="graph-search"
            className="search-input"
            type="search"
            value={searchQuery}
            placeholder="Search people, theories, publications..."
            autoComplete="off"
            onChange={(event) => setSearchQuery(event.target.value)}
          />

          {searchQuery.trim() && (
            <div className="search-results">
              {searchResults.length > 0 ? (
                searchResults.map((node) => (
                  <button
                    className="search-result"
                    type="button"
                    key={node.id}
                    onClick={() => handleResultSelect(node)}
                  >
                    <span className="search-result-name">{node.name}</span>
                  </button>
                ))
              ) : (
                <p className="search-empty">No visible nodes found.</p>
              )}
            </div>
          )}
        </div>

        <button
          className="random-node-button"
          type="button"
          onClick={handleRandomNodeSelect}
          disabled={nodes.length === 0}
          aria-label="Select a random node"
          title="Select a random node"
        >
          <DieIcon />
        </button>
      </div>
    </header>
  );
}

export default Header;
