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
export interface KnowledgeNode {
  id: string;
  name: string;
  type: NodeType;
  description: string;
  startYear?: number;
  endYear?: number;
  importance?: number;
  disciplines?: Discipline[];
  tags?: string[];
  epigraph?: Epigraph;
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