export type NodeType =
  | "discipline"
  | "event"
  | "idea"
  | "institution"
  | "movement"
  | "person"
  | "place"
  | "publication"
  | "technology"
  | "theory";

export type RelationshipType =
  | "advanced"
  | "anticipated"
  | "authored"
  | "belonged_to"
  | "challenged"
  | "collaborated_with"
  | "complemented"
  | "converged_with"
  | "criticized"
  | "developed"
  | "discovered"
  | "enabled"
  | "explained"
  | "extended"
  | "formalized"
  | "founded"
  | "improved"
  | "influenced"
  | "inspired"
  | "invented"
  | "mentored"
  | "popularized"
  | "preserved"
  | "proposed"
  | "published"
  | "refined"
  | "responded_to"
  | "supported"
  | "synthesized"
  | "transformed"
  | "translated";

export type RelationshipDirectness =
  | "direct"
  | "indirect"
  | "summary";

export type EvidenceType =
  | "primary_source"
  | "secondary_source"
  | "scholarly_consensus"
  | "editorial_summary";

export type SourceType =
| "primary"
| "secondary"
| "reference"
| "web";

// Controlled, high-level vocabulary for filtering/browsing. Finer-grained
// specializations (e.g. "Structural Biology", "Political Theory") belong in
// a node's `tags` instead, which is free-form by design.
export type Discipline =
  | "Astronomy"
  | "Biology"
  | "Chemistry"
  | "Computer Science"
  | "Economics"
  | "Education"
  | "Engineering"
  | "Geography"
  | "History"
  | "Literature"
  | "Mathematics"
  | "Medicine"
  | "Philosophy"
  | "Physics"
  | "Psychology"
  | "Visual Art";

export interface KnowledgeSource {
  id: string;
  title: string;
  authors?: string[];
  publisher?: string;
  publicationYear?: number;
  url?: string;
  sourceType: SourceType;
  note?: string;
}

export interface Epigraph {
  text: string;
  attribution?: string;
}
export interface PersonLocation {
  place: string;
  lat: number;
  lng: number;
  startYear: number;
  // Omit on a person's final/only location entry to mean "until death" —
  // avoids redundantly restating a year already implied by the node's
  // own endYear.
  endYear?: number;
  confidence?: number;
}

export interface KnowledgeNode {
  id: string;
  name: string;
  type: NodeType;
  description: string;
  startYear?: number;
  endYear?: number;
  // Marks startYear/endYear as scholarly estimates rather than precisely
  // documented dates — display code should render these with a "c." prefix.
  startYearApprox?: boolean;
  endYearApprox?: boolean;
  // For entities with no fixed end (e.g. a field of study still active
  // today): omit endYear and set this instead. Anywhere the app needs a
  // concrete numeric "effective end year" for computation, it should
  // resolve this to the current calendar year at runtime rather than
  // relying on a stored value that goes stale — see
  // src/utils/getEffectiveEndYear.ts.
  isOngoing?: boolean;
  importance?: number;
  disciplines?: Discipline[];
  tags?: string[];
  epigraph?: Epigraph;
  // Fixed single location — institutions and technologies only (they
  // don't move). People use `locations` below instead, since most moved
  // at least once over a documented career.
  lat?: number;
  lng?: number;
  // Person nodes only. Ordered chronologically. A node with no
  // `locations` (and no lat/lng) simply doesn't render on the map — an
  // honest gap for disputed/undocumented figures (e.g. Laozi, Sushruta)
  // rather than a fabricated placement.
  locations?: PersonLocation[];
}

export interface KnowledgeEdge {
  id: string;
  source: string;
  target: string;
  relationship: RelationshipType;
  description?: string;
  confidence?: number;
  directness?: RelationshipDirectness;
  evidenceType?: EvidenceType;
  sourceIds?: string[];
}

export interface KnowledgeGraphData {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  sources: KnowledgeSource[];
}

export interface KnowledgeGraph {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
}

export interface GraphNode extends KnowledgeNode {
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number;
  fy?: number;
}

export interface GraphLink
  extends Omit<KnowledgeEdge, "source" | "target"> {
  source: string | GraphNode;
  target: string | GraphNode;
}

export interface ForceGraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}