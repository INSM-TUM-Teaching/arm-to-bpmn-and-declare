import React, { useEffect, useState } from "react";
import { buildBPMN } from "../logic/buildBPMN";
import { buildBPMNModelWithAnalysis } from "../logic/buildBPMNModelWithAnalysis";
import { BpmnViewer } from "../components/BpmnViewer";
import type { ARMMatrix } from "../logic/translateARM";
import { AdvancedLevelStrategy } from "../logic/other logics/AdvancedLevelStrategy";
import { AdvancedGatewayStrategy } from "../logic/other logics/AdvancedGatewayStrategy";
import { LayerAwareGatewayStrategy } from "../logic/other logics/LayerAwareGatewayStrategy";
import { analyzeGatewaysAndJoins } from "../logic/other logics/analyzeGatewaysAndJoins";

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
        const matrix = (raw && typeof raw === "object" && "default" in raw) ? (raw.default as ARMMatrix) : (raw as ARMMatrix);
        const name = path.match(/([^/]+)\.json$/)![1];
        const imgModule = pngModules[`../data/testcases/${name}.png`];
        const img = imgModule && typeof imgModule === "object" && "default" in imgModule
          ? imgModule.default
          : imgModule as string;

        // Log each test case input
        console.log("Test case:", { path, name, matrix, img });

        // Get analysis with proper typing
        const analysis = buildBPMNModelWithAnalysis(matrix as ARMMatrix);

        const bpmnXml = await buildBPMN(analysis);

        temp.push({
          name,
          armMatrix: matrix as ARMMatrix,
          expectedImageUrl: img as string,
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
                  src={r.expectedImageUrl}
                  alt={`${r.name} expected`}
                  loading="lazy"
                  className="max-w-full border"
                />
              </section>

              {/* Activity Levels (AdvancedLevelStrategy) */}
              <section className="mb-10">
                <h2 className="text-xl font-semibold mb-4 text-black">Activity Levels (AdvancedLevelStrategy)</h2>
                <table className="table-auto border text-black">
                  <thead>
                    <tr>
                      <th className="border px-2">Activity</th>
                      <th className="border px-2">Level</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const nodes = r.analysis.activities;
                      const edges = r.analysis.directDependencies.length
                        ? r.analysis.directDependencies
                        : r.analysis.temporalChains;
                      const levels = new AdvancedLevelStrategy().computeLevels(nodes, edges);
                      return Object.entries(levels).map(([act, lvl]) => (
                        <tr key={act}>
                          <td className="border px-2">{act}</td>
                          <td className="border px-2">{lvl}</td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </section>

              {/* Gateway Groupings (AdvancedGatewayStrategy) */}
              <section className="mb-10">
                <h2 className="text-xl font-semibold mb-4 text-black">Gateway Groupings (LayerAwareGatewayStrategy)</h2>
                <table className="table-auto border text-black">
                  <thead>
                    <tr>
                      <th className="border px-2">Activity</th>
                      <th className="border px-2">Groups</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const nodes = r.analysis.activities.slice();
                      const edges = r.analysis.directDependencies.length
                        ? r.analysis.directDependencies.slice()
                        : r.analysis.temporalChains.slice();
                      const levels = new AdvancedLevelStrategy().computeLevels(nodes, edges);
                      const level0Nodes = nodes.filter(n => levels[n] === 0);
                      if (!nodes.includes('start')) nodes.unshift('start');
                      level0Nodes.forEach(n => {
                        if (!edges.some(([from, to]) => from === 'start' && to === n)) {
                          edges.push(['start', n]);
                        }
                      });
                      const gatewayStrategy = new LayerAwareGatewayStrategy();
                      return nodes.map((node: string) => {
                        const directTargets = edges
                          .filter(([from]: [string, string]) => from === node)
                          .map(([, to]: [string, string]) => to);
                        const groups = gatewayStrategy.groupSuccessors(node, directTargets, {
                          ...r.analysis,
                          activityLevels: levels,
                        }) || [];
                        return (
                          <tr key={node}>
                            <td className="border px-2 align-top">{node}</td>
                            <td className="border px-2">
                              {groups.length === 0
                                ? <span className="text-gray-400">-</span>
                                : groups.map((g: any, i: number) => (
                                    <div key={i}>
                                      <b>{g.type}:</b> {g.targets.join(', ')}
                                    </div>
                                  ))}
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </section>

              {/* Join Stack (FILO) */}
              <section className="mb-10">
                <h2 className="text-xl font-semibold mb-4 text-black">Join Stack (FILO)</h2>
                <table className="table-auto border text-black">
                  <thead>
                    <tr>
                      <th className="border px-2">Nodes</th>
                      <th className="border px-2">Target</th>
                      <th className="border px-2">Gateway Type</th>
                      <th className="border px-2">Layers</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const { joinStack } = analyzeGatewaysAndJoins(r.analysis);
                      return (Array.isArray(joinStack) ? joinStack : []).map((item: any, i: number) => (
                        <tr key={i}>
                          <td className="border px-2">
                            {Array.isArray(item.note)
                              ? item.note.join(', ')
                              : (item.note ? String(item.note) : '')}
                          </td>
                          <td className="border px-2">{item.target ?? ''}</td>
                          <td className="border px-2">{item.gatewayType ?? ''}</td>
                          <td className="border px-2">{item.order ?? ''}</td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </section>

              {/* Join Points */}
              <section className="mb-10">
                <h2 className="text-xl font-semibold mb-4 text-black">Join Points (Multi-in)</h2>
                <table className="table-auto border text-black">
                  <thead>
                    <tr>
                      <th className="border px-2">Node</th>
                      <th className="border px-2">Sources</th>
                      <th className="border px-2">Layer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const { joinStack, levels, gatewayGroups } = analyzeGatewaysAndJoins(r.analysis);

  // 計算 joinPoints
  const joinPoints = Object.entries(gatewayGroups).flatMap(([gw, groups]) =>
    (groups || [])
      .filter(g => g.targets.length > 1)
      .map(g => ({
        node: gw,
        sources: g.targets,
        layer: levels[gw] ?? 0,
      }))
  );

  return joinPoints.map((item: any, i: number) => (
    <tr key={i}>
      <td className="border px-2">{item.node}</td>
      <td className="border px-2">{item.sources.join(', ')}</td>
      <td className="border px-2">{item.layer}</td>
    </tr>
  ));
})()}
                  </tbody>
                </table>
              </section>
              {/* End Join */}
              <section className="mb-10">
                <h2 className="text-xl font-semibold mb-4 text-black">End Point Join</h2>
                <table className="table-auto border text-black">
                  <thead>
                    <tr>
                      <th className="border px-2">Target</th>
                      <th className="border px-2">Notes</th>
                      <th className="border px-2">Order</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const { joinStack } = analyzeGatewaysAndJoins(r.analysis);
                      return (joinStack ?? []).map((item, i) => (
                        <tr key={i}>
                          <td className="border px-2">{item.target}</td>
                          <td className="border px-2">{item.note.join(', ')}</td>
                          <td className="border px-2">{item.order}</td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </section>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default BatchTestPage;
