// StrategyTypes.ts
export interface LevelAssignmentStrategy {
  computeLevels(nodes: string[], edges: [string, string][]): Record<string, number>;
}

export interface GatewayGroupingStrategy {
  groupSuccessors(
    node: string,
    directTargets: string[],
    analysis: Analysis
  ): Array<{ type: 'exclusive' | 'parallel', targets: string[] }> | null;
}
