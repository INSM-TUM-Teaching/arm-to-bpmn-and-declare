// buildBPMN.ts – adjusted to rely on bpmnUtils' module‑level maps
// -----------------------------------------------------------------------------
import { layoutProcess } from 'bpmn-auto-layout';
import type { RelationMaps, GatewayGroup, Analysis } from '../types/relations';
import { computeActivityLevels } from './activityLevels';
import { groupTargetsByGateway } from './gateway/grouper';
import {
  ensureTaskNode,
  createGateway,
  createSplitGateway,
  createFlow,
  resetBpmnMaps,
  serializeProcess,
  addStartAndEndEvents
} from './bpmnUtils';
import { filterTransitive, addJoinsForAllSplits } from './graphUtils';

const pairSet = (pairs: [string, string][]) =>
  new Set(pairs.map(([a, b]) => (a < b ? `${a}|${b}` : `${b}|${a}`)));

export async function buildBPMN(analysis: Analysis): Promise<string> {
  // 🔄 重新初始化全域 BPMN maps
  resetBpmnMaps();

  /* 1️⃣ 層級 */
  const levels =
    analysis.activityLevels ??
    computeActivityLevels(analysis.topoOrder ?? [], analysis.temporalChains);

  /* 2️⃣ 建立活動 Task */
  analysis.activities.forEach((a) => ensureTaskNode(a));

  /* 3️⃣ Start / 多起點 */
  const { startId, endId } = addStartAndEndEvents();
  const level0 = analysis.activities.filter((a) => levels.get(a) === 0);
  if (level0.length === 1) {
    createFlow(startId, level0[0]);
  } else if (level0.length > 1) {
    const andStart = createGateway('parallelGateway', 'AND_Start');
    createFlow(startId, andStart);
    level0.forEach((a) => createFlow(andStart, a));
  }

  /* 4️⃣ 主要迴圈 */
  const handled = new Set<string>();
  const relMaps: RelationMaps = {
    exclusive: pairSet(analysis.exclusiveRelations),
    parallel: pairSet(analysis.parallelRelations)
  };

  for (const src of analysis.activities) {
    const direct = analysis.directDependencies
      .filter(([f]) => f === src)
      .map(([, t]) => t);

    if (!direct.length) continue;

    const filtered = filterTransitive(src, direct, analysis.temporalChains)
      .filter((t) => !handled.has(`${src}|${t}`));

    if (!filtered.length) continue;

    const { groups, fallback } = groupTargetsByGateway(filtered, relMaps);

    if (!groups.length) {
      fallback.forEach((t) => {
        createFlow(src, t);
        handled.add(`${src}|${t}`);
      });
      continue;
    }

    if (groups.length === 1 && !fallback.length) {
      buildGatewayBranch(src, groups[0]);
    } else {
      const andSplit = createSplitGateway(src, [], 'parallelGateway');
      groups.forEach((g) => buildGatewayBranch(andSplit, g));
      fallback.forEach((t) => createFlow(andSplit, t));
    }

    [...groups.flatMap((g) => g.targets), ...fallback]
      .forEach((t) => handled.add(`${src}|${t}`));
  }

  /* 5️⃣ Join */
  addJoinsForAllSplits(analysis.temporalChains);

  /* 6️⃣ 多終點 */
  const lastLv = Math.max(...levels.values());
  const tails = analysis.activities.filter((a) =>
    levels.get(a) === lastLv &&
    !analysis.directDependencies.some(([f]) => f === a)
  );
  if (tails.length === 1) {
    createFlow(tails[0], endId);
  } else if (tails.length > 1) {
    const andJoin = createGateway('parallelGateway', 'AND_End');
    tails.forEach((a) => createFlow(a, andJoin));
    createFlow(andJoin, endId);
  }

  /* 7️⃣ XML */
  const xmlRaw = serializeProcess();
  return layoutProcess(xmlRaw);
}

function buildGatewayBranch(from: string, g: GatewayGroup) {
  if (g.targets.length === 1) {
    createFlow(from, g.targets[0]);
    return;
  }
  const gwType =
    g.type === 'XOR' ? 'exclusiveGateway' :
    g.type === 'AND' ? 'parallelGateway' :
    'inclusiveGateway';
  const gw = createSplitGateway(from, [], gwType);
  g.targets.forEach((t) => createFlow(gw, t));
}
