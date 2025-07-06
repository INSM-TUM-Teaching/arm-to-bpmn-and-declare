// AdvancedGatewayStrategy.ts
import type { GatewayGroupingStrategy } from './StrategyTypes';
import  type { Analysis } from '../buildBPMN';

//  * AdvancedGatewayStrategy
//  * -----------------------
//  * Splits a node’s direct successors into groups that dictate which BPMN
//  * gateway should be used:
//  *   • ‘exclusive’ → XOR  (mutually exclusive group)
//  *   • ‘parallel’  → AND  (fully parallel group)
//  *
//  * It detects mutually-exclusive successors first; any remaining successors
//  * are treated as parallel.  Returned structure:
//  *
//  *   [
//  *     { type: 'exclusive', targets: ['B', 'C'] },
//  *     { type: 'parallel',  targets: ['D']       }
//  *   ]
//  *
//  * If `null` is returned, caller should fall back to legacy logic.
//  * (Inclusive/OR gateways can be added later by extending this strategy.)

export class AdvancedGatewayStrategy implements GatewayGroupingStrategy {
  groupSuccessors(
    node: string,
    directTargets: string[],
    analysis: Analysis
  ): Array<{ type: 'exclusive' | 'parallel', targets: string[] }> | null {
    const { exclusiveRelations, parallelRelations } = analysis;

    const groups: Array<{ type: 'exclusive' | 'parallel', targets: string[] }> = [];
    const assigned = new Set<string>();

    const isExclusive = (a: string, b: string) =>
      exclusiveRelations.some(([x, y]) => (x === a && y === b) || (x === b && y === a));

    const isParallel = (a: string, b: string) =>
      parallelRelations.some(([x, y]) => (x === a && y === b) || (x === b && y === a));

    // Step 1: Find mutually exclusive groups (XOR)
    for (let i = 0; i < directTargets.length; i++) {
      const a = directTargets[i];
      if (assigned.has(a)) continue;

      const exclusiveGroup = [a];
      for (let j = i + 1; j < directTargets.length; j++) {
        const b = directTargets[j];
        if (!assigned.has(b) && isExclusive(a, b)) {
          exclusiveGroup.push(b);
        }
      }

      if (exclusiveGroup.length > 1) {
        groups.push({ type: 'exclusive', targets: exclusiveGroup });
        exclusiveGroup.forEach(t => assigned.add(t));
      }
    }

    // Step 2: Group remaining targets as parallel (AND)
    const remaining = directTargets.filter(t => !assigned.has(t));
    if (remaining.length > 0) {
      groups.push({ type: 'parallel', targets: remaining });
    }

    return groups.length > 0 ? groups : null;
  }
}
