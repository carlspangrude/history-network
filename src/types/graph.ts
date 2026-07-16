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
  | "formalized"
  | "improved"
  | "founded"
  | "belonged_to"
  | "responded_to"
  | "popularized";

export interface KnowledgeNode {
  id: string;
  name: string;
  type: NodeType;
  description: string;
  startYear?: number;
  endYear?: number;
  importance?: number;
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

export interface KnowledgeGraphData {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
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