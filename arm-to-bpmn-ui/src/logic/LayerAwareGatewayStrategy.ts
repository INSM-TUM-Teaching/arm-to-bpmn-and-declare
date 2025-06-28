// LayerAwareGatewayStrategy.ts
import { GatewayGroupingStrategy } from './StrategyTypes';
import { Analysis } from './TranslateARM';

export class LayerAwareGatewayStrategy implements GatewayGroupingStrategy {
  groupSuccessors(
    node: string,
    directTargets: string[],
    analysis: Analysis
  ): Array<{ type: 'exclusive' | 'parallel' | 'or'; targets: string[] }> | null {
    console.log('[LayerAware] groupSuccessors called for', node, directTargets, analysis.activityLevels);
    if (!analysis.activityLevels)
      throw new Error('activityLevels missing – compute levels first');

    // 取得 directTargets 中的最小 level，找出同一層
    const targetLevels = directTargets.map(t => analysis.activityLevels[t]);
    const minLevel = Math.min(...targetLevels);
    const sameLayer = directTargets.filter(
      t => analysis.activityLevels[t] === minLevel
    );
    if (sameLayer.length <= 1) return null;

    // 分群依據：同一群內所有 node 彼此之間的關係都一樣
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

    // 依據關係分群
    for (let i = 0; i < sameLayer.length; i++) {
      const a = sameLayer[i];
      if (assigned.has(a)) continue;

      // 找出與 a 有相同關係的 node
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

      // 若有兩個以上且關係一致才分群
      if (group.length > 1 && groupType) {
        groups.push({ type: groupType, targets: group });
        group.forEach(t => assigned.add(t));
      }
    }

    // 剩下沒分到 group 的 node，全部歸為 parallel group
    const rest = sameLayer.filter(x => !assigned.has(x));
    if (rest.length > 1) {
      groups.push({ type: 'parallel', targets: rest });
    }

    console.log('node:', node, 'sameLayer:', sameLayer, 'groups:', groups);

    return groups.length > 0 ? groups : null;
  }
}
