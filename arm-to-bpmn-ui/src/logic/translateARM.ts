export type Relation = "<" | "<d" | ">" | ">d" | "-" | "x";
export type Existential = "⇔" | "⇎" | "⇒" | "⇐" | "x";

export interface ARMMatrix {
  [source: string]: {
    [target: string]: [Relation, Existential];
  };
}

/**
 * stableTopoSort:
 * Performs a topological sort based on strict temporal relations (< and <d).
 * Returns an array of layers, each containing nodes that can execute in parallel.
 */
export function stableTopoSort(matrix: ARMMatrix): string[][] {
  const graph: Record<string, Set<string>> = {};
  const inDegree: Record<string, number> = {};

  // Step 1: Build dependency graph and in-degree map
  for (const from in matrix) {
    if (!graph[from]) graph[from] = new Set();

    for (const to in matrix[from]) {
      const [temporal] = matrix[from][to];

      if (temporal === "<" || temporal === "<d") {
        graph[from].add(to);
        inDegree[to] = (inDegree[to] || 0) + 1;
      }
    }

    if (!(from in inDegree)) {
      inDegree[from] = inDegree[from] || 0;
    }
  }

  // Step 2: Layered Topological Sort
  const layers: string[][] = [];
  let layer: string[] = Object.entries(inDegree)
    .filter(([_, deg]) => deg === 0)
    .map(([key]) => key);

  while (layer.length > 0) {
    layers.push([...layer]);
    const nextLayer: string[] = [];

    for (const node of layer) {
      if (!graph[node]) continue;

      for (const neighbor of graph[node]) {
        inDegree[neighbor]--;
        if (inDegree[neighbor] === 0) {
          nextLayer.push(neighbor);
        }
      }
    }

    layer = nextLayer;
  }

  return layers;
}
