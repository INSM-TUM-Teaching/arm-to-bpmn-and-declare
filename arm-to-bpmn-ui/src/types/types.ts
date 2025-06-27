export interface ARMMatrix {
  [activity: string]: {
    [activity: string]: [string, string]; // [temporal, existential]
  };
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