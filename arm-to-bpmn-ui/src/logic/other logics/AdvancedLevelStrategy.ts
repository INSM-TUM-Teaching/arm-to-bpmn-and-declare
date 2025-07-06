// AdvancedLevelStrategy.ts
import type { LevelAssignmentStrategy } from './StrategyTypes';

/**
 * AdvancedLevelStrategy
 * ---------------------
 * Computes activity levels for a DAG produced from an ARM matrix.
 * • Level 0  – activities with no incoming dependency
 * • Level n+1 – activities whose predecessors are at most level n
 *
 * The result is a map:  { activityId → levelNumber }
 * This map is stored in `analysis.activityLevels` and can be used by
 * downstream logic (e.g., inserting AND gateways for level-0 activities).
 */
export class AdvancedLevelStrategy implements LevelAssignmentStrategy {
  computeLevels(nodes: string[], edges: [string, string][]): Record<string, number> {
    const inDegree = new Map<string, number>();
    const graph = new Map<string, string[]>();
    const levels = new Map<string, number>();

    // Initialize the graph and in-degree map
    for (const node of nodes) {
      inDegree.set(node, 0);
      graph.set(node, []);
    }

    // Build the graph
    for (const [from, to] of edges) {
      graph.get(from)!.push(to);
      inDegree.set(to, (inDegree.get(to) || 0) + 1);
    }

    // Start from all nodes with in-degree 0
    const queue: [string, number][] = [];

    for (const node of nodes) {
      if (inDegree.get(node) === 0) queue.push([node, 0]);
    }

    // Perform level-wise traversal (BFS)
    while (queue.length > 0) {
      const [curr, level] = queue.shift()!;
      levels.set(curr, Math.max(levels.get(curr) || 0, level));
      for (const next of graph.get(curr)!) {
        inDegree.set(next, inDegree.get(next)! - 1);
        if (inDegree.get(next) === 0) {
          queue.push([next, level + 1]);
        }
      }
    }

    // Assign level 0 to isolated nodes
    for (const node of nodes) {
      if (!levels.has(node)) levels.set(node, 0);
    }

    return Object.fromEntries(levels.entries());
  }
}
/*───────────────────────────────────────────────────────────────────
  Usage Guide (copy-friendly)
  ------------------------------------------------------------------
  import { AdvancedLevelStrategy }   from './AdvancedLevelStrategy';
  import { AdvancedGatewayStrategy } from './AdvancedGatewayStrategy';
  import { buildBPMNModelWithAnalysis } from './TranslateARM';
  import { buildBPMN } from './BuildBPMN';

  const analysis = buildBPMNModelWithAnalysis(
    armMatrix,
    new AdvancedLevelStrategy()        // ← inject level strategy
  );

  const bpmnXml = buildBPMN(
    analysis,
    new AdvancedGatewayStrategy()      // ← inject gateway strategy
  );

  // If you omit the second parameter, legacy/default behaviour is kept:
  //   buildBPMNModelWithAnalysis(matrix)  → DefaultLevelStrategy
  //   buildBPMN(analysis)                 → DefaultGatewayStrategy
───────────────────────────────────────────────────────────────────*/