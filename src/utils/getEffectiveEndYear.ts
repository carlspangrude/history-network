import type { KnowledgeNode } from "../types/graph";

export function getEffectiveEndYear(
  node: Pick<KnowledgeNode, "endYear" | "isOngoing">,
): number | undefined {
  if (node.endYear !== undefined) {
    return node.endYear;
  }

  if (node.isOngoing) {
    return new Date().getFullYear();
  }

  return undefined;
}