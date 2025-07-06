// Define possible types of temporal and existential relations
export type TemporalRelation = "<" | "<d" | ">" | ">d" | "-" | "x";
export type ExistentialRelation = "⇔" | "⇎" | "⇒" | "⇐" | "∨" | "¬∧" | "-" | "x";

// Define the structure of an ARM matrix:
// Each key is an activity, mapping to other activities with a [TemporalRelation, ExistentialRelation] tuple
export type ARMMatrix = Record<string, Record<string, [TemporalRelation, ExistentialRelation]>>;


// Perform topological sorting using Kahn's algorithm.
// V: list of nodes
// E: list of directed edges [from, to]
// cmp: optional comparator for sorting the zero-indegree nodes
// Throws an error if a cycle is detected.

export function kahnTopo<V extends string | number>(
  V: V[],
  E: Array<[V, V]>,
  cmp?: (a: V, b: V) => number
): V[] {
  const adj = new Map<V, V[]>(), indeg = new Map<V, number>();

  // Initialize adjacency list and indegree count
  V.forEach(v => {
    adj.set(v, []);
    indeg.set(v, 0);
  });

  // Populate edges and compute indegrees
  for (const [u, v] of E) {
    adj.get(u)!.push(v);
    indeg.set(v, (indeg.get(v) ?? 0) + 1);
  }

  // Queue of zero-indegree nodes, optionally sorted
  const queue: V[] = V
    .filter(v => indeg.get(v) === 0)
    .sort(cmp ?? ((a, b) => (a < b ? -1 : 1)));

  const out: V[] = [];

  while (queue.length) {
    const u = queue.shift()!;
    out.push(u);

    for (const v of adj.get(u)!) {
      indeg.set(v, indeg.get(v)! - 1);

      if (indeg.get(v) === 0) {
        const i = queue.findIndex(x => (cmp ?? ((a, b) => (a < b ? -1 : 1)))(v, x) < 0);
        if (i === -1) queue.push(v);
        else queue.splice(i, 0, v);
      }
    }
  }

  // If not all nodes are visited, there's a cycle
  if (out.length !== V.length) {
    throw new Error('Cycle detected: temporal relations are inconsistent');
  }

  return out;
}


// Extract direct temporal chains from the ARM matrix.
// Includes relations where one activity strictly precedes another: '<' or '<d'.

export function extractTemporalChains(matrix: ARMMatrix): Array<[string, string]> {
  const chains: Array<[string, string]> = [];
  for (const from in matrix) {
    for (const to in matrix[from]) {
      const [temp] = matrix[from][to];
      if (temp === "<" || temp === "<d") {
        chains.push([from, to]);
      }
    }
  }
  return chains;
}

// Detect exclusive relationships between activities.
// Looks for existential relations that imply exclusivity: ⇎, ∨, ¬

export function detectExclusiveRelations(matrix: ARMMatrix): Array<[string, string]> {
  const exclusives: Array<[string, string]> = [];
  const keys = Object.keys(matrix);

  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      const a = keys[i];
      const b = keys[j];
      const exist = matrix[a]?.[b]?.[1] || matrix[b]?.[a]?.[1];
      // if (["⇎", "∨", "¬"].includes(exist)) {
      if (["⇎", "¬"].includes(exist)) {
        exclusives.push([a, b]);
      }
    }
  }

  return exclusives;
}


// Detects parallel activity pairs from the ARM matrix.
// Two activities are considered parallel if:
// - Both have no direct temporal dependency on each other (both directions are "-")
// - They are not exclusive or logically constrained
// - They have a common predecessor or successor (indicating they can split/merge)

export function detectParallelRelations(matrix: ARMMatrix): Array<[string, string]> {
  const parallelPairs: Array<[string, string]> = [];
  const activities = Object.keys(matrix);

  for (let i = 0; i < activities.length; i++) {
    for (let j = i + 1; j < activities.length; j++) {
      const a = activities[i];
      const b = activities[j];

      // Extract relations between a and b
      const [ta, ea] = matrix[a]?.[b] ?? ["-", "-"];
      const [tb, eb] = matrix[b]?.[a] ?? ["-", "-"];

      // Check if both activities have no temporal dependency on each other
      const noTemporalDependency = ta === "-" && tb === "-";

      // Check if they are not exclusive
      const notExclusive = !["⇎", "∨", "¬"].includes(ea) && !["⇎", "∨", "¬"].includes(eb);

      if (noTemporalDependency && notExclusive) {
        // Check if they have common predecessors or successors (indicating split/merge pattern)
        const hasCommonPredecessor = activities.some(pred => {
          const predToA = matrix[pred]?.[a]?.[0];
          const predToB = matrix[pred]?.[b]?.[0];
          return (predToA === "<" || predToA === "<d") && (predToB === "<" || predToB === "<d");
        });

        const hasCommonSuccessor = activities.some(succ => {
          const aToSucc = matrix[a]?.[succ]?.[0];
          const bToSucc = matrix[b]?.[succ]?.[0];
          return (aToSucc === "<" || aToSucc === "<d") && (bToSucc === "<" || bToSucc === "<d");
        });

        // Only consider parallel if they have common predecessor or successor
        if (hasCommonPredecessor || hasCommonSuccessor) {
          parallelPairs.push([a, b]);
        }
      }
    }
  }

  return parallelPairs;
}


// Detect optional or inclusive dependencies in the ARM matrix.
// These include "⇒" (optional_to) and "⇐" (optional_from) relationships.

export function detectOptionalDependencies(matrix: ARMMatrix): Array<[string, string, "optional_to" | "optional_from"]> {
  const optionals: Array<[string, string, "optional_to" | "optional_from"]> = [];
  for (const a in matrix) {
    for (const b in matrix[a]) {
      const exist = matrix[a][b][1];
      if (exist === "⇒") optionals.push([a, b, "optional_to"]);
      if (exist === "⇐") optionals.push([a, b, "optional_from"]);
    }
  }
  return optionals;
}


export function extractDirectTemporal(matrix: ARMMatrix): Array<[string, string]> {
  const directTemporalChains: Array<[string, string]> = [];
  for (const from in matrix) {
    for (const to in matrix[from]) {
      const [temp] = matrix[from][to];
      if (temp === "<d") {
        directTemporalChains.push([from, to]);
      }
    }
  }
  return directTemporalChains;
}


// Detects OR (inclusive gateway) relations between activities.
// Two activities are OR-related if:
// - Existential relation is "∨"
// - Or both are optional from the same parent

export function detectOrRelations(matrix: ARMMatrix): Array<[string, string]> {
  const orPairs: Array<[string, string]> = [];
  const keys = Object.keys(matrix);

  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      const a = keys[i];
      const b = keys[j];

      const [_, existAB] = matrix[a]?.[b] ?? ["-", "-"];
      const [__, existBA] = matrix[b]?.[a] ?? ["-", "-"];

      if (existAB === "∨" || existBA === "∨") {
        orPairs.push([a, b]);
      }
    }
  }

  return orPairs;
}
