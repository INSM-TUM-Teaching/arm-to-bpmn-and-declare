// Defines reusable Cytoscape.js styles for edges in a ConDec visualizer

/**
 * An array of Cytoscape.js stylesheet objects that define the visual appearance of edges
 * in a Declare model visualizer.
 *
 * Includes:
 * - Base styles for all edges
 * - Arrowhead types (circle, triangle, compound)
 * - Custom styles for specific Declare constraints (e.g., succession, precedence)
 * - Multi-line edges for chained constraints
 * - Special visual indicators (e.g., negative constraint symbol ║, choice symbol ◇)
 *
 * These classes are assigned dynamically via edge class names returned from the
 * `getConstraintEdges` function.
 *
 * @type {Stylesheet[]}
 */
const edgeStyles: any[] = [
    // Default edge base style
    {
        selector: 'edge',
        style: {
            'width': 2,
            'line-color': '#666',
            'target-arrow-color': '#666',
            'source-arrow-color': '#666',
            'curve-style': 'bezier',
            'arrow-scale': 1.5,
            'label': 'data(label)',
            'text-background-color': '#fff',
            'text-background-opacity': 1,
            'text-background-shape': 'roundrectangle',
            'font-size': 12,
            'text-margin-y': -10,
        }
    },


    // === Arrowhead types ===
    {
        selector: '.source-circle',
        style: { 'source-arrow-shape': 'circle' }
    },
    {
        selector: '.target-circle',
        style: { 'target-arrow-shape': 'circle' }
    },
    {
        selector: '.target-triangle',
        style: { 'target-arrow-shape': 'triangle' }
    },
    {
        selector: '.both-circle',
        style: {
            'target-arrow-shape': 'circle',
            'source-arrow-shape': 'circle'
        }
    },
    {
        selector: '.source-circle-target-triangle',
        style: {
            'target-arrow-shape': 'triangle',
            'source-arrow-shape': 'circle',
        }
    },
   
    // Combined Triangle + Circle at Target (succession/precedence)
    // Simulated by overlaying two identical edges with different arrow types
    {
        selector: '.compound-arrow-triangle',
        style: {
            'target-arrow-shape': 'triangle',
            "arrow-scale": 2.2,
        }
    },
    {
        selector: '.compound-arrow-circle',
        style: {
            'target-arrow-shape': 'circle',
        }
    },

    // Precedence edge styles
    {
        selector: '.precedence-arrow',
        style: {
            'curve-style': 'bezier',
            'line-style': 'solid',
            'line-color': '#333',
            'target-arrow-shape': 'triangle',
            'target-arrow-color': '#333',
            'arrow-scale': 2.2,
            'width': 2
        }
    },
    {
        selector: '.precedence-circle-offset',
        style: {
            'curve-style': 'segments',
            'segment-distances': '0',
            'segment-weights': '0.5',
            'edge-distances': 'node-position',
            'line-color': '#333',
            'target-arrow-shape': 'circle',
            'target-arrow-color': '#333',
            'arrow-scale': 1.2,
            'width': 2,
            'line-style': 'solid'
        }
    },

    // Succession edge styles
    {
        selector: '.succession-main',
        style: {
            'curve-style': 'bezier',
            'line-style': 'solid',
            'line-color': '#333',
            'width': 2
        }
    },

    //  Circle at the end of the source
    {
        selector: '.succession-source-circle',
        style: {
            'curve-style': 'segments',
            'line-style': 'solid',
            'segment-distances': '0',
            'segment-weights': '0.1',
            'edge-distances': 'node-position',
            'line-color': 'transparent',
            'source-arrow-shape': 'circle',
            'source-arrow-color': '#333',
            'arrow-scale': 0.9,
            'width': 0.1
        }
    },

    // Triangle at the target end
    {
        selector: '.succession-target-triangle',
        style: {
            'curve-style': 'segments',
            'line-style': 'solid',
            'segment-distances': '0',
            'segment-weights': '0.9',
            'edge-distances': 'node-position',
            'line-color': 'transparent',
            'target-arrow-shape': 'triangle',
            'target-arrow-color': '#333',
            'arrow-scale': 1.8,
            'width': 0.1,
            'z-index': 20
        }
    },

    // Circle at the end of the Target (just behind the triangle)
    {
        selector: '.succession-target-circle',
        style: {
            'curve-style': 'segments',
            'line-style': 'solid',
            'segment-distances': '0',
            'segment-weights': '0.88',
            'edge-distances': 'node-position',
            'line-color': 'transparent',
            'target-arrow-shape': 'circle',
            'target-arrow-color': '#333',
            'arrow-scale': 0.9,
            'width': 0.1
        }
    },

    // === Line types ===
    {
        selector: '.line-single',
        style: {
            'line-style': 'solid'
        }
    },

    // Triple Line (for chain constraints)
    // Simulated by adding duplicate parallel edges via classes or manually duplicating edges
    {
        selector: '.line-triple-1',
        style: {
            'curve-style': 'segments',
            'segment-distances': '-15',
            'segment-weights': '0.5',
            'edge-distances': 'node-position',
            'line-style': 'solid',
            'width': 2
        }
    },
    {
        selector: '.line-triple-2',
        style: {
            'curve-style': 'segments',
            'segment-distances': '0',
            'segment-weights': '0.5',
            'edge-distances': 'node-position',
            'line-style': 'solid',
            'width': 2
        }
    },
    {
        selector: '.line-triple-3',
        style: {
           'curve-style': 'segments',
            'segment-distances': '15',
            'segment-weights': '0.5',
            'edge-distances': 'node-position',
            'line-style': 'solid',
            'width': 2
        }
    },
   
    // Negative constraint edge (║ symbol)
    {
        selector: '.line-negative',
        style: {
            'line-style': 'solid',
            'label': '║',
            'text-rotation': 'autorotate',
            'font-weight': 'bold',
            'font-size': 24,
            'text-margin-y': 0,
        }
    },

    // ◇ Choice Constraint (1 of 2)
    {
        selector: '.line-choice',
        style: {
            'line-style': 'solid',
            'label': '◇',
            'font-size': 36,
            'text-margin-y': 0,
            'font-family': 'monospace',
            'text-halign': 'center',
            'text-valign': 'center'
        }
    }
];


export default edgeStyles;