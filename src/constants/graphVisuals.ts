import type { NodeType } from "../types/graph";

export const MOVEMENT_NODE_OUTLINE_COLOR = "#f4f006";

export const NODE_TYPE_COLORS: Record<NodeType, string> = {
  person: "#6ea8fe",
  idea: "#d38cff",
  discovery: "#65d6a6",
  invention: "#ff9f68",
  publication: "#e3b466",
  theory: "#aa89e8",
  institution: "#67c7d4",
  event: "#f18484",
  place: "#8bc981",
  discipline: "#c7c7c7",
  technology: "#ffcc66",
  movement: "#f4f006",
};

export const NODE_TYPE_LABELS: Record<NodeType, string> = {
  person: "Person",
  idea: "Idea",
  discovery: "Discovery",
  invention: "Invention",
  publication: "Publication",
  theory: "Theory",
  institution: "Institution",
  event: "Event",
  place: "Place",
  discipline: "Discipline",
  technology: "Technology",
  movement: "Movement",
};

export const FILTERABLE_NODE_TYPES: NodeType[] = [
  "discovery",
  "institution",
  "invention",
  "person",
  "publication",
  "theory",
  "movement",
];