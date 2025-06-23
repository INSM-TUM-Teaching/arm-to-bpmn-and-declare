import React, { useEffect, useState } from "react";
import { buildBPMN } from "../logic/buildBPMN";
import { buildBPMNModelWithAnalysis } from "../logic/buildBPMNModelWithAnalysis";
import { BpmnViewer } from "../components/BpmnViewer";
import type { ARMMatrix } from "../logic/translateARM";

interface TestCaseConfig {
  name: string;
  armMatrix: ARMMatrix;
  expectedImageUrl: string;
  expectedPass: boolean;
}

interface TestCaseResult extends TestCaseConfig {
  analysis: ReturnType<typeof buildBPMNModelWithAnalysis>;
  bpmnXml: string;
}

const BatchTestPage: React.FC = () => {
  const [results, setResults] = useState<TestCaseResult[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);

  // 1. Load every *.json in /data/testcases
  useEffect(() => {
    const jsonModules = import.meta.glob("../data/testcases/*.json", { eager: true });
    const pngModules = import.meta.glob("../data/testcases/*.png", { eager: true });

    // Log loaded modules
    console.log("Loaded JSON modules:", jsonModules);
    console.log("Loaded PNG modules:", pngModules);

    const load = async () => {
      const temp: TestCaseResult[] = [];

      for (const path in jsonModules) {
        const raw = jsonModules[path];
        const matrix = (raw && typeof raw === "object" && "default" in raw) ? raw.default : raw as ARMMatrix;
        const name = path.match(/([^/]+)\.json$/)![1];
        const imgModule = pngModules[`../data/testcases/${name}.png`];
        const img = imgModule && typeof imgModule === "object" && "default" in imgModule
          ? imgModule.default
          : imgModule as string;

        // Log each test case input
        console.log("Test case:", { path, name, matrix, img });

        // 1. Get raw analysis
        const rawAnalysis = buildBPMNModelWithAnalysis(matrix);

        // 2. Adapt to buildBPMN's expected structure
        const analysis = {
          activities: rawAnalysis.topoOrder,
          temporalChains: rawAnalysis.chains,
          exclusiveRelations: rawAnalysis.exclusive,
          parallelRelations: rawAnalysis.parallel,
          optionalDependencies: rawAnalysis.optional,
          directDependencies: rawAnalysis.directChains,
          topoOrder: rawAnalysis.topoOrder,
          orRelations: rawAnalysis.orRelations,
          chains: rawAnalysis.chains,
          exclusive: rawAnalysis.exclusive,
          parallel: rawAnalysis.parallel,
          directChains: rawAnalysis.directChains,
          optional: rawAnalysis.optional,
        };

        const bpmnXml = await buildBPMN(analysis);

        temp.push({
          name,
          armMatrix: matrix,
          expectedImageUrl: img,
          expectedPass: true,
          analysis,
          bpmnXml,
        });
      }
      setResults(temp);
      // Log final results
      console.log("Final results:", temp);
    };
    load();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6 text-black">Batch Test Results</h1>

      {results.length === 0 && (
        <div className="text-black text-center py-12">
          No test cases found. Please add JSON and PNG files to <code>src/data/testcases/</code>.
        </div>
      )}

      {results.map((r, idx) => (
        <div key={r.name} className="border rounded mb-8 shadow bg-white">
          <div
            className="flex justify-between items-center bg-gray-100 p-3 cursor-pointer"
            onClick={() => setExpanded(expanded === idx ? null : idx)}
          >
            <span className="text-black font-bold">{r.name}</span>
          </div>
          {expanded === idx && (
            <div className="p-4 space-y-6">
              {/* Logic Output Section */}
              <section className="mb-10">
                <h2 className="text-xl font-semibold mb-4">Logic Analysis Output</h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <h3 className="font-medium text-gray-800 mb-1">Temporal Chains</h3>
                    <ul className="text-sm text-gray-700 space-y-1">
                      {r.analysis.chains?.map((chain: string[], idx: number) => <li key={idx}>{chain.join(" → ")}</li>)}
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-800 mb-1">Exclusive Relations X</h3>
                    <ul className="text-sm text-gray-700 space-y-1">
                      {r.analysis.exclusive?.map(([a, b]: string[], i: number) => <li key={i}>{a} x {b}</li>)}
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-800 mb-1">Parallel Relations + </h3>
                    <ul className="text-sm text-gray-700 space-y-1">
                      {r.analysis.parallel?.map(([a, b]: string[], i: number) => <li key={i}>{a} + {b}</li>)}
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-800 mb-1">Direct Temporal Dependencies</h3>
                    <ul className="text-sm text-gray-700 space-y-1">
                      {r.analysis.directChains?.map(([a, b]: string[], i: number) => <li key={i}>{a} → {b}</li>)}
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-800 mb-1">OR Dependencies</h3>
                    <ul className="text-sm text-gray-700 space-y-1">
                      {r.analysis.orRelations?.map(([a, b]: string[], i: number) => <li key={i}>{a} v {b}</li>)}
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-800 mb-1">Optional Dependencies</h3>
                    <ul className="text-sm text-gray-700 space-y-1">
                      {r.analysis.optional?.map(([a, b]: string[], i: number) => <li key={i}>{a} ?→ {b}</li>)}
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-800 mb-1">Topological Order</h3>
                    <ul className="text-sm text-gray-700 space-y-1">
                      {r.analysis.topoOrder?.map((node: string, i: number) => <li key={i}>{i + 1}. {node}</li>)}
                    </ul>
                  </div>
                </div>
              </section>
              {/* BPMN Viewer */}
              <section className="mb-10">
                <h2 className="text-xl font-semibold mb-4">🧾 BPMN Viewer</h2>
                {r.bpmnXml && r.bpmnXml.includes("<bpmn:definitions")
                  ? <BpmnViewer xml={r.bpmnXml} />
                  : <div className="text-red-600">Invalid BPMN XML</div>
                }
              </section>
              {/* Expected */}
              <section>
                <h2 className="font-semibold text-black">Expected Diagram (PNG)</h2>
                <img
                  src={typeof r.expectedImageUrl === "string" ? r.expectedImageUrl : (r.expectedImageUrl?.default ?? "")}
                  alt={`${r.name} expected`}
                  loading="lazy"
                  className="max-w-full border"
                />
              </section>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default BatchTestPage;
