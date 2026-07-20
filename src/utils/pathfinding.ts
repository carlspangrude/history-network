import type { ForceGraphData, GraphNode } from "../types/graph";

export interface DirectedPathResult {
  nodeIds: string[];
  linkIds: string[];
}

function getEndpointId(endpoint: string | GraphNode): string {
  return typeof endpoint === "string" ? endpoint : endpoint.id;
}

/**
 * Finds the shortest directed path from startId to endId, only following
 * edges in their stored source -> target direction (e.g. "influenced" must
 * be walked forward, not backward). Returns null if no directed path
 * exists within the given graph data.
 */
export function findDirectedPath(
  graphData: ForceGraphData,
  startId: string,
  endId: string,
): DirectedPathResult | null {
  if (startId === endId) {
    return { nodeIds: [startId], linkIds: [] };
  }

  const outgoingByNodeId = new Map<
    string,
    { neighborId: string; linkId: string }[]
  >();

  graphData.links.forEach((link) => {
    const sourceId = getEndpointId(link.source);
    const targetId = getEndpointId(link.target);

    const outgoing = outgoingByNodeId.get(sourceId) ?? [];
    outgoing.push({ neighborId: targetId, linkId: link.id });
    outgoingByNodeId.set(sourceId, outgoing);
  });

  const visited = new Set<string>([startId]);
  const queue: string[] = [startId];
  const cameFrom = new Map<string, { fromId: string; linkId: string }>();

  while (queue.length > 0) {
    const currentId = queue.shift() as string;

    if (currentId === endId) {
      const nodeIds: string[] = [endId];
      const linkIds: string[] = [];
      let cursor = endId;

      while (cursor !== startId) {
        const step = cameFrom.get(cursor);
        if (!step) break;

        linkIds.unshift(step.linkId);
        nodeIds.unshift(step.fromId);
        cursor = step.fromId;
      }

      return { nodeIds, linkIds };
    }

    const outgoing = outgoingByNodeId.get(currentId) ?? [];

    for (const { neighborId, linkId } of outgoing) {
      if (!visited.has(neighborId)) {
        visited.add(neighborId);
        cameFrom.set(neighborId, { fromId: currentId, linkId });
        queue.push(neighborId);
      }
    }
  }

  return null;
}
