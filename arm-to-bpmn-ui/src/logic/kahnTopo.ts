// Topological order (Kahn 1962).
// V  : list of node IDs  (string | number)
// E  : array of directed edges  [u, v]   u -> v
// cmp: optional tie-breaker   (a,b) => a < b ? -1 : 1   */
export function kahnTopo<V extends string | number>(
  V: V[],
  E: Array<[V, V]>,
  cmp?: (a: V, b: V) => number
): V[] {
  // 1) build adjacency list + in-degree
  const adj = new Map<V, V[]>(), indeg = new Map<V, number>();
  V.forEach(v => { adj.set(v, []); indeg.set(v, 0); });
  for (const [u, v] of E) {
    adj.get(u)!.push(v);
    indeg.set(v, (indeg.get(v) ?? 0) + 1);
  }

  // 2) queue = all zero-in-degree nodes (stable order)
  const queue: V[] = V
    .filter(v => indeg.get(v) === 0)
    .sort(cmp ?? ((a, b) => (a < b ? -1 : 1)));

  // 3) pop → output → decrease neighbours
  const out: V[] = [];
  while (queue.length) {
    const u = queue.shift()!;
    out.push(u);
    for (const v of adj.get(u)!) {
      indeg.set(v, indeg.get(v)! - 1);
      if (indeg.get(v) === 0) {
        // keep overall order stable
        const i = queue.findIndex(x => (cmp ?? ((a, b) => (a < b ? -1 : 1)))(v, x) < 0);
        if (i === -1) queue.push(v); else queue.splice(i, 0, v);
      }
    }
  }

  // 4) cycle detection
  if (out.length !== V.length)
    throw new Error('Cycle detected: temporal relations are inconsistent');

  return out;             // e.g. ['a','c','b',…]
}
// If you prefer a library, graphlib
// or ts-graph both expose
// alg.topsort(), but the snippet above avoids any extra download.

// below is a simple example of how I

// would use the kahnTopo function in a BPMN context
// to order activities based on their precedence relations

// import { kahnTopo } from './kahnTopo';
// 0) collect precedence edges

// const edges: Array<[Act, Act]> = [];
// for (const a of V)
//   for (const b of V)
//     if (R[a][b].temp === "<d" || R[a][b].temp === "<")
//       edges.push([a, b]);

// // 1) stable topological order
// const order = kahnTopo(V, edges);          // e.g. ['a','c','b','d']
// const idx   = new Map(order.map((v,i)=>[v,i]));   // layer index

// …pass idx into BuildBPMN / MapToBPMN exactly as in the pseudo-code
