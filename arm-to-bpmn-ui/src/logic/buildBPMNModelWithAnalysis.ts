// Import topological sorting and relation detection utilities from translateARM module
import { kahnTopo } from './translateARM'; // adjust path if needed
import {
  extractTemporalChains,
  detectExclusiveRelations,
  detectParallelRelations,
  detectOptionalDependencies,
  extractDirectTemporal,
  detectOrRelations,
} from './translateARM';

import type { ARMMatrix } from './translateARM';

/**
 * Analyzes an ARM (Activity Relationship Matrix) and prepares a structured
 * representation to support BPMN model generation.
 * 
 * The function extracts:
 * - Temporal chains (strict ordering)
 * - Topological order of nodes
 * - Index map (node => position)
 * - Exclusive relations (mutual exclusion)
 * - Parallel relations (independent flows with common target)
 * - Optional relations (inclusive/existential conditions)
 * 
 * @param matrix - ARMMatrix representing temporal and existential relations
 * @returns An object containing analysis results used in BPMN generation
 */


export function buildBPMNModelWithAnalysis(matrix: ARMMatrix) {
  // Extract list of all activity nodes
  const nodes = Object.keys(matrix);

  // Identify temporal chains (e.g. a < b)
  const chains = extractTemporalChains(matrix);

  // Compute a topological order of nodes based on strict temporal dependencies
  const topoOrder = kahnTopo(nodes, chains);

  // Map each activity to its index in the topological order
  const indexMap = new Map(topoOrder.map((v, i) => [v, i]));

  // Identify exclusive, parallel, and optional relationships
  const exclusive = detectExclusiveRelations(matrix);
  const parallel = detectParallelRelations(matrix);
  const optional = detectOptionalDependencies(matrix);

  const orRelations = detectOrRelations(matrix);
  const directChains = extractDirectTemporal(matrix);

  // Return all computed relations and orderings for downstream use
  // Include both the original names and the Analysis-compatible names
  return {
    // Original property names for backward compatibility
    chains,
    topoOrder,
    indexMap,
    exclusive,
    parallel,
    directChains,
    optional,
    orRelations,
    
    // Analysis-compatible property names
    activities: topoOrder,
    temporalChains: chains,
    exclusiveRelations: exclusive,
    parallelRelations: parallel,
    optionalDependencies: optional,
    directDependencies: directChains,
  };
}
