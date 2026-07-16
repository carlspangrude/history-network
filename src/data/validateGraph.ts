import type {
  KnowledgeGraphData,
  KnowledgeNode,
  NodeType,
  RelationshipType,
} from "../types/graph";

const VALID_NODE_TYPES = new Set<NodeType>([
  "person",
  "idea",
  "discovery",
  "invention",
  "publication",
  "theory",
  "institution",
  "event",
  "place",
  "discipline",
  "technology",
]);

const VALID_RELATIONSHIP_TYPES = new Set<RelationshipType>([
  "influenced",
  "inspired",
  "mentored",
  "collaborated_with",
  "authored",
  "published",
  "discovered",
  "invented",
  "enabled",
  "criticized",
  "refined",
  "formalized",
  "improved",
  "founded",
  "belonged_to",
  "responded_to",
  "popularized",
]);

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function validateNode(
  node: KnowledgeNode,
  nodeIndex: number,
  errors: string[],
) {
  const label = `Node at index ${nodeIndex}`;

  if (!isNonEmptyString(node.id)) {
    errors.push(`${label} must have a non-empty id.`);
  }

  if (!isNonEmptyString(node.name)) {
    errors.push(`${label} must have a non-empty name.`);
  }

  if (!isNonEmptyString(node.description)) {
    errors.push(`${label} must have a non-empty description.`);
  }

  if (!VALID_NODE_TYPES.has(node.type)) {
    errors.push(
      `${label} "${node.id}" has unsupported type "${node.type}".`,
    );
  }

  if (
    node.importance !== undefined &&
    (!Number.isFinite(node.importance) ||
      node.importance < 1 ||
      node.importance > 10)
  ) {
    errors.push(
      `${label} "${node.id}" must have importance between 1 and 10.`,
    );
  }

  if (
    node.startYear !== undefined &&
    !Number.isInteger(node.startYear)
  ) {
    errors.push(`${label} "${node.id}" has an invalid startYear.`);
  }

  if (
    node.endYear !== undefined &&
    !Number.isInteger(node.endYear)
  ) {
    errors.push(`${label} "${node.id}" has an invalid endYear.`);
  }

  if (node.startYear === 0) {
    errors.push(
      `${label} "${node.id}" cannot use 0 as startYear because the BCE/CE calendar has no year zero.`,
    );
  }
  
  if (node.endYear === 0) {
    errors.push(
      `${label} "${node.id}" cannot use 0 as endYear because the BCE/CE calendar has no year zero.`,
    );
  }
  
  if (
    node.startYear !== undefined &&
    node.endYear !== undefined &&
    node.endYear < node.startYear
  ) {
    errors.push(
      `${label} "${node.id}" has an endYear before its startYear.`,
    );
  }
}

export function validateKnowledgeGraph(
  graph: KnowledgeGraphData,
): KnowledgeGraphData {
  const errors: string[] = [];

  if (!Array.isArray(graph.nodes)) {
    errors.push('Graph property "nodes" must be an array.');
  }

  if (!Array.isArray(graph.edges)) {
    errors.push('Graph property "edges" must be an array.');
  }

  if (errors.length > 0) {
    throw new Error(
      `Knowledge graph validation failed:\n- ${errors.join("\n- ")}`,
    );
  }

  const nodeIds = new Set<string>();
  const edgeIds = new Set<string>();

  graph.nodes.forEach((node, nodeIndex) => {
    validateNode(node, nodeIndex, errors);

    if (nodeIds.has(node.id)) {
      errors.push(`Duplicate node id "${node.id}".`);
    }

    nodeIds.add(node.id);
  });

  graph.edges.forEach((edge, edgeIndex) => {
    const label = `Edge at index ${edgeIndex}`;

    if (!isNonEmptyString(edge.id)) {
      errors.push(`${label} must have a non-empty id.`);
    }

    if (edgeIds.has(edge.id)) {
      errors.push(`Duplicate edge id "${edge.id}".`);
    }

    edgeIds.add(edge.id);

    if (!isNonEmptyString(edge.source)) {
      errors.push(`${label} "${edge.id}" must have a source.`);
    } else if (!nodeIds.has(edge.source)) {
      errors.push(
        `${label} "${edge.id}" references missing source node "${edge.source}".`,
      );
    }

    if (!isNonEmptyString(edge.target)) {
      errors.push(`${label} "${edge.id}" must have a target.`);
    } else if (!nodeIds.has(edge.target)) {
      errors.push(
        `${label} "${edge.id}" references missing target node "${edge.target}".`,
      );
    }

    if (!VALID_RELATIONSHIP_TYPES.has(edge.relationship)) {
      errors.push(
        `${label} "${edge.id}" has unsupported relationship "${edge.relationship}".`,
      );
    }

    if (
      edge.confidence !== undefined &&
      (!Number.isFinite(edge.confidence) ||
        edge.confidence < 0 ||
        edge.confidence > 1)
    ) {
      errors.push(
        `${label} "${edge.id}" must have confidence between 0 and 1.`,
      );
    }
  });

  if (errors.length > 0) {
    throw new Error(
      `Knowledge graph validation failed:\n- ${errors.join("\n- ")}`,
    );
  }

  return graph;
}