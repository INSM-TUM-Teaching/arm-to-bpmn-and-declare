import { buildBPMNModelWithAnalysis } from '../logic/buildBPMNModelWithAnalysis';
import { buildBPMN, Analysis } from '../logic/buildBPMN';
import type { RelationshipTestCase, ValidationResult } from '../types/types';

/**
 * ARM Workflow Pattern Validation Testing Tool
 * Systematic validation for workflow patterns defined in the research paper
 */

// Import workflow pattern test case JSON files
import sequenceTest from '../data/testcases/workflow-patterns/sequence.json';
import parallelSplitTest from '../data/testcases/workflow-patterns/parallel-split.json';
import synchronizationMergeTest from '../data/testcases/workflow-patterns/synchronization-merge.json';
import exclusiveChoiceTest from '../data/testcases/workflow-patterns/exclusive-choice.json';
import simpleMergeTest from '../data/testcases/workflow-patterns/simple-merge.json';
import multiChoiceTest from '../data/testcases/workflow-patterns/multi-choice.json';
import structuredSyncMergeTest from '../data/testcases/workflow-patterns/structured-sync-merge.json';
import structuredDiscriminatorTest from '../data/testcases/workflow-patterns/structured-discriminator.json';
import deferredChoiceTest from '../data/testcases/workflow-patterns/deferred-choice.json';

/**
 * Load all workflow pattern test cases from JSON files
 * Import-based loading for browser environment
 */
export function loadRelationshipTestCases(): Map<string, RelationshipTestCase> {
  const testCases = new Map<string, RelationshipTestCase>();
  
  // Load workflow pattern test cases from imported JSON files
  // Using 'unknown' intermediate casting to handle JSON type inference issues
  testCases.set('sequence', sequenceTest as unknown as RelationshipTestCase);
  testCases.set('parallel-split', parallelSplitTest as unknown as RelationshipTestCase);
  testCases.set('synchronization-merge', synchronizationMergeTest as unknown as RelationshipTestCase);
  testCases.set('exclusive-choice', exclusiveChoiceTest as unknown as RelationshipTestCase);
  testCases.set('simple-merge', simpleMergeTest as unknown as RelationshipTestCase);
  testCases.set('multi-choice', multiChoiceTest as unknown as RelationshipTestCase);
  testCases.set('structured-sync-merge', structuredSyncMergeTest as unknown as RelationshipTestCase);
  testCases.set('structured-discriminator', structuredDiscriminatorTest as unknown as RelationshipTestCase);
  testCases.set('deferred-choice', deferredChoiceTest as unknown as RelationshipTestCase);
  
  return testCases;
}

/**
 * Validate analysis results against expected outcomes
 */
export function validateAnalysis(
  result: ReturnType<typeof buildBPMNModelWithAnalysis>, 
  expected: RelationshipTestCase['expected']
): string[] {
  const errors: string[] = [];

  // Validate temporal chains
  if (expected.temporalChains) {
    for (const [from, to] of expected.temporalChains) {
      const found = result.temporalChains.some(([f, t]) => f === from && t === to);
      if (!found) {
        errors.push(`Missing temporal chain: ${from} → ${to}`);
      }
    }
  }

  // Validate optional dependencies
  if (expected.optionalDependencies) {
    for (const [from, to, type] of expected.optionalDependencies) {
      const found = result.optionalDependencies?.some(([f, t, tp]) => 
        f === from && t === to && tp === type
      );
      if (!found) {
        errors.push(`Missing optional dependency: ${from} ${type} ${to}`);
      }
    }
  }

  // Validate exclusive relations
  if (expected.exclusiveRelations) {
    for (const [a, b] of expected.exclusiveRelations) {
      const found = result.exclusiveRelations.some(([x, y]) => 
        (x === a && y === b) || (x === b && y === a)
      );
      if (!found) {
        errors.push(`Missing exclusive relation: ${a} ⇎ ${b}`);
      }
    }
  }

  // Validate parallel relations
  if (expected.parallelRelations) {
    for (const [a, b] of expected.parallelRelations) {
      const found = result.parallelRelations.some(([x, y]) => 
        (x === a && y === b) || (x === b && y === a)
      );
      if (!found) {
        errors.push(`Missing parallel relation: ${a} || ${b}`);
      }
    }
  }

  // Validate OR relations
  if (expected.orRelations) {
    for (const [a, b] of expected.orRelations) {
      const found = result.orRelations?.some(([x, y]) => 
        (x === a && y === b) || (x === b && y === a)
      );
      if (!found) {
        errors.push(`Missing OR relation: ${a} ∨ ${b}`);
      }
    }
  }

  return errors;
}

/**
 * Validate BPMN XML structure
 */
