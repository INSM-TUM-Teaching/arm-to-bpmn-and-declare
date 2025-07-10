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
import { Analysis } from './../logic/buildBPMN';
import { useLocation } from 'react-router-dom';

// Then return it properly
function BPMN() {
  const location = useLocation();
  const ARM = location.state?.arm as ARMMatrix | null;
  const passedXml = location.state?.bpmnXml as string | undefined;

  if (!ARM && !passedXml) {
    return <div className="flex justify-center items-center min-h-[80vh] p-10 text-red-600 text-xl font-bold">❗ No ARM or BPMN provided. Please upload a model first.</div>;
  }
  
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [bpmnXml, setBpmnXml] = useState<string>("");

  const viewerRef = useRef<HTMLDivElement>(null);
  const viewerInstance = useRef<any>(null);
  //translate ARM
  // Load and render BPMN as soon as ARM is available
  useEffect(() => {
    const translateARM = async () => {
      if (!ARM) return;
      const rawAnalysis = buildBPMNModelWithAnalysis(ARM);

      const formattedAnalysis: Analysis = {
        activities: rawAnalysis.activities,
        temporalChains: rawAnalysis.chains,
        exclusiveRelations: rawAnalysis.exclusive,
        parallelRelations: rawAnalysis.parallel,
        optionalDependencies: rawAnalysis.optional,
        orRelations: rawAnalysis.orRelations,
        directDependencies: rawAnalysis.directChains,
      };

      const xml = await buildBPMN(formattedAnalysis);
      setBpmnXml(xml);
      setAnalysis(formattedAnalysis);
    };

    if (ARM) {
      translateARM();
    } else if (passedXml) {
      setBpmnXml(passedXml);
    }
  }, [ARM, passedXml]);

  // When bpmnXml is set, render BPMN diagram
  useEffect(() => {
    if (!viewerRef.current || !bpmnXml) return;

    if (viewerInstance.current) {
      viewerInstance.current.destroy();
      viewerInstance.current = null;
    }

    const viewer = new BpmnViewer({ container: viewerRef.current });

    viewer.importXML(bpmnXml)
      .then(() => {
        (viewer.get('canvas') as any).zoom('fit-viewport');
      })
      .catch((err) => console.error('Failed to render BPMN:', err));

    viewerInstance.current = viewer;

    return () => {
      if (viewerInstance.current) {
        viewerInstance.current.destroy();
        viewerInstance.current = null;
      }
    };
  }, [bpmnXml]);




  const translateARM = async () => {

    if (!ARM) return; //safeguard

    const rawAnalysis = buildBPMNModelWithAnalysis(ARM);
    const formattedAnalysis: Analysis = {
      activities: rawAnalysis.activities,
      temporalChains: rawAnalysis.chains,
      exclusiveRelations: rawAnalysis.exclusive,
      parallelRelations: rawAnalysis.parallel,
      optionalDependencies: rawAnalysis.optional,
      orRelations: rawAnalysis.orRelations,
      directDependencies: rawAnalysis.directChains,
    };
    const xml = await buildBPMN(formattedAnalysis);

    setBpmnXml(xml);
    setAnalysis(formattedAnalysis);

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


  // Function to export BPMN as PNG
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
      <main className="px-6 py-10 md:px-12 lg:px-16">
        <header className="mb-12">
          <h1 className="text-2xl font-bold text-[#3070B3]">ARM to BPMN</h1>
          <p className="text-gray-600 mt-2">Easily translate your ARM matrices into BPMN models.</p>
        </header>

        <div className="flex flex-wrap gap-4 mb-8">
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
        {ARM && analysis && (
          <section id="output" className="mb-10">
            <h2 className="text-xl font-semibold mb-4">Logic Analysis Output</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <h3 className="font-medium text-gray-800 mb-1">OR Dependencies</h3>
                <ul className="text-sm text-gray-700 space-y-1">{analysis?.orRelations?.map(([a, b], i) => <li key={i}>{a} v {b}</li>)}</ul>
              </div>
              <div>
                <h3 className="font-medium text-gray-800 mb-1">Exclusive Relations X</h3>
                <ul className="text-sm text-gray-700 space-y-1">{analysis?.exclusiveRelations.map(([a, b], i) => <li key={i}>{a} x {b}</li>)}</ul>
              </div>
              <div>
                <h3 className="font-medium text-gray-800 mb-1">Parallel Relations + </h3>
                <ul className="text-sm text-gray-700 space-y-1">{analysis?.parallelRelations.map(([a, b], i) => <li key={i}>{a} + {b}</li>)}</ul>
              </div>

              <div>
                <h3 className="font-medium text-gray-800 mb-1">Direct Temporal Dependencies</h3>
                <ul className="text-sm text-gray-700 space-y-1">{analysis?.directDependencies.map(([a, b], i) => <li key={i}>{a} → {b}</li>)}</ul>
              </div>
              <div>
                <h3 className="font-medium text-gray-800 mb-1">Optional Dependencies</h3>
                <ul className="text-sm text-gray-700 space-y-1">{analysis?.optionalDependencies?.map(([a, b], i) => <li key={i}>{a} ?→ {b}</li>)}</ul>
              </div>

            </div>
          </section>
        )}

        {/* BPMN Viewer */}
        <section id="viewer" className="mb-10">
          <h2 className="text-xl font-semibold mb-4">🧾 BPMN Viewer</h2>
          <div ref={viewerRef} style={{ height: '600px', width: '100%', border: '1px solid #ccc' }} />
        </section>


        {/* How to Use */}
        <footer id="how" className="pt-6 border-t text-sm text-gray-600">
          <h2 className="text-md font-semibold mb-2">How to Use:</h2>
          <ol className="list-decimal ml-6 space-y-1">
            <li>Navigate to Home page, choose your upload option</li>
            <li>Choose BPMN or Declare to generate the model</li>
            <li>The logic output (chains, exclusives, etc.) will appear above.</li>
            <li>The translated BPMN diagram will be shown in the viewer section.</li>
            <li>You can download the BPMN XML for further use or save it externally.</li>
          </ol>
        </footer>
      </main>
    </div>
  );
}

export default BPMN;
