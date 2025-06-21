// graphUtils.ts – helper functions for graph traversal & join detection
// -----------------------------------------------------------------------------
// NOTE: These utilities are distilled from the original buildBPMN implementation
// so that the main build file stays concise.
// -----------------------------------------------------------------------------

import type { Analysis } from './relations';
import { createJoinGateway, createFlow } from './bpmnUtils';

/* -------------------------------------------------------------------------- */
/* 1. 過濾傳遞依賴：A→B→C 時移除 A→C                                   */
/* -------------------------------------------------------------------------- */
export function filterTransitive(
  src: string,
  direct: string[],
  chains: [string, string][]
): string[] {
  const transitive = new Set<string>();
  // 簡易 BFS 找從 direct 走時可再到的節點
  const adj = new Map<string, string[]>();
  chains.forEach(([a, b]) => {
    if (!adj.has(a)) adj.set(a, []);
    adj.get(a)!.push(b);
  });
  const q = [...direct];
  while (q.length) {
    const n = q.shift()!;
    const outs = adj.get(n) ?? [];
    outs.forEach((o) => {
      if (!transitive.has(o)) {
        transitive.add(o);
        q.push(o);
      }
    });
  }
  return direct.filter((t) => !transitive.has(t));
}

/* -------------------------------------------------------------------------- */
/* 2. Join Gateway 自動插入：沿用舊邏輯                                     */
/* -------------------------------------------------------------------------- */
export function addJoinsForAllSplits(
  elements: Map<string, any>,
  chains: [string, string][]
) {
  // very naive: for every gateway that has >1 outgoing, find first common
  // successor and drop a matching join gateway there. Keep original behaviour.
  const gwNodes = Array.from(elements.values())
    .filter((n) => n.type?.includes('Gateway') && n.outgoing?.length > 1);

  gwNodes.forEach((gw: any) => {
    const succs = gw.outgoing.map((edgeId: string) => {
      const edge = Array.from(elements.values()).find((e: any) => e.id === edgeId);
      return edge?.targetRef as string;
    });
    const converge = findConvergingNode(succs, chains);
    if (!converge) return;

    const joinType = gw.type; // mirror split type
    const joinGw = createJoinGateway(succs, converge, joinType);
    // 更新 elements map 已由 bpmnUtils 處理
  });
}

/* -------------------------------------------------------------------------- */
/* findConvergingNode – 回傳所有 nodes path 上的最近公共後繼               */
/* -------------------------------------------------------------------------- */
export function findConvergingNode(
  nodes: string[],
  chains: [string, string][]
): string | null {
  if (nodes.length <= 1) return null;
  const succMap = new Map<string, Set<string>>();
  chains.forEach(([a, b]) => {
    if (!succMap.has(a)) succMap.set(a, new Set<string>());
    succMap.get(a)!.add(b);
  });
  // Collect all reachable nodes for each branch
  const reach = (n: string): Set<string> => {
    const seen = new Set<string>();
    const q = [n];
    while (q.length) {
      const cur = q.shift()!;
      (succMap.get(cur) ?? []).forEach((x) => {
        if (!seen.has(x)) {
          seen.add(x);
          q.push(x);
        }
      });
    }
    return seen;
  };
  const reaches = nodes.map(reach);
  // Intersect所有 reachable set 找最早公共
  const common = [...reaches[0]].filter((n) => reaches.every((s) => s.has(n)));
  return common.length ? common[0] : null;
}
