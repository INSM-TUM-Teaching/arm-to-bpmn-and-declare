/*
  Translates an Activity Relationship Matrix (ARM) into a Declare Model.
  Validates relationships, maps them to Declare constraints, and identifies init activities.
*/
import { DeclareModel, ARMMatrix } from '../types/types';

// Mapping for normal ARM relationships
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

// Mapping for reversed ARM relationships
const REVERSE_TRANSLATE_MAP: Record<string, string> = {
  '>⇔': 'succession',
  '>⇒': 'precedence',
  '>⇐': 'response',
  '>d⇐': 'chain_response',
  '>d⇒': 'chain_precedence',
  '>d⇔': 'chain_succession',
  '-⇐': 'resp_existence'
};

// Converts a given ARM matrix into a Declare model.
function translateARMtoDeclare(arm: ARMMatrix): DeclareModel {
  const activities = Object.keys(arm);
  const constraints: DeclareModel['constraints'] = [];
  const unary: DeclareModel['unary'] = [];
  const precedenceCount: Record<string, number> = {};
  activities.forEach(a => (precedenceCount[a] = 0));

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