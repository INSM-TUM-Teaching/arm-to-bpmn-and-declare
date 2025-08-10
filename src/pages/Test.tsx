import { useEffect, useState, useRef } from 'react';
import { buildBPMN } from '../logic/buildBPMN';
import { AdvancedLevelStrategy } from '../logic/other logics/AdvancedLevelStrategy';
import { buildBPMNModelWithAnalysis } from '../logic/buildBPMNModelWithAnalysis';
import type { ARMMatrix } from '../logic/translateARM';
import BpmnViewer from 'bpmn-js/lib/NavigatedViewer';
import { AdvancedGatewayStrategy } from '../logic/other logics/AdvancedGatewayStrategy';
import { FiDownload } from 'react-icons/fi';
import { LayerAwareGatewayStrategy } from '../logic/other logics/LayerAwareGatewayStrategy';
import { analyzeGatewaysAndJoins } from '../logic/other logics/analyzeGatewaysAndJoins';

//Sample with 3 gateways **Edited after kerstin feedback
const sampleARM3: ARMMatrix = {
  a: { a: ["x", "x"], b: ["<d", "⇐"], c: ["<", "⇐"], d: ["<", "⇔"], e: ["<d", "⇐"] },
  b: { a: [">d", "⇒"], b: ["x", "x"], c: ["<d", "⇔"], d: ["<", "⇒"], e: ["-", "⇎"] },
  c: { a: [">", "⇒"], b: [">d", "⇔"], c: ["x", "x"], d: ["<d", "⇒"], e: ["-", "⇎"] },
  d: { a: [">", "⇔"], b: [">", "⇐"], c: [">d", "⇐"], d: ["x", "x"], e: [">d", "⇐"] },
  e: { a: [">d", "⇒"], b: ["-", "⇎"], c: ["-", "⇎"], d: ["<d", "⇒"], e: ["x", "x"] }
};


// //very simple example with no gateways
const sampleARM0: ARMMatrix = {
  a: { a: ["x", "x"], b: ["<d", "⇔"] },
  b: { a: [">d", "⇔"], b: ["x", "x"] }
}


// //simple exxclusive gateway example
const sampleARM1: ARMMatrix = {
  a: { a: ["x", "x"], b: ["<d", "⇐"], c: ["<d", "⇐"], d: ["<", "⇔"] },
  b: { a: [">d", "⇒"], b: ["x", "x"], c: ["-", "⇎"], d: ["<d", "⇒"] },
  c: { a: [">d", "⇒"], b: ["-", "⇎"], c: ["x", "x"], d: ["<d", "⇒"] },
  d: { a: [">", "⇔"], b: [">d", "⇐"], c: [">d", "⇐"], d: ["x", "x"] },
};

// //simple exclusive gateway sample 2 with more activites 
const sampleARM2: ARMMatrix = {
  a: { a: ["x", "x"], b: ["<d", "⇔"], c: ["<", "⇐"], d: ["<", "⇐"], e: ["<", "⇔"] },
  b: { a: [">d", "⇔"], b: ["x", "x"], c: ["<d", "⇐"], d: ["<d", "⇐"], e: ["<", "⇔"] },
  c: { a: [">", "⇒"], b: [">d", "⇒"], c: ["x", "x"], d: ["-", "⇎"], e: ["<d", "⇒"] },
  d: { a: [">", "⇒"], b: [">d", "⇒"], c: ["-", "⇎"], d: ["x", "x"], e: ["<d", "⇒"] },
  e: { a: [">", "⇔"], b: [">", "⇔"], c: [">d", "⇐"], d: [">d", "⇐"], e: ["x", "x"] },
}

//1st page example of kerstin's paper on the right
const sampleARM5: ARMMatrix = {
  a: { a: ["x", "x"], b: [">", "⇐"], c: ["-", "⇔"], d: ["<", "⇔"], e: [">", "⇐"] },
  b: { a: ["<", "⇒"], b: ["x", "x"], c: ["-", "⇒"], d: ["<", "⇒"], e: ["-", "⇎"] },
  c: { a: ["-", "⇔"], b: ["-", "⇐"], c: ["x", "x"], d: ["<", "⇔"], e: ["-", "⇐"] },
  d: { a: [">", "⇔"], b: [">", "⇐"], c: [">", "⇔"], d: ["x", "x"], e: [">", "⇐"] },
  e: { a: ["<", "⇒"], b: ["-", "⇎"], c: ["-", "⇒"], d: ["<", "⇒"], e: ["x", "x"] },
}

