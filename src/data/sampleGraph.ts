import rawSampleGraph from "./sampleGraph.json";
import { validateKnowledgeGraph } from "./validateGraph";
import type { KnowledgeGraphData } from "../types/graph";

console.log("Running graph validation");

export const sampleGraph = validateKnowledgeGraph(
  rawSampleGraph as KnowledgeGraphData,
);