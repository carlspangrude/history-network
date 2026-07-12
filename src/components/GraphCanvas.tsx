import { sampleGraph } from "../data/sampleGraph";

function GraphCanvas() {
  return (
    <section className="canvas">
      <div className="graph-content">
        <div className="graph-heading">
          <div>
            <p className="eyebrow">Prototype dataset</p>
            <h2>Knowledge Graph</h2>
          </div>

          <div className="graph-stats">
            <span>{sampleGraph.nodes.length} nodes</span>
            <span>{sampleGraph.edges.length} relationships</span>
          </div>
        </div>

        <div className="node-grid">
          {sampleGraph.nodes.map((node) => (
            <article className="node-card" key={node.id}>
              <span className={`node-type node-type-${node.type}`}>
                {node.type}
              </span>

              <h3>{node.name}</h3>

              {(node.startYear || node.endYear) && (
                <p className="node-years">
                  {node.startYear ?? "Unknown"}
                  {node.endYear ? `–${node.endYear}` : ""}
                </p>
              )}

              <p>{node.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default GraphCanvas;