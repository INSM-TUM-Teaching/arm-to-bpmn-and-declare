/**
 * Translates an Activity Relationship Matrix (ARM) into a Declare Model.
 *
 * This module:
 * - Validates the ARM for logical and syntactic correctness.
 * - Converts each pairwise relationship into a Declare constraint.
 * - Detects a potential init activity based on precedence relationships.
 *
 * @module translateARMtoDeclare
 */
import { DeclareModel, ARMMatrix } from '../types/types';


/**
 * Validation rules - Allowed temporal symbols in the ARM matrix.
 * Examples: '<d' (directly before), '>' (after), '-' (neutral)
 */
const TEMPORAL_SET = ['<d', '>d', '<', '>', '-'];
/**
 * Allowed existential symbols in the ARM matrix.
 * Examples: '⇒' (implies), '⇔' (equivalence), '¬∧' (not-and), '-' (neutral)
 */
const EXISTENTIAL_SET = ['⇒', '⇐', '⇔', '⇎', '∨', '¬∧', '-'];


/**
 * Constraints that are logically invalid and should be rejected.
 * These combinations either conflict temporally and existentially or are undefined.
 */
const ILLEGAL_COMBOS = new Set([
  '<d⇎', '>d⇎', '<⇎', '>⇎',
  '<d∨', '>d∨', '<∨', '>∨',
  '<d¬∧', '>d¬∧', '<¬∧', '>¬∧'
]);


/**
 * Maps valid ARM relationship symbols to Declare constraint types.
 * These represent the "forward" direction (source → target).
 */
const TRANSLATE_MAP: Record<string, string> = {
  '<d⇒': 'chain_response',
  '<d⇔': 'chain_succession',
  '<d⇐': 'chain_precedence',
  '<⇒': 'response',
  '<⇔': 'succession',
  '<-': 'neg_response',
  '<⇐': 'precedence',
  '-⇒': 'resp_existence',
  '-⇔': 'coexistence',
  '-⇎': 'not_coexistence',
  '-∨': 'choice',
  '-¬∧': 'resp_absence',
  '--': 'default_independence',
  '>-': 'neg_precedence'
};


/**
 * Maps ARM relationships that need to be interpreted in reverse (target → source).
 */
const REVERSE_TRANSLATE_MAP: Record<string, string> = {
  '>⇔': 'succession',
  '>⇒': 'precedence',
  '>⇐': 'response',
  '>d⇐': 'chain_response',
  '>d⇒': 'chain_precedence',
  '>d⇔': 'chain_succession',
  '-⇐': 'resp_existence'
};


/**
 * Validates that both temporal and existential parts of a relationship are acceptable.
 *
 * @param {[string, string]} param0 - A tuple of [temporal, existential] symbols
 * @returns {boolean} - True if both parts are valid
 */
function isValidDependency([temp, exist]: string[]): boolean {
  return TEMPORAL_SET.includes(temp) && EXISTENTIAL_SET.includes(exist);
}


/**
 * Converts a given ARM matrix into a Declare model.
 *
 * @param {ARMMatrix} arm - An object representing activity relationships: arm[source][target] = [temporal, existential]
 * @returns {DeclareModel} - A Declare model with activities, constraints, and possibly an init unary constraint
 *
 * @throws Will throw an error if:
 * - A self-relationship is not ['x', 'x']
 * - A dependency uses invalid temporal or existential symbols
 * - A relationship is among the illegal combinations
 */
function translateARMtoDeclare(arm: ARMMatrix): DeclareModel {
  const activities = Object.keys(arm);
  const constraints: DeclareModel['constraints'] = [];
  const unary: DeclareModel['unary'] = [];
  const precedenceCount: Record<string, number> = {};
  activities.forEach(a => (precedenceCount[a] = 0));


  // Validation
  for (const i of activities) {
    for (const j of activities) {
      const [temp, exist] = arm[i][j];
      const relKey = temp + exist;


      if (i === j) {
        if (temp !== 'x' || exist !== 'x') throw new Error(`Self-relationship on '${i}' must be ['x','x']`);
      }
      else {
        // Validate temporal and existential values
        if (!isValidDependency([temp, exist])) {
          throw new Error(`Invalid dependency at [${i}][${j}]: ${temp}, ${exist}`);
        }
        if (ILLEGAL_COMBOS.has(relKey)) {
          throw new Error(`Illogical combination at [${i}][${j}]: ${relKey}`);
        }
      }
    }
  }


  // Translation
  // Traverse upper triangle to avoid duplicates
  for (let i = 0; i < activities.length; i++) {
    for (let j = i + 1; j < activities.length; j++) {
      const source = activities[i];
      const target = activities[j];
      const [temp, exist] = arm[source][target];
      const relKey = temp + exist;


      let constraint = TRANSLATE_MAP[relKey];
      let reversed = false;


      if (!constraint && REVERSE_TRANSLATE_MAP[relKey]) {
        constraint = REVERSE_TRANSLATE_MAP[relKey];
        reversed = true;
      }


      if (!constraint) continue;


      const realSource = reversed ? target : source;
      const realTarget = reversed ? source : target;


      // Track how many times each activity is the source of precedence
      if (['precedence', 'chain_precedence'].includes(constraint)) {
        precedenceCount[realSource]++;
      }


      if (constraint !== 'default_independence') {
        constraints.push({
          source: realSource,
          target: realTarget,
          constraint,
          label: constraint
        });
      }
    }
  }


  const n = activities.length;
  // Check for "init" activity — only one activity with precedence to all others
  const initCandidates = Object.entries(precedenceCount).filter(
    ([_, count]) => count === n - 1
  );
  if (initCandidates.length === 1) {
    unary.push({
      activity: initCandidates[0][0],
      constraint: 'init'
    });
  }


  return {
    activities,
    unary,
    constraints
  };
}


export { translateARMtoDeclare };