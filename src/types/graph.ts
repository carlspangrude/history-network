export type NodeType =
  | "person"
  | "idea"
  | "discovery"
  | "invention"
  | "publication"
  | "theory"
  | "institution"
  | "event"
  | "place"
  | "discipline"
  | "technology";

export type RelationshipType =
  | "influenced"
  | "inspired"
  | "mentored"
  | "collaborated_with"
  | "authored"
  | "published"
  | "discovered"
  | "invented"
  | "enabled"
  | "criticized"
  | "refined"
  | "formalized";

export interface KnowledgeNode {
  id: string;
  name: string;
  type: NodeType;
  description: string;
  startYear?: number;
  endYear?: number;
  disciplines?: string[];
  tags?: string[];
}

export interface KnowledgeEdge {
  id: string;
  source: string;
  target: string;
  relationship: RelationshipType;
  description?: string;
  confidence?: number;
}

export interface KnowledgeGraph {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
}