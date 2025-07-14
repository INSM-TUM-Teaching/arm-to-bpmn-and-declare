export interface ARMMatrix {
  [activity: string]: {
    [activity: string]: [string, string]; // [temporal, existential]
  };
}

export interface RelationshipTestCase {
  description: string;
  expected: {
    temporalChains?: [string, string][];
    optionalDependencies?: [string, string, 'optional_to' | 'optional_from'][];
    exclusiveRelations?: [string, string][];
    parallelRelations?: [string, string][];
    orRelations?: [string, string][];
    coOccurrence?: [string, string][];
    bpmn_structure: string;
  };
  [key: string]: any; // ARM matrix data
}

export interface ValidationResult {
  testName: string;
  passed: boolean;
  errors: string[];
  analysis: any; // ReturnType<typeof buildBPMNModelWithAnalysis>
  bpmnXml: string;
}

export interface DeclareConstraint {
  source: string;
  target: string;
  constraint: string;
  label: string;
}

export interface UnaryConstraint {
  activity: string;
  constraint: string;
}

export interface DeclareModel {
  activities: string[];
  constraints: DeclareConstraint[];
  unary: UnaryConstraint[];
}