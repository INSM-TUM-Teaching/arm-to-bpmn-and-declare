import { kahnTopo } from "./translateARM";

export type TemporalRelation = '<' | '<d' | '>' | '-' | null;
export type ExistentialRelation =
  | '⇒'
  | '⇐'
  | '⇔'
  | '⇎'
  | '∨'
  | '∧'
  | '-'
  | null;

export interface ARMMatrix {
  [source: string]: {
    [target: string]: {
      temporal: TemporalRelation;
      existential: ExistentialRelation;
    };
  };
}

// Raw JSON shape – what gets stored on disk / fetched from backend
export type RawARMMatrix = {
  [source: string]: {
    [target: string]: [string, string];
  };
};

/**
 * Convert the JSON/array representation into the typed object shape expected
 * by `validifyARM`.
 */
export function fromRawARM(raw: RawARMMatrix): ARMMatrix {
  const arm: ARMMatrix = {};
  const toValue = (sym: string): string | null => (sym === 'x' ? null : sym);

  for (const src in raw) {
    arm[src] = {} as ARMMatrix[string];
    for (const tgt in raw[src]) {
      const [t, e] = raw[src][tgt];
      arm[src][tgt] = {
        temporal: toValue(t) as TemporalRelation,
        existential: toValue(e) as ExistentialRelation,
      };
    }
  }
  return arm;
}

// Validate an ARM matrix according to the domain rules (see header).

export function validifyARM(
  matrix: ARMMatrix,
  allowedActivities: string[],
): void {
  // 1️⃣  Allowed‑symbol check
  for (const src in matrix) {
    if (!allowedActivities.includes(src)) {
      throw new Error(`Activity "${src}" is not in the allowed activity list`);
    }
    for (const tgt in matrix[src]) {
      if (!allowedActivities.includes(tgt)) {
        throw new Error(
          `Activity "${tgt}" is not in the allowed activity list`,
        );
      }
    }
  }

  // 2️⃣‑5️⃣  Pairwise logical checks
  const isBefore = (t: TemporalRelation) => t === '<' || t === '<d';

  for (const a in matrix) {
    for (const b in matrix[a]) {
      if (a === b) continue; // self‑relations are ignored
      if (!(b in matrix)) continue; // missing reverse entry → skip

      const { temporal: tAB, existential: eAB } = matrix[a][b];
      const { temporal: tBA, existential: eBA } = matrix[b][a] ?? {
        temporal: null,
        existential: null,
      };

      // Rule 2: mutual equivalence
      if (eAB === '⇔' && eBA !== '⇔') {
        throw new Error(`Existential relation conflict: ${a} ⇔ ${b} is not reciprocal`);
      }
      if (eBA === '⇔' && eAB !== '⇔') {
        throw new Error(`Existential relation conflict: ${b} ⇔ ${a} is not reciprocal`);
      }

      // Rule 3: temporal order clash
      if (isBefore(tAB) && isBefore(tBA)) {
        throw new Error(`Temporal order clash: both "${a} < ${b}" and "${b} < ${a}" present`);
      }

      // Rule 4: exclusive vs equivalence conflict
      const hasExclusive = eAB === '⇎' || eBA === '⇎';
      const hasEquiv = eAB === '⇔' || eBA === '⇔';
      if (hasExclusive && hasEquiv) {
        throw new Error(`Conflicting existential relations between ${a} and ${b}: ⇎ cannot coexist with ⇔`);
      }

      // Rule 5: reciprocal exclusivity
      if (eAB === '⇎' && eBA !== '⇎') {
        throw new Error(`Existential relation conflict: ${a} ⇎ ${b} is not reciprocal`);
      }
      if (eBA === '⇎' && eAB !== '⇎') {
        throw new Error(`Existential relation conflict: ${b} ⇎ ${a} is not reciprocal`);
      }
    }
  }

  // 6️⃣  Temporal cycle check
  const activities = Object.keys(matrix);
  const edges: [string, string][] = [];
  for (const src in matrix) {
    for (const tgt in matrix[src]) {
      const t = matrix[src][tgt].temporal;
      if (t === "<" || t === "<d") {
        edges.push([src, tgt]);
      }
    }
  }
  try {
    kahnTopo(activities, edges);
  } catch (e) {
    throw new Error("Temporal cycle detected in ARM matrix: " + (e as Error).message);
  }
}
