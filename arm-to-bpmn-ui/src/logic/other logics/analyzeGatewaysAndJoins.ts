/**
 * analyzeGatewaysAndJoins
 *
 * This function analyzes a process model (given as an Analysis object) and computes:
 *   - Node levels (distance from the start node)
 *   - Gateway groupings (splits and their grouped successors)
 *   - Join stack (merge points for branches, including gateway and leaf joins)
 *
 * Algorithm steps:
 * 1. Compute activity levels for all nodes.
 * 2. Ensure a 'start' node exists and connect it to all level-0 nodes.
 * 3. Use LayerAwareGatewayStrategy to group successors for each split node.
 * 4. Build a mapping from gateway IDs to semantic IDs (e.g., 'parallel', 'or').
 * 5. Build a mapping from each node to its parent gateway.
 * 6. Identify all leaf nodes (nodes without successors).
 * 7. Construct the join stack:
 *    - For each gateway, create a join entry for its grouped branches.
 *    - For each leaf node not already part of a gateway group, create a join entry.
 * 8. Sort the join stack by level (FILO order).
 *
 * # Input
 * - analysis: An object with at least the following fields:
 *   - activities: string[]; // All node names
 *   - temporalChains: [string, string][]; // Fallback edges if directDependencies is empty
 *   - directDependencies: [string, string][]; // Edges between nodes
 *   - (other fields may be present and are passed to the grouping strategy)
 *
 * # Output
 * Returns an object:
 * {
 *   joinStack: Array<{
 *     note: string[];      // Branch nodes to be joined
 *     target: string;      // The node to connect after merging
 *     gateway: string;     // Gateway id
 *     gatewayType: string; // Gateway type ('parallel', 'exclusive', 'or', or '')
 *     order: number;       // Level/order for sorting (higher = closer to end)
 *   }>,
 *   levels: Record<string, number>; // Node name to level mapping
 *   gatewayGroups: Record<string, Array<{ type: string; targets: string[] }>>;
 * }
 *
 * This is used for BPMN/Declare translation and visualization.
 */

import { AdvancedLevelStrategy } from './AdvancedLevelStrategy';
import { LayerAwareGatewayStrategy } from './LayerAwareGatewayStrategy';

interface Analysis {
  activities: string[];
  temporalChains: [string, string][];
  directDependencies: [string, string][];
  // Other fields...
}

interface GatewayGroup {
  type: string; // 'parallel' | 'exclusive' | 'or'
  targets: string[];
}

interface JoinStackItem {
  note: string[];         // Branch nodes
  target: string;         // The node to connect after merging
  gateway: string;        // Gateway id
  gatewayType: string;    // Gateway type
  order: number;          // Insertion order
}

export function analyzeGatewaysAndJoins(analysis: Analysis) {
  const nodes = [...analysis.activities];
  const edges: [string, string][] = analysis.directDependencies.length
    ? [...analysis.directDependencies]
    : [...analysis.temporalChains];

  // Add start node and edges if not present
  const levels = new AdvancedLevelStrategy().computeLevels(nodes, edges);
  const level0Nodes = nodes.filter(n => levels[n] === 0);

  if (!nodes.includes('start')) nodes.unshift('start');
  level0Nodes.forEach(n => {
    if (!edges.some(([from, to]) => from === 'start' && to === n)) {
      edges.push(['start', n]);
    }
  });

  // Gateway groupings
  const gatewayStrategy = new LayerAwareGatewayStrategy();
  const allSplitNodes = new Set([
    ...nodes,
    ...edges.map(([from]) => from)
  ]);
  const gatewayGroups: Record<string, GatewayGroup[]> = {};
  for (const n of allSplitNodes) {
    const succ = edges.filter(([from]) => from === n).map(([, to]) => to);
    const groups = gatewayStrategy.groupSuccessors(n, succ, {
      ...analysis,
      exclusiveRelations: (analysis as any).exclusiveRelations ?? [],
      parallelRelations: (analysis as any).parallelRelations ?? [],
      orRelations: (analysis as any).orRelations ?? [],
      activityLevels: levels,
    });
    if (groups?.length) gatewayGroups[n] = groups;
  }

  // 1. Generate mapping from gatewayId to semantic id
  const gatewayIdMap: Record<string, string> = {};
  Object.entries(gatewayGroups).forEach(([gatewayId, groups]) => {
    const type = groups[0].type;
    if (type === 'or') gatewayIdMap[gatewayId] = 'or';
    else if (type === 'parallel') gatewayIdMap[gatewayId] = 'parallel';
    else gatewayIdMap[gatewayId] = gatewayId;
  });

  // 2. Build mapping from node to parent gateway
  const nodeToParentGateway: Record<string, string> = {};
  Object.entries(gatewayGroups).forEach(([gwId, groups]) => {
    groups.forEach(group => {
      group.targets.forEach(target => {
        nodeToParentGateway[target] = gwId;
      });
    });
  });

  // 3. Find all leaf nodes (nodes without successors)
  const hasSuccessor = new Set(edges.map(([from]) => from));
  const leafNodes = nodes.filter(n => !hasSuccessor.has(n));

  // 4. Build join stack
  const joinStack: JoinStackItem[] = [];

  // 4a. Handle gateway join
  Object.entries(gatewayGroups).forEach(([gatewayId, groups]) => {
    groups.forEach(group => {
      let target = 'end';
      const parent = nodeToParentGateway[gatewayId];
      if (parent) {
        target = gatewayIdMap[parent] || parent;
      }
      const order = Math.max(...group.targets.map(t => levels[t] || 0));
      joinStack.push({
        note: group.targets.map(t => gatewayIdMap[t] ? gatewayIdMap[t] : t), // semantic id conversion here
        target,
        gateway: gatewayIdMap[gatewayId] || gatewayId,
        gatewayType: group.type,
        order,
      });
    });
  });

  // 4b. Handle leaf join
  leafNodes.forEach(leaf => {
    const isInGateway = Object.values(gatewayGroups).some(groups =>
      groups.some(group => group.targets.includes(leaf))
    );
    if (!isInGateway) {
      const parent = nodeToParentGateway[leaf];
      joinStack.push({
        note: [leaf],
        target: parent ? (gatewayIdMap[parent] || parent) : 'end',
        gateway: leaf,
        gatewayType: '',
        order: levels[leaf] || 0,
      });
    }
  });

  // Sort join stack by order (level) descending (FILO)
  joinStack.sort((a, b) => b.order - a.order);

  return {
    joinStack,
    levels,
    gatewayGroups,
  };
}