// //simple exclusive example with 3 activites/branches
const sampleARM6: ARMMatrix = {
  "a": { "a": ["x", "x"], "b": ["<d", "⇐"], "c": ["<d", "⇐"], "d": ["<d", "⇐"], "e": ["<", "⇔"] },
  "b": { "a": [">d", "⇒"], "b": ["x", "x"], "c": ["-", "⇎"], "d": ["-", "⇎"], "e": ["<d", "⇒"] },
  "c": { "a": [">d", "⇒"], "b": ["-", "⇎"], "c": ["x", "x"], "d": ["-", "⇎"], "e": ["<d", "⇒"] },
  "d": { "a": [">d", "⇒"], "b": ["-", "⇎"], "c": ["-", "⇎"], "d": ["x", "x"], "e": ["<d", "⇒"] },
  "e": { "a": [">", "⇔"], "b": [">d", "⇐"], "c": [">d", "⇐"], "d": [">d", "⇐"], "e": ["x", "x"] }
}

//simple parallel example
const sampleARM: ARMMatrix = {
  "a": { "a": ["x", "x"], "b": ["<", "⇔"], "c": ["<", "⇔"], "d": ["<", "⇔"] },
  "b": { "a": [">", "⇔"], "b": ["x", "x"], "c": ["-", "⇔"], "d": ["<", "⇔"] },
  "c": { "a": [">", "⇔"], "b": ["-", "⇔"], "c": ["x", "x"], "d": ["<", "⇔"] },
  "d": { "a": [">", "⇔"], "b": [">", "⇔"], "c": [">", "⇔"], "d": ["x", "x"] }
};

//sample or gateway
const sampleARM7: ARMMatrix = {
  "a": {
    "a": ["x", "x"],
    "b": ["<", "⇐"],
    "c": ["<", "⇐"],
    "d": ["<", "⇒"]
  },
  "b": {
    "a": [">", "⇒"],
    "b": ["x", "x"],
    "c": ["-", "∨"],
    "d": ["<", "⇒"]
  },
  "c": {
    "a": [">", "⇒"],
    "b": ["-", "∨"],
    "c": ["x", "x"],
    "d": ["<", "⇒"]
  },
  "d": {
    "a": [">", "⇐"],
    "b": [">", "⇐"],
    "c": [">", "⇐"],
    "d": ["x", "x"]
  }
}


//another example with gatewaytogateway
const sampleARM8: ARMMatrix = {
  "a": { "a": ["x", "x"], "b": ["<d", "⇐"], "c": ["<d", "⇐"], "d": ["<", "⇔"], "e": ["<", "⇔"], "f": ["<", "⇔"] },
  "b": { "a": [">d", "⇒"], "b": ["x", "x"], "c": ["-", "⇎"], "d": ["<", "⇒"], "e": ["<", "⇒"], "f": ["<", "⇒"] },
  "c": { "a": [">d", "⇒"], "b": ["-", "⇎"], "c": ["x", "x"], "d": ["<", "⇒"], "e": ["<", "⇒"], "f": ["<", "⇒"] },
  "d": { "a": [">", "⇔"], "b": [">", "⇐"], "c": [">", "⇐"], "d": ["x", "x"], "e": ["-", "⇔"], "f": ["<", "⇔"] },
  "e": { "a": [">", "⇔"], "b": [">", "⇐"], "c": [">", "⇐"], "d": ["-", "⇔"], "e": ["x", "x"], "f": ["<", "⇔"] },
  "f": { "a": [">", "⇔"], "b": [">", "⇐"], "c": [">", "⇐"], "d": [">", "⇔"], "e": [">", "⇔"], "f": ["x", "x"] }
}

//complex parallel + inclusive example
const sampleARM4: ARMMatrix = {
  "a": { "a": ["x", "x"], "b": ["<", "⇔"], "c": ["<", "⇔"], "d": ["-", "∨"] },
  "b": { "a": [">", "⇔"], "b": ["x", "x"], "c": ["-", "⇔"], "d": ["-", "∨"] },
  "c": { "a": [">", "⇔"], "b": ["-", "⇔"], "c": ["x", "x"], "d": ["-", "∨"] },
  "d": { "a": ["-", "∨"], "b": ["-", "∨"], "c": ["-", "∨"], "d": ["x", "x"] }
};

