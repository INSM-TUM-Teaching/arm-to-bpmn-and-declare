// Maps Declare constraints to Cytoscape edge class combinations
import cytoscape from 'cytoscape';

// Function to generate one or more Cytoscape edges based on constraint type
// Each edge is styled using class names that map to edgeStyle.ts definitions
export function getConstraintEdges(constraint: string, source: string, target: string, index: number): cytoscape.ElementDefinition[] {
    const normalized = constraint.toLowerCase().replace(/[\s-]/g, '_');
    const idPrefix = `${source}->${target}-${normalized}-${index}`;

    switch (normalized) {
        case 'succession':
            return [
                {
                    data: { id: `${idPrefix}-triangle`, source, target },
                    classes: 'line-single compound-arrow-triangle'
                },
                {
                    data: { id: `${idPrefix}-circle`, source, target },
                    classes: 'line-single source-circle compound-arrow-circle'
                }
            ];
        case 'precedence':
            return [
                {
                    data: { id: `${idPrefix}-circle`, source, target },
                    classes: 'line-single compound-arrow-circle'
                },
                {
                    data: { id: `${idPrefix}-triangle`, source, target },
                    classes: 'line-single compound-arrow-triangle'
                }
            ];
        case 'response':
            return [
                {
                    data: { id: `${idPrefix}`, source, target },
                    classes: 'line-single source-circle-target-triangle'
                }
            ];
        case 'neg_precedence':
            return [
                {
                    data: { id: `${idPrefix}-circle`, source, target },
                    classes: 'line-negative compound-arrow-circle'
                },
                {
                    data: { id: `${idPrefix}-triangle`, source, target },
                    classes: 'line-negative compound-arrow-triangle'
                }
            ];
        case 'neg_response':
            return [
                {
                    data: { id: `${idPrefix}`, source, target },
                    classes: 'line-negative source-circle-target-triangle'
                }
            ];
        case 'not_coexistence':
            return [
                {
                    data: { id: `${idPrefix}`, source, target },
                    classes: 'line-negative both-circle'
                }
            ];
        case 'resp_absence':
            return [
                {
                    data: { id: `${idPrefix}`, source, target },
                    classes: 'line-negative source-circle'
                }
            ];
        case 'coexistence':
            return [
                {
                    data: { id: `${idPrefix}`, source, target },
                    classes: 'line-single both-circle'
                }
            ];
        case 'chain_succession':
            return [
                {
                    data: { id: `${idPrefix}-1`, source, target },
                    classes: 'line-triple-1'
                },
                {
                    data: { id: `${idPrefix}-2`, source, target },
                    classes: 'line-triple-2 source-circle compound-arrow-circle'
                },
                {
                    data: { id: `${idPrefix}-2`, source, target },
                    classes: 'line-triple-2 compound-arrow-triangle'
                },
                {
                    data: { id: `${idPrefix}-3`, source, target },
                    classes: 'line-triple-3'
                }
            ];
        case 'chain_response':
            return [
                {
                    data: { id: `${idPrefix}-1`, source, target },
                    classes: 'line-triple-1'
                },
                {
                    data: { id: `${idPrefix}-2`, source, target },
                    classes: 'line-triple-2 source-circle-target-triangle'
                },
                {
                    data: { id: `${idPrefix}-3`, source, target },
                    classes: 'line-triple-3'
                }
            ];
        case 'chain_precedence':
            return [
                {
                    data: { id: `${idPrefix}-1`, source, target },
                    classes: 'line-triple-1'
                },
                {
                    data: { id: `${idPrefix}-2`, source, target },
                    classes: 'line-triple-2 compound-arrow-circle'
                },
                {
                    data: { id: `${idPrefix}-2`, source, target },
                    classes: 'line-triple-2 compound-arrow-triangle'
                },
                {
                    data: { id: `${idPrefix}-3`, source, target },
                    classes: 'line-triple-3'
                }
            ];
        case 'resp_existence':
            return [
                {
                    data: { id: `${idPrefix}`, source, target },
                    classes: 'line-single source-circle'
                }
            ];
        case 'choice':
            return [
                {
                    data: { id: `${idPrefix}`, source, target },
                    classes: 'line-choice'
                }
            ];
        default:
            return [
                {
                    data: { id: `${idPrefix}`, source, target, label: normalized },
                    classes: 'line-single'
                }
            ];
    }
}