export function validateBpmnStructure(
  bpmnXml: string, 
  expectedStructure: string
): string[] {
  const errors: string[] = [];

  // Basic XML structure check
  if (!bpmnXml.includes('<bpmn:definitions')) {
    errors.push('Invalid BPMN XML: Missing definitions element');
    return errors;
  }

  console.log('BPMN XML Content:', bpmnXml);

  // Check for specific elements based on expected structure
  if (expectedStructure.includes('XOR')) {
    const hasExclusiveGateway = bpmnXml.includes('exclusiveGateway');
    console.log('Checking for XOR gateway:', hasExclusiveGateway);
    if (!hasExclusiveGateway) {
      errors.push('Expected XOR gateway not found in BPMN');
    }
  }

  if (expectedStructure.includes('OR gateway')) {
    const hasInclusiveGateway = bpmnXml.includes('inclusiveGateway');
    console.log('Checking for OR gateway:', hasInclusiveGateway);
    if (!hasInclusiveGateway) {
      errors.push('Expected OR gateway not found in BPMN');
    }
  }

  if (expectedStructure.includes('parallel')) {
    const hasParallelGateway = bpmnXml.includes('parallelGateway');
    console.log('Checking for parallel gateway:', hasParallelGateway);
    if (!hasParallelGateway) {
      errors.push('Expected parallel gateway not found in BPMN');
    }
  }

  if (expectedStructure.includes('sequential flow')) {
    const hasSequenceFlow = bpmnXml.includes('sequenceFlow');
    console.log('Checking for sequence flow:', hasSequenceFlow);
    if (!hasSequenceFlow) {
      errors.push('Expected sequence flow not found in BPMN');
    }
  }

  return errors;
}

/**
 * Execute a single test case
 */
export async function runSingleTest(
  testName: string, 
  testCase: RelationshipTestCase
): Promise<ValidationResult> {
  const errors: string[] = [];
  
  try {
    // Extract ARM data from test case (excluding metadata)
    const armData: any = {};
    Object.keys(testCase).forEach(key => {
      if (key !== 'description' && key !== 'expected') {
        armData[key] = testCase[key];
      }
    });

    // Execute analysis
    const analysisResult = buildBPMNModelWithAnalysis(armData);
    
    // Build Analysis object for BPMN generation
    const analysis: Analysis = {
      activities: analysisResult.activities,
      temporalChains: analysisResult.temporalChains,
      exclusiveRelations: analysisResult.exclusiveRelations,
      parallelRelations: analysisResult.parallelRelations,
      directDependencies: analysisResult.directDependencies,
      optionalDependencies: analysisResult.optionalDependencies,
      orRelations: analysisResult.orRelations
    };

    // Generate BPMN
    const bpmnXml = await buildBPMN(analysis);

    // Validate analysis results
    const analysisErrors = validateAnalysis(analysisResult, testCase.expected);
    errors.push(...analysisErrors);

    // Validate BPMN structure
    const bpmnErrors = validateBpmnStructure(bpmnXml, testCase.expected.bpmn_structure);
    errors.push(...bpmnErrors);

    return {
      testName,
      passed: errors.length === 0,
      errors,
      analysis: analysisResult,
      bpmnXml
    };

  } catch (error) {
    errors.push(`Test execution failed: ${error}`);
    return {
      testName,
      passed: false,
      errors,
      analysis: {
        chains: [],
        topoOrder: [],
        indexMap: new Map(),
        exclusive: [],
        parallel: [],
        directChains: [],
        optional: [],
        orRelations: [],
        activities: [],
        temporalChains: [],
        exclusiveRelations: [],
        parallelRelations: [],
        optionalDependencies: [],
        directDependencies: []
      },
      bpmnXml: ''
    };
  }
}

/**
 * Execute all relationship validation tests
 */
export async function runAllRelationshipTests(): Promise<ValidationResult[]> {
  const testCases = loadRelationshipTestCases();
  const results: ValidationResult[] = [];

  console.log(`Running ${testCases.size} relationship validation tests...`);

  for (const [testName, testCase] of testCases) {
    console.log(`\nRunning test: ${testName}`);
    console.log(`Description: ${testCase.description}`);
    
    const result = await runSingleTest(testName, testCase);
    results.push(result);

    if (result.passed) {
      console.log(`✅ ${testName}: PASSED`);
    } else {
      console.log(`❌ ${testName}: FAILED`);
      result.errors.forEach(error => console.log(`   - ${error}`));
    }
  }

  // Generate test report
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  console.log(`\n📊 Test Summary:`);
  console.log(`Passed: ${passed}/${total}`);
  console.log(`Failed: ${total - passed}/${total}`);

  if (passed < total) {
    console.log(`\n❌ Failed tests:`);
    results.filter(r => !r.passed).forEach(result => {
      console.log(`  ${result.testName}:`);
      result.errors.forEach(error => console.log(`    - ${error}`));
    });
  }

  return results;
}

/**
 * Generate test report
 */
export function generateTestReport(results: ValidationResult[]): string {
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  let report = `# ARM Relationship Type Validation Test Report\n\n`;
  report += `## Overview\n`;
  report += `- Total Tests: ${total}\n`;
  report += `- Passed: ${passed}\n`;
  report += `- Failed: ${total - passed}\n`;
  report += `- Success Rate: ${((passed / total) * 100).toFixed(1)}%\n\n`;

  report += `## Detailed Results\n\n`;
  
  for (const result of results) {
    const status = result.passed ? '✅ PASSED' : '❌ FAILED';
    report += `### ${result.testName} - ${status}\n`;
    
    if (!result.passed) {
      report += `**Errors:**\n`;
      result.errors.forEach(error => {
        report += `- ${error}\n`;
      });
    }
    
    report += `**Analysis Results:**\n`;
    report += `- Temporal Chains: ${result.analysis.temporalChains?.length || 0}\n`;
    report += `- Exclusive Relations: ${result.analysis.exclusiveRelations?.length || 0}\n`;
    report += `- Parallel Relations: ${result.analysis.parallelRelations?.length || 0}\n`;
    report += `- OR Relations: ${result.analysis.orRelations?.length || 0}\n`;
    report += `- Optional Dependencies: ${result.analysis.optionalDependencies?.length || 0}\n\n`;
  }

  return report;
}
