import type {
  EvidenceType,
  KnowledgeGraphData,
  KnowledgeNode,
  KnowledgeSource,
  NodeType,
  RelationshipType,
  SourceType,
  RelationshipDirectness,
} from "../types/graph";

const VALID_NODE_TYPES = new Set<NodeType>([
  "discipline",
  "discovery",
  "event",
  "idea",
  "institution",
  "invention",
  "movement",
  "person",
  "place",
  "publication",
  "technology",
  "theory",
]);

const VALID_RELATIONSHIP_TYPES = new Set<RelationshipType>([
  "advanced",
  "authored",
  "belonged_to",
  "challenged",
  "collaborated_with",
  "criticized",
  "discovered",
  "enabled",
  "extended",
  "formalized",
  "founded",
  "improved",
  "influenced",
  "inspired",
  "invented",
  "mentored",
  "popularized",
  "published",
  "refined",
  "responded_to",
  "synthesized",
]);

const VALID_RELATIONSHIP_DIRECTNESS = new Set<RelationshipDirectness>([
  "direct",
  "indirect",
  "summary",
]);

const VALID_EVIDENCE_TYPES = new Set<EvidenceType>([
  "primary_source",
  "secondary_source",
  "scholarly_consensus",
  "editorial_summary",
]);

const VALID_SOURCE_TYPES: SourceType[] = [
  "primary",
  "secondary",
  "reference",
  "web",
];

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

function validateSource(
  source: KnowledgeSource,
  sourceIndex: number,
  errors: string[],
): void {
  const location = `Source at index ${sourceIndex}`;

  if (!source.id || typeof source.id !== "string") {
    errors.push(`${location} must have a non-empty string ID.`);
  }

  if (!source.title || typeof source.title !== "string") {
    errors.push(
      `${location} "${source.id}" must have a non-empty title.`,
    );
  }

  if (
    !source.sourceType ||
    !VALID_SOURCE_TYPES.includes(source.sourceType)
  ) {
    errors.push(
      `${location} "${source.id}" has invalid sourceType ` +
        `"${String(source.sourceType)}".`,
    );
  }

  if (
    source.authors !== undefined &&
    (!Array.isArray(source.authors) ||
      source.authors.some(
        (author) =>
          typeof author !== "string" || author.trim().length === 0,
      ))
  ) {
    errors.push(
      `${location} "${source.id}" must have an authors array ` +
        `containing only non-empty strings.`,
    );
  }

  if (
    source.publisher !== undefined &&
    (typeof source.publisher !== "string" ||
      source.publisher.trim().length === 0)
  ) {
    errors.push(
      `${location} "${source.id}" has an invalid publisher.`,
    );
  }

  if (
    source.publicationYear !== undefined &&
    (!Number.isInteger(source.publicationYear) ||
      source.publicationYear === 0)
  ) {
    errors.push(
      `${location} "${source.id}" must have an integer publicationYear ` +
        `and may not use historical year zero.`,
    );
  }

  if (
    source.note !== undefined &&
    (typeof source.note !== "string" ||
      source.note.trim().length === 0)
  ) {
    errors.push(
      `${location} "${source.id}" has an invalid note.`,
    );
  }

  if (source.url !== undefined) {
    if (!isNonEmptyString(source.url)) {
      errors.push(
        `${location} "${source.id}" has an invalid URL.`,
      );
    } else {
      try {
        const parsedUrl = new URL(source.url);
  
        if (
          parsedUrl.protocol !== "http:" &&
          parsedUrl.protocol !== "https:"
        ) {
          errors.push(
            `${location} "${source.id}" must use an HTTP or HTTPS URL.`,
          );
        }
      } catch {
        errors.push(
          `${location} "${source.id}" must use a valid HTTP or HTTPS URL.`,
        );
      }
    }
  }
}

export function validateKnowledgeGraph(
  graph: KnowledgeGraphData,
): KnowledgeGraphData {

  if (!Array.isArray(graph.nodes)) {
    throw new Error('Graph property "nodes" must be an array.');
  }

  if (!Array.isArray(graph.edges)) {
    throw new Error('Graph property "edges" must be an array.');
  }

  if (!Array.isArray(graph.sources)) {
    throw new Error("Graph data must include a sources array.");
  }

  const errors: string[] = [];
  const nodeIds = new Set<string>();
  const edgeIds = new Set<string>();
  const sourceIds = new Set<string>();

  graph.nodes.forEach((node, nodeIndex) => {
    validateNode(node, nodeIndex, errors);

    if (nodeIds.has(node.id)) {
      errors.push(`Duplicate node id "${node.id}".`);
    }

    nodeIds.add(node.id);
  });

  graph.sources.forEach((source, index) => {
    validateSource(source, index, errors);

    if (sourceIds.has(source.id)) {
      errors.push(
        `Duplicate source ID found: "${source.id}".`,
      );
    }

    sourceIds.add(source.id);
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
  
    if (edge.sourceIds !== undefined) {
      if (!Array.isArray(edge.sourceIds)) {
        errors.push(
          `Edge "${edge.id}" must have a sourceIds array.`,
        );
      } else {
        const edgeSourceIds = new Set<string>();
  
        edge.sourceIds.forEach((sourceId) => {
          if (!isNonEmptyString(sourceId)) {
            errors.push(
              `Edge "${edge.id}" contains an invalid source ID.`,
            );
  
            return;
          }
  
          if (edgeSourceIds.has(sourceId)) {
            errors.push(
              `Edge "${edge.id}" references source "${sourceId}" more than once.`,
            );
          }
  
          if (!sourceIds.has(sourceId)) {
            errors.push(
              `Edge "${edge.id}" references missing source "${sourceId}".`,
            );
          }
  
          edgeSourceIds.add(sourceId);
        });
      }
    }
  
    if (!VALID_RELATIONSHIP_TYPES.has(edge.relationship)) {
      errors.push(
        `${label} "${edge.id}" has unsupported relationship "${edge.relationship}".`,
      );
    }
  
    if (
      edge.directness !== undefined &&
      !VALID_RELATIONSHIP_DIRECTNESS.has(edge.directness)
    ) {
      errors.push(
        `${label} "${edge.id}" has invalid directness "${edge.directness}".`,
      );
    }
  
    if (
      edge.evidenceType !== undefined &&
      !VALID_EVIDENCE_TYPES.has(edge.evidenceType)
    ) {
      errors.push(
        `${label} "${edge.id}" has invalid evidenceType "${edge.evidenceType}".`,
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