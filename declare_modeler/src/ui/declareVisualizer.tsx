import React, { useEffect, useRef } from "react";
import cytoscape from "cytoscape";
import declareModel from "../data/declareObjects/declare_model.json";

const DeclareVisualizer: React.FC = () => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const cyRef = useRef<cytoscape.Core | null>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        const cy = cytoscape({
            container: containerRef.current,
            elements: [],
            style: [
                {
                    selector: "node",
                    style: {
                        shape: "rectangle",
                        width: "90",
                        height: "40",
                        label: "data(label)",
                        "text-valign": "center",
                        "text-halign": "center",
                        "font-size": 25,
                        "background-color": "#f9fafb",
                        "z-index": 10,
                        color: "#111",
                        "border-width": 1,
                        "border-color": "#333",
                        "font-weight": "bold",
                        "text-outline-width": 0
                    }
                },
                {
                    selector: "edge",
                    style: {
                        width: 2,
                        "line-color": "#333",
                        "target-arrow-color": "#333",
                        "source-arrow-color": "#333",
                        "curve-style": "straight",
                    }
                },
                {
                    selector: "edge[constraint='response']",
                    style: {
                        "source-arrow-shape": "circle",
                        "target-arrow-shape": "triangle"
                    }
                },
                {
                    selector: "edge[constraint='chain response']",
                    style: {
                        "source-arrow-shape": "circle",
                        "target-arrow-shape": "triangle"
                    }
                },
                {
                    selector: "edge[constraint='responded existence']",
                    style: {
                        "source-arrow-shape": "circle",
                        "target-arrow-shape": "none"
                    }
                },
                {
                    selector: "edge[constraint='not co-existence']",
                    style: {
                        "source-arrow-shape": "circle",
                        "target-arrow-shape": "circle",
                        label: "║",
                        "text-rotation": "autorotate",
                        "text-valign": "center",
                        "text-halign": "center"
                    }
                },
                {
                    selector: "edge[constraint = 'succession-triangle']",
                    style: {
                        "curve-style": "straight",
                        "edge-distances": "node-position",
                        "target-arrow-shape": "triangle",
                        "target-arrow-color": "#333",
                        "line-color": "#333",
                        "arrow-scale": 1.3,
                    },
                },
                {
                    selector: "edge[constraint = 'succession-circle']",
                    style: {
                        "curve-style": "straight",
                        "edge-distances": "node-position",
                        "source-arrow-shape": "circle",
                        "source-arrow-color": "#333",
                        "target-arrow-shape": "circle",
                        "target-arrow-color": "#333",
                        "line-color": "#333",
                        "arrow-scale": 1.0,
                    },
                },
                {
                    selector: "edge[constraint = 'precedence-triangle']",
                    style: {
                        "curve-style": "straight",
                        "edge-distances": "node-position",
                        "target-arrow-shape": "triangle",
                        "target-arrow-color": "#333",
                        "line-color": "#333",
                        "arrow-scale": 1.3,
                    },
                },
                {
                    selector: "edge[constraint = 'precedence-circle']",
                    style: {
                        "curve-style": "straight",
                        "edge-distances": "node-position",
                        "target-arrow-shape": "circle",
                        "target-arrow-color": "#333",
                        "line-color": "#333",
                        "arrow-scale": 1.0,
                    },
                },
                {
                    selector: "edge[constraint = 'not-succession-triangle']",
                    style: {
                        "curve-style": "straight",
                        "edge-distances": "node-position",
                        "target-arrow-shape": "triangle",
                        "target-arrow-color": "#333",
                        "line-color": "#333",
                        "arrow-scale": 1.3,
                    },
                },
                {
                    selector: "edge[constraint = 'not-succession-circle']",
                    style: {
                        "curve-style": "straight",
                        "edge-distances": "node-position",
                        "source-arrow-shape": "circle",
                        "source-arrow-color": "#333",
                        "target-arrow-shape": "circle",
                        "target-arrow-color": "#333",
                        "line-color": "#333",
                        "arrow-scale": 1.0,
                        label: "║",
                        "text-valign": "center",
                        "text-halign": "center"
                    },
                },
                {
                    selector: ".init-node",
                    style: {
                        shape: "rectangle",
                        width: "60",
                        height: "40",
                        label: "data(label)",
                        "text-valign": "top",
                        "text-halign": "center",
                        "font-size": 20,
                        "border-color": "#333",
                        "z-index": 0,
                        "background-opacity": 1,
                        "opacity": 0.95
                    }
                },
                {
                    selector: "edge[constraint = 'init']",
                    style: {
                        "line-color": "#333",
                        "target-arrow-shape": "none",
                        "curve-style": "straight",
                        "line-style": "dashed",
                        width: 1.5
                    }
                }
            ]
        });
        cyRef.current = cy;

        // Add nodes
        const nodes = declareModel.activities.map((act) => ({
            data: { id: act, label: act }
        }));

        // Handle unary constraints like 'init'
        const initNodes: cytoscape.ElementDefinition[] = [];
        const initEdges: cytoscape.ElementDefinition[] = [];

        if ("unary" in declareModel) {
            declareModel.unary.forEach((u, index) => {
                if (u.constraint === "init") {
                    const pseudoId = `init-${u.activity}`;
                    initNodes.push({
                        data: { id: pseudoId, label: "init" },
                        position: { x: 0, y: 0 }, // will be auto-adjusted later
                        classes: "init-node"
                    });
                    initEdges.push({
                        data: {
                            id: `edge-init-${u.activity}`,
                            source: pseudoId,
                            target: u.activity,
                            constraint: "init"
                        }
                    });
                }
            });
        }

        // Add edges
        const edges = declareModel.constraints.flatMap((c, i) => {
            const baseEdge = {
                data: {
                    id: `e${i}`,
                    source: c.source,
                    target: c.target,
                    constraint: c.constraint.toLowerCase()
                }
            };

            switch (c.constraint) {
                case "precedence":
                    return [
                        {
                            data: {
                                id: `${c.source}->${c.target}-precedence-triangle-${i}`,
                                source: c.source,
                                target: c.target,
                                constraint: "precedence-triangle",
                            },
                        },
                        {
                            data: {
                                id: `${c.source}->${c.target}-precedence-circle-${i}`,
                                source: c.source,
                                target: c.target,
                                constraint: "precedence-circle",
                            },
                        },
                    ];

                case "succession":
                    return [
                        {
                            data: {
                                id: `${c.source}->${c.target}-succession-triangle-${i}`,
                                source: c.source,
                                target: c.target,
                                constraint: "succession-triangle",
                            },
                        },
                        {
                            data: {
                                id: `${c.source}->${c.target}-succession-circle-${i}`,
                                source: c.source,
                                target: c.target,
                                constraint: "succession-circle",
                            },
                        },
                    ];

                case "not-succession":
                    return [
                        {
                            data: {
                                id: `${c.source}->${c.target}-not-succession-triangle-${i}`,
                                source: c.source,
                                target: c.target,
                                constraint: "not-succession-triangle",
                            },
                        },
                        {
                            data: {
                                id: `${c.source}->${c.target}-not-succession-circle-${i}`,
                                source: c.source,
                                target: c.target,
                                constraint: "not-succession-circle",
                            },
                        },
                    ];

                default:
                    return [baseEdge];
            }
        });

        cy.add([...nodes, ...edges, ...initNodes, ...initEdges]);

        // Layout (sorted by connectivity)
        cy.layout({
            name: "breadthfirst",
            directed: true,
            padding: 10
        }).run();

        cy.nodes(".init-node").forEach((n) => {
            const target = cy.getElementById(n.id().replace("init-", ""));
            const pos = target.position();
            n.position({
                x: pos.x - 30,
                y: pos.y - 20
            });
        });


        return () => {
            cy.destroy();
        };
    }, []);

    return (
        <div>
            <h2 style={{ textAlign: "center", margin: "12px 0" }}>Declare Model Visualization</h2>
            <div ref={containerRef} style={{ width: "100%", height: "700px", border: "1px solid #ccc" }}></div>
            <div style={{ marginTop: "10px", display: "flex", justifyContent: "center", gap: "12px" }}>
                <button
                    onClick={() => {
                        if (!cyRef.current) return;

                        const cy = cyRef.current;

                        const activities = cy.nodes().filter(n => !n.hasClass("init-node")).map(node => ({
                            name: node.data('label'),
                            position: node.position()
                        }));

                        const constraints = cy.edges().filter(e => !e.data('constraint')?.startsWith("init")).map(edge => ({
                            source: edge.source().data('label'),
                            target: edge.target().data('label'),
                            constraint: edge.data('constraint')
                        }));

                        const unary = cy.edges().filter(e => e.data('constraint') === "init").map(edge => ({
                            activity: edge.target().data('label'),
                            constraint: "init"
                        }));

                        const declareModelWithLayout = {
                            activities,
                            constraints,
                            unary
                        };

                        const blob = new Blob(
                            [JSON.stringify(declareModelWithLayout, null, 2)],
                            { type: "application/json" }
                        );
                        const a = document.createElement("a");
                        a.href = URL.createObjectURL(blob);
                        a.download = "declare_model.json";
                        a.click();
                    }}
                    className="px-4 py-2 bg-blue-700 text-white rounded hover:bg-blue-600"
                >
                    Download JSON
                </button>


                <button
                    onClick={() => {
                        let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<model>\n`;
                        declareModel.activities.forEach(act => {
                            xml += `  <activity>${act}</activity>\n`;
                        });
                        declareModel.constraints.forEach(c => {
                            xml += `  <constraint type="${c.constraint}">\n    <source>${c.source}</source>\n    <target>${c.target}</target>\n  </constraint>\n`;
                        });
                        if ("unary" in declareModel) {
                            declareModel.unary.forEach(c => {
                                xml += `  <constraint type="${c.constraint}">\n    <activity>${c.activity}</activity>\n  </constraint>\n`;
                            });
                        }
                        xml += `</model>`;
                        const blob = new Blob([xml], { type: "application/xml" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = "declare_model.decl";
                        a.click();
                        URL.revokeObjectURL(url);
                    }}
                    className="px-4 py-2 bg-blue-800 text-white rounded hover:bg-blue-700"
                >
                    Download XML (.decl)
                </button>

                <button
                    onClick={() => {
                        const cyEl = cyRef.current;
                        if (cyEl) {
                            const pngData = cyEl.png({
                                full: true,
                                scale: 2,
                                bg: "#ffffff"  // set background to white
                            });
                            const a = document.createElement("a");
                            a.href = pngData;
                            a.download = "declare_model.png";
                            a.click();
                        }
                    }}
                    className="px-4 py-2 bg-green-700 text-white rounded hover:bg-green-600"
                >
                    Save as Image
                </button>

            </div>
        </div>
    );

};

export default DeclareVisualizer;
