// A dependency is defined as a tuple: [temporal, existential]
export type Dependency = [temporal: string, existential: string];

// The ARM structure, representing relationships between activities
export interface ARM {
  [source: string]: {
    [target: string]: Dependency;
  };
}

// A Declare constraint maps an activity pair to a Declare relation
export interface DeclareConstraint {
  source: string;
  target: string;
  constraint: string;
  reversed?: boolean; // Optional: mark if reversed during normalization
}

// The final Declare model structure with all activities and constraints
export interface DeclareModel {
  activities: string[];
  constraints: DeclareConstraint[];
} 