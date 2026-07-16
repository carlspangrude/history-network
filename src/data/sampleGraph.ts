import rawSampleGraph from "./sampleGraph.json";
import { validateKnowledgeGraph } from "./validateGraph";
import type { KnowledgeGraphData } from "../types/graph";

export const sampleGraph = validateKnowledgeGraph(
  rawSampleGraph as KnowledgeGraphData,
);