//event log without noise 1  -- covered
const sampleARM9: ARMMatrix = {
  "a": { "a": ["x", "x"], "b": ["<d", "⇐"], "c": ["<", "⇐"], "d": ["<", "⇔"], "e": ["<d", "⇐"] },
  "b": { "a": [">d", "⇒"], "b": ["x", "x"], "c": ["<d", "⇔"], "d": ["<", "⇒"], "e": ["-", "⇎"] },
  "c": { "a": [">", "⇒"], "b": [">d", "⇔"], "c": ["x", "x"], "d": ["<d", "⇒"], "e": ["-", "⇎"] },
  "d": { "a": [">", "⇔"], "b": [">", "⇐"], "c": [">d", "⇐"], "d": ["x", "x"], "e": [">d", "⇐"] },
  "e": { "a": [">d", "⇒"], "b": ["-", "⇎"], "c": ["-", "⇎"], "d": ["<d", "⇒"], "e": ["x", "x"] }
}


//event log without noise 2 --covered
const sampleARM10: ARMMatrix = {
  "a": { "a": ["x", "x"], "b": ["<", "⇔"], "c": ["<", "⇔"], "d": ["<", "⇔"], "e": ["<", "⇐"], "f": ["<", "⇐"] },
  "b": { "a": [">", "⇔"], "b": ["x", "x"], "c": ["-", "⇔"], "d": ["<", "⇔"], "e": ["<", "⇐"], "f": ["<", "⇐"] },
  "c": { "a": [">", "⇔"], "b": ["-", "⇔"], "c": ["x", "x"], "d": ["<", "⇔"], "e": ["<", "⇐"], "f": ["<", "⇐"] },
  "d": { "a": [">", "⇔"], "b": [">", "⇔"], "c": [">", "⇔"], "d": ["x", "x"], "e": ["<d", "⇐"], "f": ["<d", "⇐"] },
  "e": { "a": [">", "⇒"], "b": [">", "⇒"], "c": [">", "⇒"], "d": [">d", "⇒"], "e": ["x", "x"], "f": ["-", "⇎"] },
  "f": { "a": [">", "⇒"], "b": [">", "⇒"], "c": [">", "⇒"], "d": [">d", "⇒"], "e": ["-", "⇎"], "f": ["x", "x"] }
}

//event log without noise 3
const sampleARM11: ARMMatrix = {
  "a": { "a": ["x", "x"], "b": ["<d", "-"], "c": ["<", "⇒"], "d": ["-", "⇎"], "e": ["<d", "-"], "f": ["-", "⇎"] },
  "b": { "a": [">d", "-"], "b": ["x", "x"], "c": ["<d", "-"], "d": [">d", "-"], "e": ["-", "⇎"], "f": ["<d", "-"] },
  "c": { "a": [">", "⇐"], "b": [">d", "-"], "c": ["x", "x"], "d": [">", "-"], "e": [">d", "-"], "f": ["-", "⇎"] },
  "d": { "a": ["-", "⇎"], "b": ["<d", "-"], "c": ["<", "-"], "d": ["x", "x"], "e": ["<d", "-"], "f": ["<", "⇐"] },
  "e": { "a": [">d", "-"], "b": ["-", "⇎"], "c": ["<d", "-"], "d": [">d", "-"], "e": ["x", "x"], "f": ["<d", "-"] },
  "f": { "a": ["-", "⇎"], "b": [">d", "-"], "c": ["-", "⇎"], "d": [">", "⇒"], "e": [">d", "-"], "f": ["x", "x"] }
}


