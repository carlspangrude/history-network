import { useMemo, useState } from "react";
import { sampleGraph } from "../data/sampleGraph";
import type { EvidenceType, RelationshipDirectness } from "../types/graph";

// "Unclassified" is not a real EvidenceType in the schema — it's this
// view's own label for the ~44% of edges (mostly earlier additions,
// before evidenceType became standard practice) that never got one.
// Surfacing that gap honestly is the point of this view, not something
// to paper over with a default.
type EvidenceBucket = EvidenceType | "unclassified";

const EVIDENCE_ORDER: EvidenceBucket[] = [
  "primary_source",
  "scholarly_consensus",
  "secondary_source",
  "editorial_summary",
  "unclassified",
];

const EVIDENCE_LABELS: Record<EvidenceBucket, string> = {
  primary_source: "Primary source",
  scholarly_consensus: "Scholarly consensus",
  secondary_source: "Secondary source",
  editorial_summary: "Editorial summary",
  unclassified: "Unclassified",
};

const EVIDENCE_DESCRIPTIONS: Record<EvidenceBucket, string> = {
  primary_source:
    "Drawn directly from the historical figure's own writing or work.",
  scholarly_consensus:
    "Reflects broad agreement among historians on this point.",
  secondary_source:
    "Drawn from a documented account or analysis of the primary material.",
  editorial_summary:
    "A reasonable synthesis where a single clear source wasn't cited.",
  unclassified:
    "Added before evidence typing was consistently applied — not yet reviewed against this standard.",
};

const DIRECTNESS_LABELS: Record<RelationshipDirectness, string> = {
  direct: "Direct",
  indirect: "Indirect",
  summary: "Summary",
};

function formatRelationship(relationship: string): string {
  return relationship.replace(/_/g, " ");
}

function getEvidenceBucket(evidenceType: EvidenceType | undefined): EvidenceBucket {
  return evidenceType ?? "unclassified";
}

type SortOrder = "confidence-asc" | "confidence-desc";

