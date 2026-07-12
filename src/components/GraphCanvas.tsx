import { useMemo } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { sampleGraph } from "../data/sampleGraph";
import type {
  ForceGraphData,
  GraphLink,
  GraphNode,
} from "../types/graph";

function GraphCanvas() {
  const graphData = useMemo<ForceGraphData>(
    () => ({
      nodes: sampleGraph.nodes.map((node) => ({ ...node })),
      links: sampleGraph.edges.map((edge) => ({ ...edge })),
    }),
    [],
  );

  return (
    <section className="canvas">
      <div className="graph-toolbar">
        <div>
          <p className="eyebrow">Prototype dataset</p>
          <h2>Knowledge Graph</h2>
        </div>

        <div className="graph-stats">
          <span>{graphData.nodes.length} nodes</span>
          <span>{graphData.links.length} relationships</span>
        </div>
      </div>

      <div className="force-graph-container">
        <ForceGraph2D<GraphNode, GraphLink>
          graphData={graphData}
          nodeId="id"
          nodeLabel={(node: GraphNode) =>
            `${node.name} · ${node.type}`
          }
          linkSource="source"
          linkTarget="target"
          backgroundColor="#181818"
          linkColor={() => "rgba(220, 220, 220, 0.65)"}
          linkWidth={2}
          linkDirectionalArrowLength={5}
          linkDirectionalArrowRelPos={1}
        />
      </div>
    </section>
  );
}

export default GraphCanvas;