//event log without noise 4 --covered 
const sampleARM12: ARMMatrix = {
  "a": { "a": ["x", "x"], "b": ["<", "⇔"], "c": ["<", "⇔"], "d": ["<", "⇒"], "e": ["-", "⇎"]},
  "b": { "a": [">", "⇔"], "b": ["x", "x"], "c": ["-", "⇔"], "d": ["<", "⇒"], "e": ["-", "⇎"] },
  "c": { "a": [">", "⇔"], "b": ["-", "⇔"], "c": ["x", "x"], "d": ["<", "⇒"], "e": ["-", "⇎"] },
  "d": { "a": [">", "⇐"], "b": [">", "⇐"], "c": [">", "⇐"], "d": ["x", "x"], "e": [">d", "⇐"]},
  "e": { "a": ["-", "⇎"], "b": ["-", "⇎"], "c": ["-", "⇎"], "d": ["<d", "⇒"], "e": ["x", "x"]},
}

//event log without noise 5 --covered
const sampleARM13: ARMMatrix = {
  "a": { "a": ["x", "x"], "b": ["<d", "⇐"], "c": ["-", "⇔"], "d": ["<", "⇔"], "e": ["<d", "⇐"] },
  "b": { "a": [">d", "⇒"], "b": ["x", "x"], "c": ["-", "⇒"], "d": ["<", "⇒"], "e": ["-", "⇎"] },
  "c": { "a": ["-", "⇔"], "b": ["-", "⇐"], "c": ["x", "x"], "d": ["<", "⇔"], "e": ["-", "⇐"] },
  "d": { "a": [">", "⇔"], "b": [">", "⇐"], "c": [">", "⇔"], "d": ["x", "x"], "e": [">", "⇐"]},
  "e": { "a": [">d", "⇒"], "b": ["-", "⇎"], "c": ["-", "⇒"], "d": ["<", "⇒"], "e": ["x", "x"]},
}

//event log without noise 6 
//skips
export const sampleARM16: ARMMatrix = {
  "a": { "a": ["x", "x"], "b": ["<", "⇔"], "c": ["<", "⇔"], "d": [">d", "-"]},
  "b": { "a": [">", "⇔"], "b": ["x", "x"], "c": ["-", "⇔"], "d": [">", "-"]},
  "c": { "a": [">", "⇔"], "b": ["-", "⇔"], "c": ["x", "x"], "d": [">", "-"]},
  "d": { "a": ["<d", "-"], "b": ["<", "-"], "c": ["<", "-"], "d": ["x", "x"]},
};

//event log without noise 7 //also inucludes skips
const sampleARM14: ARMMatrix = {
  "a": { "a": ["x", "x"], "b": ["-", "⇐"], "c": ["-", "⇐"], "d": ["-", "⇔"], "e": ["-", "⇔"] },
  "b": { "a": ["-", "⇒"], "b": ["x", "x"], "c": ["-", "⇎"], "d": ["<", "⇒"], "e": ["<", "⇒"] },
  "c": { "a": ["-", "⇒"], "b": ["-", "⇎"], "c": ["x", "x"], "d": ["<", "⇒"], "e": ["<", "⇒"] },
  "d": { "a": [">", "⇔"], "b": [">", "⇐"], "c": [">", "⇐"], "d": ["x", "x"], "e": ["-", "⇔"]},
  "e": { "a": ["-", "⇔"], "b": [">", "⇐"], "c": [">", "⇐"], "d": ["-", "⇔"], "e": ["x", "x"]},
}

//event log qithout noise 9 
const sampleARM17: ARMMatrix = {
  "a": { "a": ["x", "x"], "b": ["-", "⇎"], "c": ["<", "⇒"], "d": ["<", "⇒"], "e": ["-", "⇎"], "f": ["-", "⇎"] },
  "b": { "a": ["-", "⇎"], "b": ["x", "x"], "c": ["<", "⇒"], "d": ["<", "⇒"], "e": ["-", "⇎"], "f": ["-", "⇎"] },
  "c": { "a": [">", "⇐"], "b": [">", "⇐"], "c": ["x", "x"], "d": ["-", "⇔"], "e": ["-", "⇎"], "f": ["-", "⇎"] },
  "d": { "a": [">", "⇐"], "b": [">", "⇐"], "c": ["-", "⇔"], "d": ["x", "x"], "e": ["-", "⇎"], "f": ["-", "⇎"] },
  "e": { "a": ["-", "⇎"], "b": ["-", "⇎"], "c": ["-", "⇎"], "d": ["-", "⇎"], "e": ["x", "x"], "f": ["<d", "⇔"] },
  "f": { "a": ["-", "⇎"], "b": ["-", "⇎"], "c": ["-", "⇎"], "d": ["-", "⇎"], "e": [">d", "⇔"], "f": ["x", "x"] }
}

