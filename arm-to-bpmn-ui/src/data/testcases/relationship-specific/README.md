
# ARM Relationship Type Validation Test Framework

## Overview

Based on your detailed analysis, we have established a systematic test framework to validate the correct handling of the ten types of activity relationships in the ARM (Activity Relationship Matrix) and their BPMN generation.

## Implemented Features

### 1. Test Cases (`/src/data/testcases/relationship-specific/`)

Dedicated test cases were created for each type of relationship:

* **leads-to**: A≺B ∧ A⇒B
* **precedes**: A≺B ∧ B⇒A
* **implies**: ∧ A⇒B
* **ordered-co-occurrence**: A≺B ∧ A⇔B
* **co-occurrence**: ∧ A⇔B
* **non-co-occurrence**: A⇎B
* **NAND**: A¬∧B
* **OR**: A∨B
* **pure-temporal**: A≺B ∧ no existential dependency
* **independence**: ∧ no existential dependency

### 2. Validation Tool (`/src/__tests__/relationshipValidator.ts`)

Provides the following functionalities:

* Load test cases
* Validate analysis results (temporal chains, exclusive relationships, parallelism, etc.)
* Validate BPMN structure (XOR/AND/OR gateways)
* Execute individual or batch tests
* Generate test reports

### 3. Test Interface (`/src/pages/RelationshipTestPage.tsx`)

User-friendly test interface:

* Run all or specific tests
* Visualize test results
* Download test reports
* Display BPMN XML preview

### 4. Route Integration

The test page has been added to the main application routing and can be accessed via `/relationship-test`.

## Supported Relationship Matrix Validation

According to your analysis, the program logic support status for each relationship:

| Activity Relationship Type | Logic Support              | Test Case |
| -------------------------- | -------------------------- | --------- |
| leads-to                   | ✅ Full Support             | ✅ Created |
| precedes                   | ✅ Full Support             | ✅ Created |
| implies                    | ✅ Full Support             | ✅ Created |
| ordered co-occurrence      | ⚠️ Partial Support         | ✅ Created |
| co-occurrence              | ⚠️ Indirect Handling       | ✅ Created |
| non-co-occurrence          | ✅ Full Support             | ✅ Created |
| NAND                       | ⚠️ Confirm Symbol Handling | ✅ Created |
| OR                         | ✅ Full Support             | ✅ Created |
| pure-temporal              | ✅ Full Support             | ✅ Created |
| independence               | ⚠️ Partial Support         | ✅ Created |

## Usage Instructions

### Run Tests

1. Start the application
2. Navigate to the "Relationship Tests" page
3. Click “Run All Tests” or select a specific test
4. View results and analysis

### Add New Test Case

Add new test cases in the validator's `loadRelationshipTestCases` function:

```typescript
testCases.set('new-relation', {
  description: "Description of the new relationship",
  expected: {
    temporalChains: [["A", "B"]],
    // Other expected outcomes...
    bpmn_structure: "Expected BPMN structure description"
  },
  A: { A: ["x", "x"], B: ["symbol1", "symbol2"] },
  B: { A: ["symbol1", "symbol2"], B: ["x", "x"] }
});
```

## Validation Focus

### 1. Analysis Phase Validation

* Ensure `extractTemporalChains` correctly extracts temporal relationships
* Ensure `detectExclusiveRelations` correctly identifies exclusivity
* Ensure `detectParallelRelations` correctly identifies parallelism
* Ensure `detectOptionalDependencies` correctly identifies existential dependencies

### 2. BPMN Generation Validation

* Ensure correct gateway types (XOR/AND/OR)
* Validate correctness of process structure
* Validate start and end event handling

### 3. Special Case Handling

* Indirect handling of co-occurrence (⇔)
* Full support for NAND symbol logic
* Converging complex gateway-to-gateway paths

## Future Improvement Suggestions

1. **Extended Symbol Support**: Ensure full support for the `¬∧` symbol
2. **Dedicated Co-occurrence Handling**: Add dedicated logic for ⇔ relationships
3. **Visualization Enhancements**: Add BPMN diagram previews in the test UI
4. **Performance Testing**: Conduct performance testing on large ARM matrices
5. **Edge Case Testing**: Add more boundary and abnormal case tests

## Report Generation

The test framework generates detailed reports containing:

* Test pass rate
* Detailed error information for failed tests
* Analysis statistics for each test
* BPMN XML structure validation results

This framework provides a complete solution for systematic verification of ARM relationship handling, helping ensure the correct implementation of all relationship types defined in the referenced literature.


