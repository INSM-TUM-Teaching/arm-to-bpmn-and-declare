import React, { useEffect, useRef, useState } from "react";
import cytoscape from "cytoscape";
import edgeStyles from "./edgeStyle";
import { getConstraintEdges } from "./constraintMap";
import { DeclareModel } from "../types/types";


/**
 * A React functional component that visualizes a Declare model using Cytoscape.js.
 *
 * Features:
 * - Loads a Declare model JSON file from the public directory.
 * - Renders activities as nodes and constraints as styled edges.
 * - Adds visual markers for special constraints (e.g., "init", "chain_precedence").
 * - Automatically positions nodes using a directed breadth-first layout.
 * - Allows the user to download the Declare model as JSON or export the graph as PNG.
 *
 * @component
 */
const DeclareVisualizer: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null); //where Cytoscape draw the Declare Model
  const cyRef = useRef<cytoscape.Core | null>(null);  //instance of the Cytoscape
  const [declareModel, setDeclareModel] = useState<DeclareModel | null>(null);  //JSON data model




  /**
   * useEffect: Fetch Declare model JSON file from public directory on component mount.
   * Shows an alert if loading fails.
   */
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








  /**
   * useEffect: When Declare model is loaded, initialize and render the Cytoscape graph.
   * Handles node creation, constraint edges, "init" markers, and layout.
   */
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




    // Render nodes from Declare activities(Map each activity to a visual node)
    const nodes = declareModel.activities.map(act => ({
      data: { id: act, label: act }
    }));




    //Holds the "init" nodes that will be created visually.
    const initNodes: cytoscape.ElementDefinition[] = [];  
    //It holds the arrows (edges) going from the “init” node to the activity.
    const initEdges: cytoscape.ElementDefinition[] = [];  




    // Add "init" constraint nodes and their outgoing edges
    if ("unary" in declareModel) {
      //It only takes those whose constraint === "init" (meaning this activity is the beginning of the process)
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


/*
    ////////////////Limitation of Cytoscape///////////////////
    // Add invisible "shadow" nodes for visual adjustment in chained constraints((i.e. a_left, a_right))
    const shadowNodes: cytoscape.ElementDefinition[] = [];
    declareModel.constraints.forEach((c, i) => {
      if (c.constraint === "chain_precedence") {
        shadowNodes.push(
          { data: { id: `${c.target}_left` }, classes: "shadow-node" },
          { data: { id: `${c.target}_right` }, classes: "shadow-node" }
        );
      }
    });
*/


    // Add all node elements
    cy.add([...nodes, ...initNodes]);




    // Generate and add edges for Declare constraints
    const edges = declareModel.constraints.flatMap((c, i) =>
      getConstraintEdges(c.constraint, c.source, c.target, i)
    );
    cy.add([...edges, ...initEdges]);


    ////////////////Limitation of Cytoscape///////////////////
    // Add all elements (nodes + edges) to Cytoscape graph
    //cy.add([...nodes, ...shadowNodes, ...edges, ...initNodes, ...initEdges]);




    // Run layout for automatic node positioning
    cy.layout({ name: "breadthfirst", directed: true, padding: 10 }).run();




    ////////////////Limitation of Cytoscape///////////////////
    // Position shadow nodes (if any exist)
    //cy.nodes().forEach(node => {
      //if (node.id().includes("shadow1")) {
        //const target = cy.getElementById(node.id().replace(/-shadow1-.*/, ""));
        //const pos = target.position();
        //node.position({ x: pos.x - 20, y: pos.y });
      //}
      //if (node.id().includes("shadow2")) {
        //const target = cy.getElementById(node.id().replace(/-shadow2-.*/, ""));
        //const pos = target.position();
        //node.position({ x: pos.x + 20, y: pos.y });
      //}
   //);
 
    ////////////////////////////////////////////////////////////////


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