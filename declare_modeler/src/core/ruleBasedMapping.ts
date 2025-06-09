import { Dependency } from "../types/types";

export const relationshipMap: Record<string, string> = {
  "<d⇒": "chain_response",
  "<d⇔": "chain_succession",
  "<d-": "chain_precedence",
  "<⇒": "response",
  "<⇔": "succession",
  "<-": "precedence",
  "-⇒": "responded-existence",
  "-⇔": "coexistence",
  "-⇎": "not-coexistence",
  "-∨": "inclusive_or",
  "-∧": "nand"
};

/**
 * Inference logic for determining Declare constraint from a temporal-existential pair.
 * This replaces the old static relationship_map.json lookup.
 */
export function inferDeclareConstraint(dep: [string, string]): {
  constraint: string;
  reversed: boolean;
} {
  const key = dep.join("");
  const constraint = relationshipMap[key];

  if (constraint) {
    return {
      constraint,
      reversed: isReversedConstraint(constraint)
    };
  } else {
    console.warn(`No constraint found for dependency "${key}"`);
    return {
      constraint: "unknown",
      reversed: false
    };
  }
}

/**
 * Optional: determine if the constraint implies reversal (e.g., B precedes A → A responds to B)
 */
export function isReversedConstraint(constraint: string): boolean {
  const reversedConstraints = new Set([
    "precedence",
    "chain_precedence",
    "reverse-succession"
  ]);
  return reversedConstraints.has(constraint);
}

export function applyConstraintWithDirection(
  source: string,
  target: string,
  dep: [string, string]
): { source: string; target: string; constraint: string } {
  const { constraint, reversed } = inferDeclareConstraint(dep);

  if (reversed) {
    return {
      source: target,
      target: source,
      constraint
    };
  }

  return {
    source,
    target,
    constraint
  };
}