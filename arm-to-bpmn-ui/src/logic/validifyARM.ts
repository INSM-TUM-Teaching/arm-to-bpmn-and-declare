/**
 * validifyARM.ts – Activity‑Relationship‑Matrix validator
 * ======================================================
 * Purpose
 * -------
 * Ensure that an **Activity Relationship Matrix (ARM)** is *sound* **before** it
 * is handed over to the translation pipeline (TranslateARM → BuildBPMN, etc.).
 * The function stops the pipeline early by throwing an `Error` as soon as it
 * detects the first breach of the domain rules.
 *
 * Supported input shapes
 * ---------------------
 * 1. **Typed object form** *(internal)* – used by `validifyARM` directly.
 *
 *    ```ts
 *    interface ARMMatrix {
 *      [src: string]: {
 *        [tgt: string]: { temporal: '<' | '<d' | '>' | '-' | null;
 *                         existential: '⇒' | '⇐' | '⇔' | '⇎' | '∨' | '∧' | '-' | null };
 *      };
 *    }
 *    ```
 *
 * 2. **Raw JSON form** *(what your project stores on disk)* – a 2‑element array
 *    `[temporal, existential]` for every cell, e.g. the sample below.  Use the
 *    helper `fromRawARM` to convert it to the typed form.
 *
 *    ```jsonc
 *    {
 *      "a": { "b": ["<", "⇔"], "c": ["<", "⇔"] },
 *      "b": { "a": [">", "⇔"], "c": ["-", "⇔"] }
 *    }
 *    ```
 *    Symbol mapping while converting:
 *      • "x" → null (no constraint)
 *      • "<", "<d", "-", ">" stay unchanged
 *
 * Logic enforced
 * --------------
 * For every pair of activities **A** and **B** the validator checks:
 *  1. *Allowed symbols*        – all activity names used in the matrix must be
 *     present in the `allowedActivities` list.
 *  2. *Mutual equivalence*      – if `A ⇔ B` is declared, then `B ⇔ A` *must* be
 *     declared as well (and vice‑versa).
 *  3. *Temporal order clash*    – contradictory orders, e.g. both `A < B` and
 *     `B < A` (or `<d`) are forbidden.
 *  4. *Exclusive vs equivalence*– an exclusive relation `⇎` cannot coexist with
 *     an equivalence `⇔` between the same two activities.
 *  5. *Reciprocal exclusivity*  – exclusivity must be symmetric: `A ⇎ B` implies
 *     `B ⇎ A`.
 *
 * API
 * ---
 * ```ts
 * validifyARM(matrix: ARMMatrix, allowedActivities: string[]): void
 * fromRawARM(raw: RawARMMatrix): ARMMatrix  // helper
 * ```
 *
 * * **matrix / raw**        – the matrix in either typed or raw shape.
 * * **allowedActivities**   – list of symbols regarded as valid in the current
 *   context.
 * * **returns**             – `void` (success path).  The very first detected
 *   violation throws an `Error` with an English message.
 *
 * Minimal end‑to‑end example (reading a *.json* file)
 * --------------------------------------------------
 * ```ts
 * import fs from 'node:fs/promises';
 * import { fromRawARM, validifyARM } from './validifyARM';
 *
 * const rawJson = await fs.readFile('sampleARM.json', 'utf‑8');
 * const rawMatrix = JSON.parse(rawJson) as RawARMMatrix;
 *
 * const matrix = fromRawARM(rawMatrix);            // convert to typed shape
 * const allowed = Object.keys(matrix);             // or any predefined list
 *
 * validifyARM(matrix, allowed);                    // throws on error
 * console.log('Matrix is valid – proceed');
 * ```
 */

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

/**
 * Validate an ARM matrix according to the domain rules (see header).
 *
 * @param matrix            – ARM matrix to check (typed shape)
 * @param allowedActivities – list of legal activity symbols
 * @throws Error            – on the first inconsistency found
 */
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
}
