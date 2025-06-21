import type { RelationMaps } from '../relations';

/* ------ Template Method + Chain-of-Responsibility ------ */
export interface GatewayHandler {
  setNext(h: GatewayHandler): GatewayHandler;
  handle(targets: string[], rel: RelationMaps): string | null;
}

export abstract class AbstractGatewayStrategy implements GatewayHandler {
  private nextHandler: GatewayHandler | null = null;

  setNext(h: GatewayHandler): GatewayHandler {
    this.nextHandler = h;
    return h;
  }

  handle(targets: string[], rel: RelationMaps): string | null {
    if (targets.length <= 1) return this.next(targets, rel);

    // ★ 兩層迴圈統一寫在父類
    for (let i = 0; i < targets.length; i++) {
      for (let j = i + 1; j < targets.length; j++) {
        if (!this.pairwiseCheck(targets[i], targets[j], rel)) {
          return this.next(targets, rel);
        }
      }
    }
    return this.type;        // 全符合
  }

  private next(t: string[], r: RelationMaps): string | null {
    return this.nextHandler ? this.nextHandler.handle(t, r) : null;
  }

  /* ---- 子類要實作 ---- */
  protected abstract readonly type: string;
  protected abstract pairwiseCheck(
    a: string,
    b: string,
    rel: RelationMaps
  ): boolean;
}

/* ---------- 具體策略 ---------- */
const key = (x: string, y: string) => (x < y ? `${x}|${y}` : `${y}|${x}`);

export class XORStrategy extends AbstractGatewayStrategy {
  protected readonly type = 'XOR';
  protected pairwiseCheck(a: string, b: string, rel: RelationMaps) {
    return rel.exclusive.has(key(a, b));
  }
}

export class ANDStrategy extends AbstractGatewayStrategy {
  protected readonly type = 'AND';
  protected pairwiseCheck(a: string, b: string, rel: RelationMaps) {
    return rel.parallel.has(key(a, b));
  }
}

/* 示意：OR = 排他與平行混合時才算 OR */
export class ORStrategy extends AbstractGatewayStrategy {
  protected readonly type = 'OR';
  protected pairwiseCheck(a: string, b: string, rel: RelationMaps) {
    const k = key(a, b);
    return !rel.exclusive.has(k) && !rel.parallel.has(k);
  }
}
