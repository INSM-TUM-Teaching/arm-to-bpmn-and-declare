import { AdvancedLevelStrategy } from './AdvancedLevelStrategy';
import { LayerAwareGatewayStrategy } from './LayerAwareGatewayStrategy';

export function analyzeGatewaysAndJoins(analysis: any) {
  // 1. 準備 nodes/edges/levels
  const nodes = analysis.activities.slice();
  const edges = analysis.directDependencies.length
    ? analysis.directDependencies.slice()
    : analysis.temporalChains.slice();

  // levels
  const levels = new AdvancedLevelStrategy().computeLevels(nodes, edges);

  // level 0 nodes
  const level0Nodes = nodes.filter(n => levels[n] === 0);
  if (!nodes.includes('start')) nodes.unshift('start');
  level0Nodes.forEach(n => {
    if (!edges.some(([from, to]) => from === 'start' && to === n)) {
      edges.push(['start', n]);
    }
  });

  // 2. Gateway stack (split gateways)
  const gatewayStrategy = new LayerAwareGatewayStrategy();
  const splitStack: any[] = [];
  for (const node of nodes) {
    const directTargets = edges
      .filter(([from]) => from === node)
      .map(([, to]) => to);
    const groups = gatewayStrategy.groupSuccessors(node, directTargets, {
      ...analysis,
      activityLevels: levels,
    });
    if (groups && groups.length > 0) {
      groups.forEach(g => {
        splitStack.push({
          node,
          type: g.type,
          targets: g.targets,
          layer: levels[node]
        });
      });
    }
  }

  // 3. Join points (multi-in, same layer)
  const inMap = new Map<string, string[]>();
  for (const [from, to] of edges) {
    if (!inMap.has(to)) inMap.set(to, []);
    inMap.get(to)!.push(from);
  }
  const joinPoints: { node: string, sources: string[], layer: number }[] = [];
  for (const [node, sources] of inMap.entries()) {
    if (sources.length > 1) {
      const sourceLayers = sources.map(s => levels[s]);
      if (sourceLayers.every(l => l === sourceLayers[0])) {
        joinPoints.push({ node, sources, layer: sourceLayers[0] });
      }
    }
  }

  // 4. End join (last layer)
  const maxLevel = Math.max(...Object.values(levels));
  const lastNodes = Object.entries(levels).filter(([n, l]) => l === maxLevel).map(([n]) => n);
  let endJoin = null;
  if (lastNodes.length > 1) {
    endJoin = { sources: lastNodes, target: 'end', layer: maxLevel };
  }

  // 5. Build FILO join stack
  const joinStack: Array<{ nodes: string[], target: string, gateway_type: string, layers: number }> = [];
  let joinCount = 1;

  // 處理 join points（多來源指向同一個 node）
  for (const jp of joinPoints) {
    let gateway_type = 'parallel';
    let split = null;
    if (splitStack.length > 0) {
      split = splitStack.pop();
      gateway_type = split.type;
    }
    joinStack.push({
      nodes: jp.sources,
      target: jp.node, // node 為 join 點
      gateway_type,
      layers: joinCount++
    });
  }

  // 處理 end join（最後一層多個 node 指向 end）
  if (endJoin) {
    let gateway_type = 'parallel';
    let split = null;
    if (splitStack.length > 0) {
      split = splitStack.pop();
      gateway_type = split.type;
    }
    joinStack.push({
      nodes: endJoin.sources, // 最後一層所有 node
      target: endJoin.target, // 'end'
      gateway_type,
      layers: joinCount++
    });
  }

  // 處理還沒被 join 的 split（例如流程中間直接 join 到 gateway）
  while (splitStack.length > 0) {
    const split = splitStack.pop();
    // target 設為下一個 gateway（用 split.targets.join(',')），或 'end'（如果已經沒有下一個 node）
    joinStack.push({
      nodes: [split.node],
      target: split.targets.length > 0 ? split.targets.join(',') : 'end',
      gateway_type: split.type,
      layers: joinCount++
    });
  }

  return {
    gatewayStack: joinStack,
    joinPoints,
    endJoins: endJoin ? [endJoin] : [],
    levels
  };
}