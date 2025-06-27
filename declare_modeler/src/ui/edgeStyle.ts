// Defines reusable Cytoscape.js styles for edges in a ConDec visualizer

import { Stylesheet } from 'cytoscape';

const edgeStyles: Stylesheet[] = [
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
            'width': 1,
            'line-style': 'solid',
        }
    },
    {
        selector: '.line-triple-2',
        style: {
            'width': 1,
            'line-style': 'solid',
        }
    },
    {
        selector: '.line-triple-3',
        style: {
            'width': 1,
            'line-style': 'solid',
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
