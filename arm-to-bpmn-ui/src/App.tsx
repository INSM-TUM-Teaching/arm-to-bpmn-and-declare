import { useEffect, useState } from 'react';
import { buildBPMN, generateBPMNXml, insertParallelGateways } from './logic/buildBPMN';
import { stableTopoSort } from './logic/translateARM';
import { BpmnViewer } from './components/BpmnViewer';
import type { ARMMatrix } from './logic/translateARM';

//export type Existential = "⇔" | "⇎" | "⇒" | "⇐" | "x";

//ARM Sample
const sampleARM: ARMMatrix = {
  a: {
    a: ["x", "x"],
    b: ["<d", "⇐"],
    c: ["<", "⇐"],
    d: ["<", "⇔"],
    e: ["<d", "⇐"]
  },
  b: {
    a: [">d", "⇒"],
    b: ["x", "x"],
    c: ["<d", "⇔"],
    d: ["<", "⇒"],
    e: ["-", "⇎"]
  },
  c: {
    a: [">", "⇒"],
    b: [">d", "⇔"],
    c: ["x", "x"],
    d: ["<d", "⇒"],
    e: ["-", "⇎"]
  },
  d: {
    a: [">", "⇔"],
    b: [">", "⇐"],
    c: [">d", "⇐"],
    d: ["x", "x"],
    e: ["<d", "⇐"]
  },
  e: {
    a: [">d", "⇒"],
    b: ["-", "⇎"],
    c: ["-", "⇎"],
    d: [">d", "⇒"],
    e: ["x", "x"]
  }
};


function App() {
  const [log, setLog] = useState<string[]>([]);
  const [bpmnXml, setBpmnXml] = useState('');

  useEffect(() => {
    const logs: string[] = [];

    // Patch console.log
    const originalLog = console.log;
    console.log = (...args) => {
      const text = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
      logs.push(text);
      originalLog(...args);
    };

    // Translation logic
    const model = buildBPMN(sampleARM);
    insertParallelGateways(model, sampleARM);
    const xml = generateBPMNXml(model);

    setBpmnXml(xml);
    setLog(logs);

    // Restore console
    console.log = originalLog;
  }, []);
  
  const layers = stableTopoSort(sampleARM);


  return (
    <div className="p-6 font-mono text-orange-700">
      <h1 className="text-xl font-bold mb-4">ARM → BPMN Translator</h1>
      <p>Topological Layers:</p>
      <pre>{JSON.stringify(layers, null, 2)}</pre>
      <BpmnViewer xml={bpmnXml} />
      
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-2">🧾 Log Output</h2>
        <div className="bg-orange-100 p-4 rounded border border-orange-300 max-h-96 overflow-y-auto">
          {log.map((line, i) => (
            <pre key={i} className="text-sm text-orange-900">{line}</pre>
          ))}
        </div>
        <div className="mt-8">
        <h2 className="text-xl font-semibold mb-2">📄 BPMN XML</h2>
          <div className="bg-orange-50 p-4 rounded border border-orange-200 max-h-96 overflow-y-auto">
            <pre className="text-xs text-orange-800 whitespace-pre-wrap">{bpmnXml}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