//event log 10 --covered
export const sampleARM15: ARMMatrix = {
  "a": { "a": ["x", "x"], "b": ["<d", "⇐"], "c": ["<d", "⇐"], "d": ["-", "⇎"]},
  "b": { "a": [">d", "⇒"], "b": ["x", "x"], "c": ["-", "⇎"], "d": ["-", "⇎"]},
  "c": { "a": [">d", "⇒"], "b": ["-", "⇎"], "c": ["x", "x"], "d": ["-", "⇎"]},
  "d": { "a": ["-", "⇎"], "b": ["-", "⇎"], "c": ["-", "⇎"], "d": ["x", "x"]},
};



function Test() {
  const [temporalChains, setTemporalChains] = useState<string[][]>([]);
  const [exclusiveRelations, setExclusiveRelations] = useState<[string, string][]>([]);
  const [parallelRelations, setParallelRelations] = useState<[string, string][]>([]);
  const [directTemporalChains, setDirectTemporalChains] = useState<[string, string][]>([]);
  const [optionalDependencies, setOptionalDependencies] = useState<[string, string][]>([]);
  const [orRelations, setOrRelations] = useState<[string, string][]>([]);
  const [topoOrder, setTopoOrder] = useState<string[]>([]);
  const [bpmnXml, setBpmnXml] = useState<string>("");
  const [levelMap, setLevelMap] = useState<Record<string, number>>({});
  const [gatewayGroups, setGatewayGroups] = useState<Record<string, any[]>>({});
  const [joinStack, setJoinStack] = useState<any[]>([]);
  const [joinPoints, setJoinPoints] = useState<any[]>([]);
  const [endJoins, setEndJoins] = useState<any[]>([]);
  const viewerRef = useRef<HTMLDivElement>(null);
  const viewerInstance = useRef<any>(null);

  useEffect(() => {

    if (viewerRef.current && bpmnXml) {
      const viewer = new BpmnViewer({ container: viewerRef.current });
      viewer.importXML(bpmnXml).then(() => {
        const canvas = viewer.get('canvas') as any;
        canvas.zoom('fit-viewport');
      }).catch(err => {
        console.error('Failed to render diagram:', err);
      });
      //for exporting as image
      viewerInstance.current = viewer;
    }

  }, [bpmnXml]);

  const testLogicFunctions = async () => {
    const rawAnalysis = buildBPMNModelWithAnalysis(sampleARM11);
    
    const analysis = {
      activities: rawAnalysis.topoOrder,
      temporalChains: rawAnalysis.chains,
      exclusiveRelations: rawAnalysis.exclusive,
      parallelRelations: rawAnalysis.parallel,
      optionalDependencies: rawAnalysis.optional,
      directDependencies: rawAnalysis.directChains,
      topoOrder: rawAnalysis.topoOrder,
      orRelations: rawAnalysis.orRelations,
      //activityLevels: rawAnalysis.activityLevels
    };

    // 2. Build BPMN XML from analysis
    //const xml = await buildBPMN(analysis);
    const xml = await buildBPMN(analysis);

    // 3. Set BPMN XML in state
    setBpmnXml(xml);

    setTemporalChains(rawAnalysis.chains);
    setExclusiveRelations(rawAnalysis.exclusive);
    setParallelRelations(rawAnalysis.parallel);
    setDirectTemporalChains(rawAnalysis.directChains);
    setOptionalDependencies(rawAnalysis.optional.map(([a, b]) => [a, b]));
    setTopoOrder(rawAnalysis.topoOrder);
    setOrRelations(rawAnalysis.orRelations);
    {
      /*
    // 4. Analyze gateway/join/end join
    const { gatewayStack, joinPoints, endJoins, levels } = analyzeGatewaysAndJoins(analysis);
    setJoinStack(gatewayStack);
    setJoinPoints(joinPoints);
    setEndJoins(endJoins);
    setLevelMap(levels);

    // 4. Calculate levelMap and setState
    const nodes = analysis.activities.slice(); // Create a copy
    const edges = analysis.directDependencies.length
      ? analysis.directDependencies.slice()
      : analysis.temporalChains.slice();

    // Find level 0 nodes
    const level0Nodes = nodes.filter(n => levels[n] === 0);

    // If there's no start node, add one
    if (!nodes.includes('start')) nodes.unshift('start');
    // start points to all level 0 nodes
    level0Nodes.forEach(n => {
      if (!edges.some(([from, to]) => from === 'start' && to === n)) {
        edges.push(['start', n]);
      }
    });
    setLevelMap(levels);

    // 5. gateway groupings
    const gatewayStrategy = new LayerAwareGatewayStrategy();
    const groupResult: Record<string, any[]> = {};
    for (const node of nodes) {
      const directTargets = edges
        .filter(([from]) => from === node)
        .map(([, to]) => to);
      const groups = gatewayStrategy.groupSuccessors(node, directTargets, {
        ...analysis,
        activityLevels: levels,
      });
      groupResult[node] = groups || [];
    }
    setGatewayGroups(groupResult);
      };
  */
    }
  }

  // Function to export BPMN as image
  const exportSVG = async () => {
    if (!viewerInstance.current) return;
    try {
      const { svg } = await viewerInstance.current.saveSVG();
      const blob = new Blob([svg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = 'bpmn-diagram.svg';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('SVG Export Error:', err);
    }
  };

  const exportPNG = async () => {
    if (!viewerInstance.current) return;
    try {
      const { svg } = await viewerInstance.current.saveSVG();

      // Convert SVG to PNG
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();
      const svgBlob = new Blob([svg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(svgBlob);

      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);

        canvas.toBlob(blob => {
          if (!blob) return;
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'bpmn-diagram.png';
          a.click();
        });
      };
      img.src = url;
    } catch (err) {
      console.error('PNG Export Error:', err);
    }
  };


  return (
    <div className="min-h-screen bg-white min-w-screen">
      <main className="px-6 py-10 md:px-12 lg:px-32">
        <header className="mb-12">
          <h1 className="text-3xl font-bold text-[#3070B3]">Welcome to ARM to BPMN Translator</h1>
          <p className="text-gray-600 mt-2">Easily translate your ARM matrices into BPMN models.</p>
        </header>

        <div className="flex flex-wrap gap-4 mb-8">
          <button onClick={testLogicFunctions} className="bg-[#3070B3] text-white px-4 py-2 rounded shadow hover:bg-blue-800">
            Generate & View BPMN
          </button>

          {/**Export button */}
          {bpmnXml && (
            <button
              onClick={() => {
                const blob = new Blob([bpmnXml], { type: 'application/xml' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'bpmn-diagram.bpmn';
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="flex gap-2 items-center bg-purple-600 text-white px-4 py-2 rounded shadow hover:bg-purple-700"
            >
              Export BPMN XML
              <FiDownload />
            </button>
          )}
          {/**export as image */}
          {bpmnXml && (
            <div className="flex flex-wrap gap-4">
              <button
                onClick={exportSVG}
                className="flex gap-2 items-center bg-purple-600 text-white px-4 py-2 rounded shadow hover:bg-purple-700"
              >
                Export as SVG
                <FiDownload />
              </button>
              <button
                onClick={exportPNG}
                className="flex gap-2 items-center bg-purple-600 text-white px-4 py-2 rounded shadow hover:bg-purple-700"
              >
                Export as PNG
                <FiDownload />
              </button>
            </div>
          )}


        </div>

        {/* Logic Output Section */}
        <section id="output" className="mb-10">
          <h2 className="text-xl font-semibold mb-4">Logic Analysis Output</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <h3 className="font-medium text-gray-800 mb-1">Temporal Chains</h3>
              <ul className="text-sm text-gray-700 space-y-1">{temporalChains.map((chain, idx) => <li key={idx}>{chain.join(" → ")}</li>)}</ul>
            </div>
            <div>
              <h3 className="font-medium text-gray-800 mb-1">Exclusive Relations X</h3>
              <ul className="text-sm text-gray-700 space-y-1">{exclusiveRelations.map(([a, b], i) => <li key={i}>{a} x {b}</li>)}</ul>
            </div>
            <div>
              <h3 className="font-medium text-gray-800 mb-1">Parallel Relations + </h3>
              <ul className="text-sm text-gray-700 space-y-1">{parallelRelations.map(([a, b], i) => <li key={i}>{a} + {b}</li>)}</ul>
            </div>
            <div>
              <h3 className="font-medium text-gray-800 mb-1">Direct Temporal Dependencies</h3>
              <ul className="text-sm text-gray-700 space-y-1">{directTemporalChains.map(([a, b], i) => <li key={i}>{a} → {b}</li>)}</ul>
            </div>
            <div>
              <h3 className="font-medium text-gray-800 mb-1">OR Dependencies</h3>
              <ul className="text-sm text-gray-700 space-y-1">{orRelations.map(([a, b], i) => <li key={i}>{a} v {b}</li>)}</ul>
            </div>
            <div>
              <h3 className="font-medium text-gray-800 mb-1">Optional Dependencies</h3>
              <ul className="text-sm text-gray-700 space-y-1">{optionalDependencies.map(([a, b], i) => <li key={i}>{a} ?→ {b}</li>)}</ul>
            </div>

          </div>
        </section>

        {/* BPMN Viewer */}
        <section id="viewer" className="mb-10">
          <h2 className="text-xl font-semibold mb-4">🧾 BPMN Viewer</h2>
          <div ref={viewerRef} style={{ height: '600px', width: '100%', border: '1px solid #ccc' }} />
        </section>

        {/* Debug XML Output */}
        <section className="mb-16">
          <h2 className="text-xl font-semibold mb-4">🔧 BPMN XML Output (Debug)</h2>
          <textarea value={bpmnXml} readOnly rows={20} className="w-full font-mono p-2 border" />
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
              {Object.entries(levelMap).map(([act, lvl]) => (
                <tr key={act}>
                  <td className="border px-2">{act}</td>
                  <td className="border px-2">{lvl}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Gateway Groupings (AdvancedGatewayStrategy) */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4 text-black">Gateway Groupings (AdvancedGatewayStrategy)</h2>
          <table className="table-auto border text-black">
            <thead>
              <tr>
                <th className="border px-2">Activity</th>
                <th className="border px-2">Groups</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(gatewayGroups).map(([act, groups]) => (
                <tr key={act}>
                  <td className="border px-2 align-top">{act}</td>
                  <td className="border px-2">
                    {groups.length === 0
                      ? <span className="text-gray-400">-</span>
                      : groups.map((g, i) => (
                        <div key={i}>
                          <b>{g.type}:</b> {g.targets.join(', ')}
                        </div>
                      ))}
                  </td>
                </tr>
              ))}
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
              {joinStack.map((item, i) => (
                <tr key={i}>
                  <td className="border px-2">{item.nodes.join(', ')}</td>
                  <td className="border px-2">{item.target}</td>
                  <td className="border px-2">{item.gateway_type}</td>
                  <td className="border px-2">{item.layers}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Join Points (Multi-in) */}
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
              {joinPoints.map((item, i) => (
                <tr key={i}>
                  <td className="border px-2">{item.node}</td>
                  <td className="border px-2">{item.sources.join(', ')}</td>
                  <td className="border px-2">{item.layer}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* End Point Join */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4 text-black">End Point Join</h2>
          <table className="table-auto border text-black">
            <thead>
              <tr>
                <th className="border px-2">End</th>
                <th className="border px-2">Sources</th>
                <th className="border px-2">Layer</th>
              </tr>
            </thead>
            <tbody>
              {(endJoins ?? []).map((item, i) => (
                <tr key={i}>
                  <td className="border px-2">{item.end}</td>
                  <td className="border px-2">{item.sources.join(', ')}</td>
                  <td className="border px-2">{item.layer}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* How to Use */}
        <footer id="how" className="pt-6 border-t text-sm text-gray-600">
          <h2 className="text-md font-semibold mb-2">How to Use:</h2>
          <ol className="list-decimal ml-6 space-y-1">
            <li>Click the "Generate & View BPMN" button to run the analysis on a sample ARM matrix.</li>
            <li>The logic output (chains, exclusives, etc.) will appear above.</li>
            <li>The translated BPMN diagram will be shown in the viewer section.</li>
            <li>You can copy the BPMN XML for further use or save it externally.</li>
          </ol>
        </footer>
      </main>
    </div>
  );
}

export default Test;
