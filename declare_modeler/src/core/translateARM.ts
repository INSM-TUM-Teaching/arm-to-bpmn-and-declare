// 📁 /src/parser/translateARM.ts

import { ARM, DeclareModel, DeclareConstraint } from "../types/types";
import { normalizeDependency } from "../parser/utils";

export function translateARMtoDeclare(
  arm: ARM,
  relationshipMap: Record<string, string>
): DeclareModel {
  const activities = new Set<string>();
  const constraints: DeclareConstraint[] = [];

  for (const source in arm) {
    activities.add(source);

    for (const target in arm[source]) {
      activities.add(target);

      if (source === target) continue; // Skip self loops

      const [temporal, existential] = arm[source][target];
      if (temporal === "x" || existential === "x") continue; // Ignore undefined

      const { key, reversed } = normalizeDependency([temporal, existential], relationshipMap);

      if (key in relationshipMap) {
        const constraint: DeclareConstraint = {
          source: reversed ? target : source,
          target: reversed ? source : target,
          constraint: relationshipMap[key],
          reversed: reversed || undefined
        };
        constraints.push(constraint);
      } else {
        console.warn(`No mapping for (${temporal}, ${existential}) between ${source} → ${target}`);
      }
    }
  }

  return {
    activities: Array.from(activities),
    constraints
  };
}
