import React, { useEffect, useRef, useState } from "react";
import cytoscape from "cytoscape";
import edgeStyles from "./edgeStyle";
import { getConstraintEdges } from "./constraintMap";
import { DeclareModel } from "../types/types";

const DeclareVisualizer: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const [declareModel, setDeclareModel] = useState<DeclareModel | null>(null);

  // Fetch Declare model JSON file from the public directory
  useEffect(() => {
    fetch("/declareModels/temp/declareModel.json")
      .then(res => {
        if (!res.ok) throw new Error("File not found or server error");
        return res.json();
      })
      .then((data: DeclareModel) => {
        console.log("Loaded Declare model:", data);
        setDeclareModel(data);
      })
      .catch(err => {
        console.error("Failed to load Declare model:", err);
        alert("Failed to load Declare model. Make sure the file exists and the server is running.");
      });
  }, []);

  // When Declare model is loaded, initialize Cytoscape graph
  useEffect(() => {
    if (!containerRef.current || !declareModel || !Array.isArray(declareModel.activities)) return;

    const cy = cytoscape({
      container: containerRef.current,
      elements: [],
      style: [
        {
          selector: 'node',
          style: {
            label: 'data(label)',
            'text-valign': 'center',
            'text-halign': 'center',
            width: 80,
            height: 40,
            shape: 'roundrectangle',
            'background-color': '#f0f0f0',
            'border-width': 1.5,
            'border-color': '#333',
            'font-size': 12,
            'font-weight': 'bold'
          }
        },
        ...edgeStyles
      ]
    });
    cyRef.current = cy;

    // Render nodes from Declare activities
    const nodes = declareModel.activities.map(act => ({
      data: { id: act, label: act }
    }));

    const initNodes: cytoscape.ElementDefinition[] = [];
    const initEdges: cytoscape.ElementDefinition[] = [];

    if ("unary" in declareModel) {
      declareModel.unary.forEach((u, idx) => {
        if (u.constraint === "init") {
          const initNodeId = `init-${u.activity}`;
          // Create visual init node
          initNodes.push({
            data: { id: initNodeId, label: "init" },
            position: { x: 0, y: 0 },
            classes: "init-node"
          });
          // Create edge from init node to target activity
          initEdges.push({
            data: {
              id: `edge-init-${u.activity}`,
              source: initNodeId,
              target: u.activity,
              constraint: "init"
            }
          });
        }
      });
    }

    // Generate styled edges from Declare binary constraints
    const edges = declareModel.constraints.flatMap((c, i) =>
      getConstraintEdges(c.constraint, c.source, c.target, i)
    );

    // Add all elements (nodes + edges) to Cytoscape graph
    cy.add([...nodes, ...edges, ...initNodes, ...initEdges]);

    // Run layout for automatic node positioning
    cy.layout({ name: "breadthfirst", directed: true, padding: 10 }).run();

    // Position "init" nodes to the upper-left of their target
    cy.nodes(".init-node").forEach(n => {
      const target = cy.getElementById(n.id().replace("init-", ""));
      const pos = target.position();
      n.position({ x: pos.x - 30, y: pos.y - 40 });
    });

    return () => cy.destroy();
  }, [declareModel]);

  return (
    <div>
      <h2 className="text-center my-4 text-xl font-semibold">Declare Model Visualization</h2>
      <div className="flex justify-center gap-4 mb-4">
        <button
          onClick={() => {
            if (declareModel) {
              const blob = new Blob([JSON.stringify(declareModel, null, 2)], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "declareModel.json";
              a.click();
              URL.revokeObjectURL(url);
            }
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Download JSON
        </button>

        <button
          onClick={() => {
            if (cyRef.current) {
              const png = cyRef.current.png({ full: true });
              const a = document.createElement("a");
              a.href = png;
              a.download = "declareModel_graph.png";
              a.click();
            }
          }}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Download PNG
        </button>
      </div>
      <div ref={containerRef} style={{ width: "100%", height: "700px", border: "1px solid #ccc" }} />
    </div>
  );
};


export default DeclareVisualizer;
