import { buildBPMNModelWithAnalysis } from '../src/TranslateARM';
import { AdvancedLevelStrategy }       from '../src/AdvancedLevelStrategy';
import type { ARMMatrix }              from '../src/types';

// Fake ARM for demo
const arm: ARMMatrix = {
  A: { A: ['-', '-'], B: ['-', '-'], C: ['<', '-'], D: ['-', '-'] },
  B: { A: ['-', '-'], B: ['-', '-'], C: ['<', '-'], D: ['-', '-'] },
  C: { A: ['-', '-'], B: ['-', '-'], C: ['-', '-'], D: ['<', '-'] },
  D: { A: ['-', '-'], B: ['-', '-'], C: ['-', '-'], D: ['-', '-'] },
};

// 1) obtain nodes + edges from existing pipeline
const analysis = buildBPMNModelWithAnalysis(arm); // no custom strategy
const nodes    = analysis.activities;
const edges    = analysis.directDependencies.length
  ? analysis.directDependencies
  : analysis.temporalChains;

// 2) compute levels only
const levelMap = new AdvancedLevelStrategy().computeLevels(nodes, edges);

// 3) show result
console.log('--- LEVEL MAP ---');
console.table(levelMap);
