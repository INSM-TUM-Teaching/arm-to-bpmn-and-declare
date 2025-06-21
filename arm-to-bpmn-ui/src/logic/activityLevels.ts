// src/logic/activityLevels.ts

/**
 * Compute the topological level (layer) for each activity
 * based on temporal dependencies.
 *
 * @param topoOrder - Activities in topological sorted order
 * @param temporalChains - Array of [A, B] meaning A must come before B
 * @returns A map of activity ID -> level number (starting from 0)
 */
export function computeActivityLevels(
  topoOrder: string[],
  temporalChains: [string, string][]
): Map<string, number> {
  const levelMap = new Map<string, number>();

  // Initialize all levels to 0
  for (const activity of topoOrder) {
    levelMap.set(activity, 0);
  }

  // Build a quick lookup map from source to targets
  const outEdges = new Map<string, string[]>();
  for (const [from, to] of temporalChains) {
    if (!outEdges.has(from)) {
      outEdges.set(from, []);
    }
    outEdges.get(from)!.push(to);
  }

  // Traverse topoOrder and assign levels
  for (const activity of topoOrder) {
    const currentLevel = levelMap.get(activity) ?? 0;

    const targets = outEdges.get(activity) || [];
    for (const target of targets) {
      const prev = levelMap.get(target) ?? 0;
      const next = Math.max(prev, currentLevel + 1);
      levelMap.set(target, next);
    }
  }

  return levelMap;
}

// const topo = ['A', 'B', 'C', 'D', 'E'];
// const deps: [string, string][] = [
//   ['A', 'B'],
//   ['A', 'C'],
//   ['B', 'D'],
//   ['C', 'D'],
//   ['D', 'E']
// ];

// const levels = computeActivityLevels(topo, deps);
// console.log(Object.fromEntries(levels));
// // Output: { A: 0, B: 1, C: 1, D: 2, E: 3 }