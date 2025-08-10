import React, { useState, useRef, useEffect } from 'react';
import { BpmnViewer } from '../components/BpmnViewer';
import { RelationshipTestCase, ValidationResult } from '../types/types';
import {
  loadRelationshipTestCases,
  runSingleTest,
  runAllRelationshipTests,
  generateTestReport
} from '../__tests__/relationshipValidatorEN';

const RelationshipTestPage: React.FC = () => {
  const [testResults, setTestResults] = useState<ValidationResult[]>([]);
  const [selectedTest, setSelectedTest] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  const [currentBpmn, setCurrentBpmn] = useState<string>('');
  const [showBpmnDiagram, setShowBpmnDiagram] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [expandedBpmn, setExpandedBpmn] = useState<Set<string>>(new Set());

  const testCases = loadRelationshipTestCases();

  // Toggle BPMN diagram for specific test
  const toggleBpmnDiagram = (testName: string) => {
    const newExpanded = new Set(expandedBpmn);
    if (newExpanded.has(testName)) {
      newExpanded.delete(testName);
    } else {
      newExpanded.add(testName);
    }
    setExpandedBpmn(newExpanded);
  };

  // Display BPMN diagram
  const displayBpmn = async (bpmnXml: string) => {
    setCurrentBpmn(bpmnXml);
    setShowBpmnDiagram(true);
  };

  const runSingleTestHandler = async (testName: string) => {
    setIsRunning(true);
    try {
      const testCase = testCases.get(testName);
      if (testCase) {
        const result = await runSingleTest(testName, testCase);
        setTestResults([result]);
        
        // Display BPMN diagram
        if (result.bpmnXml) {
          await displayBpmn(result.bpmnXml);
        }
      }
    } catch (error) {
      console.error('Error running test:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const runAllTestsHandler = async () => {
    setIsRunning(true);
    try {
      const results = await runAllRelationshipTests();
      setTestResults(results);
      
      // Display BPMN for the first result
      if (results.length > 0 && results[0].bpmnXml) {
        await displayBpmn(results[0].bpmnXml);
      }
    } catch (error) {
      console.error('Error running tests:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const downloadReport = () => {
    const report = generateTestReport(testResults);
    const blob = new Blob([report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'relationship-test-report.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadBpmn = () => {
    if (currentBpmn) {
      const blob = new Blob([currentBpmn], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedTest || 'test'}-bpmn.xml`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const getStatusColor = (passed: boolean) => {
    return passed ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50';
  };

  const getStatusIcon = (passed: boolean) => {
    return passed ? '✅' : '❌';
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">Workflow Pattern Validation Tests</h1>
      
      {/* Control Panel */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Test Controls</h2>
        
        <div className="flex flex-wrap gap-4 mb-4">
          <button
            onClick={runAllTestsHandler}
            disabled={isRunning}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRunning ? 'Running Tests...' : 'Run All Tests'}
          </button>
          
          <div className="flex items-center gap-2">
            <select
              value={selectedTest}
              onChange={(e) => setSelectedTest(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">Select a test...</option>
              {Array.from(testCases.keys()).map(testName => (
                <option key={testName} value={testName}>
                  {testName}
                </option>
              ))}
            </select>
            
            <button
              onClick={() => selectedTest && runSingleTestHandler(selectedTest)}
              disabled={!selectedTest || isRunning}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Run Single Test
            </button>
          </div>
        </div>

        {testResults.length > 0 && (
          <div className="flex gap-4">
            <button
              onClick={downloadReport}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
            >
              Download Report
            </button>
            
            {currentBpmn && (
              <button
                onClick={downloadBpmn}
                className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700"
              >
                Download BPMN
              </button>
            )}
            
            <button
              onClick={() => setShowReport(!showReport)}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
            >
              {showReport ? 'Hide' : 'Show'} Report
            </button>
          </div>
        )}
      </div>

      {/* Test Results Summary */}
      {testResults.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Test Results Summary</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-gray-800">
                {testResults.length}
              </div>
              <div className="text-sm text-gray-600">Total Tests</div>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {testResults.filter(r => r.passed).length}
              </div>
              <div className="text-sm text-green-600">Passed</div>
            </div>
            
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {testResults.filter(r => !r.passed).length}
              </div>
              <div className="text-sm text-red-600">Failed</div>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {((testResults.filter(r => r.passed).length / testResults.length) * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-blue-600">Success Rate</div>
            </div>
          </div>

          {/* Individual Test Results */}
          <div className="space-y-4">
            {testResults.map((result) => (
              <div key={result.testName} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-medium">
                    {getStatusIcon(result.passed)} {result.testName}
                  </h3>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(result.passed)}`}>
                    {result.passed ? 'PASSED' : 'FAILED'}
                  </span>
                </div>
                
                <div className="text-sm text-gray-600 mb-3">
                  {testCases.get(result.testName)?.description}
                </div>

                {!result.passed && result.errors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-3">
                    <h4 className="font-medium text-red-800 mb-2">Errors:</h4>
                    <ul className="list-disc list-inside text-red-700 text-sm">
                      {result.errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Temporal Chains:</span>
                    <div className="text-gray-600">{result.analysis.temporalChains?.length || 0}</div>
                  </div>
                  <div>
                    <span className="font-medium">Exclusive Relations:</span>
                    <div className="text-gray-600">{result.analysis.exclusiveRelations?.length || 0}</div>
                  </div>
                  <div>
                    <span className="font-medium">Parallel Relations:</span>
                    <div className="text-gray-600">{result.analysis.parallelRelations?.length || 0}</div>
                  </div>
                  <div>
                    <span className="font-medium">OR Relations:</span>
                    <div className="text-gray-600">{result.analysis.orRelations?.length || 0}</div>
                  </div>
                  <div>
                    <span className="font-medium">Optional Dependencies:</span>
                    <div className="text-gray-600">{result.analysis.optionalDependencies?.length || 0}</div>
                  </div>
                </div>

                <button
                  onClick={() => toggleBpmnDiagram(result.testName)}
                  className="mt-3 bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                >
                  {expandedBpmn.has(result.testName) ? 'Hide BPMN Diagram' : 'View BPMN Diagram'}
                </button>

                {/* BPMN Diagram for this specific test */}
                {expandedBpmn.has(result.testName) && (
                  <div className="mt-4 border-t pt-4">
                    <h4 className="text-lg font-medium mb-2">BPMN Diagram</h4>
                    <BpmnViewer xml={result.bpmnXml} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Remove the top BPMN Diagram Display section since we now show inline */}

      {/* Detailed Report */}
      {showReport && testResults.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Detailed Test Report</h2>
          <pre className="bg-gray-50 p-4 rounded-lg overflow-auto text-sm">
            {generateTestReport(testResults)}
          </pre>
        </div>
      )}

      {/* Test Cases Information */}
      <div className="bg-white rounded-lg shadow-md p-6 mt-8">
        <h2 className="text-xl font-semibold mb-4">Available Test Cases</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from(testCases.entries()).map(([testName, testCase]) => (
            <div key={testName} className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-800 mb-2">{testName}</h3>
              <p className="text-sm text-gray-600 mb-3">{testCase.description}</p>
              <div className="text-xs text-gray-500">
                Expected: {testCase.expected.bpmn_structure}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RelationshipTestPage;
