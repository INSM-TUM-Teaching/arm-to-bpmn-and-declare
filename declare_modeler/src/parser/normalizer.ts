// 📁 /src/parser/normalizer.ts

import { Dependency } from "../types/types";

// Reversible Declare constraints
export const reverseMap: Record<string, string> = {
  "precedence": "response",
  "response": "precedence",
  "chain_precedence": "chain_response",
  "chain_response": "chain_precedence",
  "succession": "succession",
  "chain_succession": "chain_succession",
  "coexistence": "coexistence",
  "not-coexistence": "not-coexistence",
  "responded-existence": "responded-existence",
  "inclusive_or": "inclusive_or",
  "nand": "nand",
  "chain_responded-existence": "chain_responded-existence"
};

// Combine temporal + existential to a lookup key
export function concatenate_dependencies(dep: Dependency): string {
  const [temporal, existential] = dep;
  return temporal + existential;
}

// Flip dependency symbols for reverse search
export function reverseDependency(dep: Dependency): Dependency {
  const [temporal, existential] = dep;

  const reversedTemporal = temporal
    .replace(">", "<")
    .replace("<", ">");

  const reversedExistential = existential
    .replace("⇒", "⇐")
    .replace("⇐", "⇒");

  return [reversedTemporal, reversedExistential];
}

// Normalize dependency key by checking both original and reversed
export function normalizeDependency(
  dep: Dependency,
  relationshipMap: Record<string, string>
): { key: string; reversed: boolean } {
  const key = concatenate_dependencies(dep);
  if (key in relationshipMap) {
    return { key, reversed: false };
  }

  const reversed = reverseDependency(dep);
  const reversedKey = concatenate_dependencies(reversed);
  if (reversedKey in relationshipMap) {
    return { key: reversedKey, reversed: true };
  }

  return { key, reversed: false }; // fallback, may trigger warning
}

// Optional utility: reverse a Declare constraint label for visual symmetry
export function reverseConstraintLabel(label: string): string {
  return reverseMap[label] ?? label;
}
