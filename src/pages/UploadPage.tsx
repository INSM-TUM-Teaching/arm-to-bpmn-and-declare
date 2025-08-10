

//-----------not used------------

import React, { useRef, useState } from "react";
import { buildBPMN } from "../logic/buildBPMN";
import { buildBPMNModelWithAnalysis } from "../logic/buildBPMNModelWithAnalysis";
import { BpmnViewer } from "../components/BpmnViewer";
import type { ARMMatrix } from "../logic/translateARM";
import { validateARM } from "../core/validator";

const UploadPage: React.FC = () => {
  const [matrix, setMatrix] = useState<ARMMatrix | null>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [bpmnXml, setBpmnXml] = useState<string>("");
  const [imgUrl, setImgUrl] = useState<string | null>(null);

  // refs for hidden file inputs
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const imgInputRef = useRef<HTMLInputElement>(null);

  const handleJsonUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      const json = JSON.parse(text);
      if (!validateARM(json)) {
        return;
      }
      setMatrix(json);
      setAnalysis(null);
      setBpmnXml("");
    } catch (err: any) {
      alert('Invalid ARM: ' + err.message);
    }
  };

  const handleImgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImgUrl(URL.createObjectURL(file));
  };

  const handleGenerate = async () => {
    if (!matrix) return;
    const rawAnalysis = buildBPMNModelWithAnalysis(matrix);
    const analysisObj = {
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
    setAnalysis(analysisObj);
    const xml = await buildBPMN(analysisObj);
    setBpmnXml(xml);
  };

  return (
    <div className="p-6 text-black">
      <h1 className="text-3xl font-bold mb-6 text-black">Upload ARM Matrix</h1>
      <div className="mb-4 flex flex-col gap-4">
        <label className="block font-semibold text-black">Upload ARM JSON file:</label>
        <input
          type="file"
          accept=".json,application/json"
          ref={jsonInputRef}
          onChange={handleJsonUpload}
          style={{ display: "none" }}
        />
        <button
          className={`px-4 py-2 rounded font-semibold text-white ${matrix ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"}`}
          onClick={() => jsonInputRef.current?.click()}
        >
          {matrix ? "JSON File Selected" : "Choose JSON File"}
        </button>
      </div>
      <div className="mb-4 flex flex-col gap-4">
        <label className="block font-semibold text-black">Upload Expected Diagram (PNG, optional):</label>
        <input
          type="file"
          accept="image/png"
          ref={imgInputRef}
          onChange={handleImgUpload}
          style={{ display: "none" }}
        />
        <button
          className="px-4 py-2 rounded font-semibold text-white bg-blue-600 hover:bg-blue-700"
          onClick={() => imgInputRef.current?.click()}
        >
          {imgUrl ? "PNG File Selected" : "Choose PNG File"}
        </button>
      </div>
      <div className="mb-6">
        <button
          className={`px-4 py-2 rounded font-semibold text-white ${matrix ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-400 cursor-not-allowed"}`}
          onClick={handleGenerate}
          disabled={!matrix}
        >
          Generate
        </button>
      </div>
      {!matrix && (
        <div className="mb-4 text-red-600 font-semibold">
          Please upload a valid ARM JSON file before generating.
        </div>
      )}
      {analysis && (
        <div className="space-y-6">
          {/* Logic Output Section */}
          <section className="mb-10">
            <h2 className="text-xl font-semibold mb-4 text-black">Logic Analysis Output</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <h3 className="font-medium text-black mb-1">Temporal Chains</h3>
                <ul className="text-sm text-black space-y-1">
                  {analysis.chains?.map((chain: string[], idx: number) => <li key={idx}>{chain.join(" → ")}</li>)}
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-black mb-1">Exclusive Relations X</h3>
                <ul className="text-sm text-black space-y-1">
                  {analysis.exclusive?.map(([a, b]: string[], i: number) => <li key={i}>{a} x {b}</li>)}
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-black mb-1">Parallel Relations + </h3>
                <ul className="text-sm text-black space-y-1">
                  {analysis.parallel?.map(([a, b]: string[], i: number) => <li key={i}>{a} + {b}</li>)}
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-black mb-1">Direct Temporal Dependencies</h3>
                <ul className="text-sm text-black space-y-1">
                  {analysis.directChains?.map(([a, b]: string[], i: number) => <li key={i}>{a} → {b}</li>)}
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-black mb-1">OR Dependencies</h3>
                <ul className="text-sm text-black space-y-1">
                  {analysis.orRelations?.map(([a, b]: string[], i: number) => <li key={i}>{a} v {b}</li>)}
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-black mb-1">Optional Dependencies</h3>
                <ul className="text-sm text-black space-y-1">
                  {analysis.optional?.map(([a, b]: string[], i: number) => <li key={i}>{a} ?→ {b}</li>)}
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-black mb-1">Topological Order</h3>
                <ul className="text-sm text-black space-y-1">
                  {analysis.topoOrder?.map((node: string, i: number) => <li key={i}>{i + 1}. {node}</li>)}
                </ul>
              </div>
            </div>
          </section>
          {/* BPMN Viewer */}
          <section className="mb-10">
            <h2 className="text-xl font-semibold mb-4 text-black">🧾 BPMN Viewer</h2>
            {bpmnXml && bpmnXml.includes("<bpmn:definitions")
              ? <BpmnViewer xml={bpmnXml} />
              : <div className="text-red-600">Invalid BPMN XML</div>
            }
          </section>
          {/* Expected */}
          {imgUrl && (
            <section>
              <h2 className="font-semibold text-black">Expected Diagram (PNG)</h2>
              <img
                src={imgUrl}
                alt="Expected Diagram"
                loading="lazy"
                className="max-w-full border"
              />
            </section>
          )}
        </div>
      )}
    </div>
  );
};

export default UploadPage;