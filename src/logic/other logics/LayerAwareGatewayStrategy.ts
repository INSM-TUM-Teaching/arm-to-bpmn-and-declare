// LayerAwareGatewayStrategy.ts
import { GatewayGroupingStrategy } from './StrategyTypes';
import { Analysis } from '../buildBPMN';

export class LayerAwareGatewayStrategy implements GatewayGroupingStrategy {
  groupSuccessors(
    node: string,
    directTargets: string[],
    analysis: Analysis
  ): Array<{ type: 'exclusive' | 'parallel' | 'or'; targets: string[] }> | null {
    console.log('[LayerAware] groupSuccessors called for', node, directTargets, analysis.activityLevels);
    if (!analysis.activityLevels)
      throw new Error('activityLevels missing – compute levels first');

    // Get the minimum level from directTargets to find nodes at the same layer
    const targetLevels = directTargets.map(t => analysis.activityLevels?.[t] ?? 0);
    const minLevel = Math.min(...targetLevels);
    const sameLayer = directTargets.filter(
      t => (analysis.activityLevels?.[t] ?? 0) === minLevel
    );
    if (sameLayer.length <= 1) return null;

    // Grouping criteria: all nodes in the same group have the same relationship with each other
    const groups: Array<{ type: 'exclusive' | 'parallel' | 'or'; targets: string[] }> = [];
    const assigned = new Set<string>();

    const { exclusiveRelations, parallelRelations, orRelations } = analysis;

    const getRelation = (a: string, b: string): 'exclusive' | 'parallel' | 'or' | null => {
      if (exclusiveRelations.some(([x, y]) => (x === a && y === b) || (x === b && y === a)))
        return 'exclusive';
      if (parallelRelations.some(([x, y]) => (x === a && y === b) || (x === b && y === a)))
        return 'parallel';
      if ((orRelations ?? []).some(([x, y]) => (x === a && y === b) || (x === b && y === a)))
        return 'or';
      return null;
    };

    // Group based on relationships
    for (let i = 0; i < sameLayer.length; i++) {
      const a = sameLayer[i];
      if (assigned.has(a)) continue;

      // Find nodes that have the same relationship with node 'a'
      let groupType: 'exclusive' | 'parallel' | 'or' | null = null;
      const group = [a];

      for (let j = 0; j < sameLayer.length; j++) {
        if (i === j) continue;
        const b = sameLayer[j];
        if (assigned.has(b)) continue;
        const rel = getRelation(a, b);
        if (!rel) continue;
        if (!groupType) {
          groupType = rel;
          group.push(b);
        } else if (rel === groupType) {
          group.push(b);
        }
      }

      // Only group if there are more than two nodes with consistent relationships
      if (group.length > 1 && groupType) {
        groups.push({ type: groupType, targets: group });
        group.forEach(t => assigned.add(t));
      }
    }

    // Remaining nodes not assigned to any group are placed in a parallel group
    const rest = sameLayer.filter(x => !assigned.has(x));
    if (rest.length > 1) {
      groups.push({ type: 'parallel', targets: rest });
    }

    console.log('node:', node, 'sameLayer:', sameLayer, 'groups:', groups);

    return groups.length > 0 ? groups : null;
  }
}
