import type { NodeType } from "../types/graph";

export const MOVEMENT_NODE_OUTLINE_COLOR = "#fef501";
export const GRAPH_BACKGROUND_COLOR = "#181818";

export const NODE_TYPE_COLORS: Record<NodeType, string> = {
  person: "#6ea8fe",
  idea: "#d38cff",
  publication: "#e3b466",
  theory: "#aa89e8",
  event: "#f18484",
  place: "#8bc981",
  discipline: "#c7c7c7",
  technology: "#ffcc66",
  movement: "#181818",
};

export const NODE_TYPE_LABELS: Record<NodeType, string> = {
  person: "Person",
  idea: "Idea",
  publication: "Publication",
  theory: "Theory",
  event: "Event",
  place: "Place",
  discipline: "Discipline",
  technology: "Technology",
  movement: "Movement",
};

export const FILTERABLE_NODE_TYPES: NodeType[] = [
  "person",
  "publication",
  "theory",
  "movement",
];