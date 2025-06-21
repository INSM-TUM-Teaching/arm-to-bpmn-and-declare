/* 共用型別定義 */

export interface RelationMaps {
  /** exclusive = A ⇎ B (互斥) */
  exclusive: Set<string>;
  /** parallel  = A - B  (可並行) */
  parallel:  Set<string>;
  // 若之後支援 OR / 包含式，可再新增其他集合
}

/* Gateway 組資訊 ── type 為字串即可，策略決定名稱 */
export interface GatewayGroup {
  type: string;       // 'XOR' | 'AND' | 'OR' | ...
  targets: string[];
}

export interface GatewayGroupingResult {
  groups: GatewayGroup[];
  fallback: string[];   // 無法自動判斷的目標
}

export interface Analysis {
  /* --- Core lists --------------------------------------------------------- */
  activities: string[];                              // all distinct activity IDs
  topoOrder?: string[];                              // topological sort (optional)

  /* --- Relationships ------------------------------------------------------ */
  temporalChains: [string, string][];                // A < B (eventual or direct)
  directDependencies: [string, string][];            // A <d B (direct only)
  exclusiveRelations: [string, string][];            // A ⇎ B (mutual exclusive)
  parallelRelations: [string, string][];             // A - B  (independent)
  optionalDependencies?: [string, string, 'optional_to' | 'optional_from'][];

  /* --- Optional extra fields used by the new buildBPMN -------------------- */
  activityLevels?: Map<string, number>;              // injected by buildBPMN
}
