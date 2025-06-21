// analysisTypes.ts – shared interface for ARM analysis results
// -----------------------------------------------------------------------------
// Simplified version extracted from the original project + our extensions. Adjust
// field names or imports to match your actual code base.
// -----------------------------------------------------------------------------

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
