import { useMemo, useState } from "react";
import type { GraphNode } from "../types/graph";

interface HeaderProps {
  nodes: GraphNode[];
  onNodeSelect: (node: GraphNode) => void;
}

function Header({ nodes, onNodeSelect }: HeaderProps) {
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

  // ===========================================================================
  // Render
  // ===========================================================================

  return (
    <header className="header">
      <h1>History Network</h1>

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
    </header>
  );
}

export default Header;