function CitationsView() {
  const nodeNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const node of sampleGraph.nodes) {
      map.set(node.id, node.name);
    }
    return map;
  }, []);

  const evidenceCounts = useMemo(() => {
    const counts: Record<EvidenceBucket, number> = {
      primary_source: 0,
      scholarly_consensus: 0,
      secondary_source: 0,
      editorial_summary: 0,
      unclassified: 0,
    };
    for (const edge of sampleGraph.edges) {
      counts[getEvidenceBucket(edge.evidenceType)] += 1;
    }
    return counts;
  }, []);

  const [visibleEvidence, setVisibleEvidence] = useState<Set<EvidenceBucket>>(
    () => new Set(EVIDENCE_ORDER),
  );
  const [sortOrder, setSortOrder] = useState<SortOrder>("confidence-asc");
  const [searchText, setSearchText] = useState("");

  const handleEvidenceToggle = (bucket: EvidenceBucket) => {
    setVisibleEvidence((current) => {
      const next = new Set(current);
      if (next.has(bucket)) {
        next.delete(bucket);
      } else {
        next.add(bucket);
      }
      return next;
    });
  };

  const handleEvidenceSelectAll = () => {
    setVisibleEvidence(new Set(EVIDENCE_ORDER));
  };

  const visibleEdges = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    const filtered = sampleGraph.edges.filter((edge) => {
      const bucket = getEvidenceBucket(edge.evidenceType);
      if (!visibleEvidence.has(bucket)) {
        return false;
      }

      if (query.length === 0) {
        return true;
      }

      const sourceName = nodeNameById.get(edge.source) ?? "";
      const targetName = nodeNameById.get(edge.target) ?? "";
      const haystack = [
        sourceName,
        targetName,
        edge.relationship,
        edge.description ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });

    const sorted = [...filtered].sort((a, b) => {
      const confidenceA = a.confidence ?? 1;
      const confidenceB = b.confidence ?? 1;
      return sortOrder === "confidence-asc"
        ? confidenceA - confidenceB
        : confidenceB - confidenceA;
    });

    return sorted;
  }, [visibleEvidence, searchText, sortOrder, nodeNameById]);

  const totalEdges = sampleGraph.edges.length;
  const withDescriptions = sampleGraph.edges.filter((e) => e.description).length;

  return (
    <main className="citations-view">
      <div className="citations-header">
        <h2>Citations &amp; Evidence</h2>
        <p className="citations-intro">
          Every connection in this graph carries the app's own editorial
          assessment of how well-supported it is — not a generated score,
          but a judgment made claim by claim. This view makes that
          assessment browsable directly, including the places where it's
          thin.
        </p>
      </div>

      <div className="citations-stats">
        <span>{totalEdges} connections</span>
        <span>{withDescriptions} with a written rationale</span>
        <span>{evidenceCounts.unclassified} not yet evidence-typed</span>
      </div>

      <div className="citations-controls">
        <div className="citations-search-row">
          <input
            className="search-input citations-search-input"
            type="text"
            placeholder="Search by name, relationship, or description…"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
          />

          <button
            className="fit-graph-button"
            type="button"
            onClick={() =>
              setSortOrder((current) =>
                current === "confidence-asc" ? "confidence-desc" : "confidence-asc",
              )
            }
          >
            {sortOrder === "confidence-asc"
              ? "Least confident first"
              : "Most confident first"}
          </button>
        </div>

        <div className="filter-section">
          <div className="filter-section__heading">
            <span>Evidence type</span>
          </div>
          <div className="filter-section__content">
            <label className="filter-option filter-option--all">
              <input
                type="checkbox"
                checked={visibleEvidence.size === EVIDENCE_ORDER.length}
                onChange={handleEvidenceSelectAll}
              />
              All evidence types
            </label>
            {EVIDENCE_ORDER.map((bucket) => (
              <label className="filter-option" key={bucket}>
                <input
                  type="checkbox"
                  checked={visibleEvidence.has(bucket)}
                  onChange={() => handleEvidenceToggle(bucket)}
                />
                {EVIDENCE_LABELS[bucket]}
                <span className="citations-filter-count">
                  {evidenceCounts[bucket]}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="citations-list">
        {visibleEdges.length === 0 && (
          <p className="citations-empty">
            No connections match the current filters.
          </p>
        )}

        {visibleEdges.map((edge) => {
          const bucket = getEvidenceBucket(edge.evidenceType);
          const confidence = edge.confidence ?? 1;
          const confidencePercent = Math.round(confidence * 100);

          return (
            <article className="citation-row" key={edge.id}>
              <h3 className="citation-row-relationship">
                {nodeNameById.get(edge.source) ?? edge.source}{" "}
                <span className="citation-row-verb">
                  {formatRelationship(edge.relationship)}
                </span>{" "}
                {nodeNameById.get(edge.target) ?? edge.target}
              </h3>

              <div className="citation-row-meta">
                <span
                  className="citation-confidence"
                  title={`${confidencePercent}% confidence`}
                >
                  <span className="citation-confidence-track">
                    <span
                      className="citation-confidence-fill"
                      style={{ width: `${confidencePercent}%` }}
                    />
                  </span>
                  <span className="citation-confidence-label">
                    {confidencePercent}%
                  </span>
                </span>

                {edge.directness && (
                  <span className="citation-badge">
                    {DIRECTNESS_LABELS[edge.directness]}
                  </span>
                )}

                <span
                  className={
                    bucket === "unclassified"
                      ? "citation-badge citation-badge--unclassified"
                      : "citation-badge"
                  }
                  title={EVIDENCE_DESCRIPTIONS[bucket]}
                >
                  {EVIDENCE_LABELS[bucket]}
                </span>
              </div>

              {edge.description && (
                <p className="citation-row-description">{edge.description}</p>
              )}
            </article>
          );
        })}
      </div>

      {sampleGraph.sources.length > 0 && (
        <div className="citations-sources">
          <h3>Referenced works</h3>
          <p className="citations-sources-note">
            A small, illustrative sample of formal citations behind
            specific connections above — not a bibliography for the graph
            as a whole. Most connections are instead backed by the
            confidence and evidence-type assessment shown per row, rather
            than a cited work.
          </p>
          <ul className="citations-sources-list">
            {sampleGraph.sources.map((source) => (
              <li className="citations-source-item" key={source.id}>
                <span className="citations-source-title">
                  {source.title}
                </span>
                {source.authors && source.authors.length > 0 && (
                  <span className="citations-source-authors">
                    {" "}
                    — {source.authors.join(", ")}
                  </span>
                )}
                {source.publicationYear && (
                  <span className="citations-source-year">
                    {" "}
                    ({source.publicationYear})
                  </span>
                )}
                {source.publisher && (
                  <span className="citations-source-publisher">
                    {" "}
                    · {source.publisher}
                  </span>
                )}
                {source.note && (
                  <p className="citations-source-note">{source.note}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Icon attribution: Book icon by Graphtend from Noun Project,
          used elsewhere in the app's UI (e.g. the story-point marker in
          DetailsPanel). Confirm/adjust based on your actual Noun Project
          account terms if that changes. */}
      <p className="citations-placeholder-attribution">
        Icon attribution: Book icon by Graphtend from{" "}
        <a href="https://thenounproject.com" target="_blank" rel="noreferrer">
          Noun Project
        </a>
        .
      </p>
    </main>
  );
}

export default CitationsView;
