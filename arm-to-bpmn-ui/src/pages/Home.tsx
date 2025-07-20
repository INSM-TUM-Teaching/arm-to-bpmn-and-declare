import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUpload } from 'react-icons/fa';
import { IoIosArrowForward } from "react-icons/io";
import { validateARM } from "../core/validator";
import { Analysis } from 'logic/buildBPMN';

export default function HomePage() {
  const [uploadedARM, setUploadedARM] = useState<Analysis | null>(null);
  const [uploadedDeclare, setUploadedDeclare] = useState(false);
  const [uploadedBPMN, setUploadedBPMN] = useState(false);
  const navigate = useNavigate();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const tmp = JSON.parse(text);
        if (!validateARM(tmp)) return;
        const json = JSON.parse(event.target?.result as string);
        setUploadedARM(json);
      } catch (err: any) {
        alert('Invalid ARM: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleBPMNUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const xmlString = event.target?.result as string;
      if (!xmlString.includes("definitions")) {
        alert("Invalid BPMN file.");
        return;
      }
      setUploadedBPMN(true);
      navigate("/bpmn", { state: { bpmnXml: xmlString } });
    };
    reader.readAsText(file);
  };

  const handleDeclareUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const declareData = JSON.parse(ev.target?.result as string);
        if (!declareData.activities || !declareData.constraints) {
          throw new Error("Invalid Declare model format");
        }
        await fetch('http://localhost:5174/api/save-declare-model', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(declareData)
        });
        setUploadedDeclare(true);
        navigate('/declare', { state: { declare: declareData } });
      } catch (err: any) {
        alert('Invalid Declare model: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  const goToModeler = (path: string) => {
    if (!uploadedARM) {
      alert('Please upload a valid ARM file first.');
      return;
    }
    navigate(path, { state: { arm: uploadedARM } });
  };

  return (
    <div className="min-h-screen flex flex-col items-center space-y-12">
      <div className="text-center bg-[#3070B3] w-full min-h-[240px] py-14">
        <h1 className="text-4xl font-bold mb-2 text-white">BPMN & Declare Modeler</h1>
        <p className="text-lg text-gray-200">
          Upload your Activity Relationship Matrix (ARM), BPMN or Declare model to get started.
        </p>
      </div>

      {!uploadedARM && !uploadedDeclare && !uploadedBPMN ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
          {/* Create New ARM Section */}
          <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center justify-between">
            <h2 className="text-xl font-semibold mb-4">Translate New Model</h2>
            <p className="text-gray-600 mb-4 text-center">
              Upload an ARM file in JSON format to start modeling.
            </p>
            <label className="inline-flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded cursor-pointer hover:bg-purple-700">
              <FaUpload />
              Upload ARM JSON
              <input type="file" accept="application/json" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>

          {/* Upload Existing Section */}
          <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center justify-between">
            <h2 className="text-xl font-semibold mb-4">Upload Existing Model</h2>
            <p className="text-gray-600 mb-4 text-center">
              Upload a BPMN/declare file to start visualizing.
            </p>
            <div className="flex flex-row justify-center gap-4 w-full items-center">
              <label className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded cursor-pointer hover:bg-blue-800">
                <FaUpload />
                Upload BPMN
                <input type="file" accept=".bpmn,application/xml,text/xml" onChange={handleBPMNUpload} className="hidden" />
              </label>
              <label className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded cursor-pointer hover:bg-green-800">
                <FaUpload />
                Upload Declare
                <input type="file" accept="application/json" onChange={handleDeclareUpload} className="hidden" />
              </label>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-4">
            {uploadedARM
              ? 'ARM Uploaded Successfully!'
              : uploadedDeclare
              ? 'Declare Model Uploaded Successfully!'
              : uploadedBPMN
              ? 'BPMN Uploaded Successfully!'
              : ''}
          </h2>

          <div className="flex flex-col md:flex-row gap-6 justify-center">
            <button
              onClick={() => goToModeler('/BPMN')}
              className="bg-[#3070B3] text-white px-6 py-3 rounded shadow hover:bg-blue-800 flex items-center gap-2"
            >
              Go to BPMN Modeler <IoIosArrowForward />
            </button>
            <button
              onClick={() => goToModeler('/declare')}
              className="bg-[#3070B3] text-white px-6 py-3 rounded shadow hover:bg-blue-800 flex items-center gap-2"
            >
              Go to Declare Modeler <IoIosArrowForward />
            </button>
          </div>
        </div>
      )}
      {/* About the Tool Section */}
      <div className="w-full bg-gray-100 py-16 px-4 pt-12">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-[#1a2e49] mb-10">About the Tool</h2>

          <div className="space-y-6 text-gray-700 text-lg">
            <div>
              <h3 className="font-semibold text-xl mb-1">What is ConDec / Declare?</h3>
              <p>
                ConDec (Constraint-based Declarative) modeling allows you to define business processes through constraints and rules rather than explicit control flow. It's perfect for flexible, knowledge-intensive processes where the exact sequence of activities may vary.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-xl mb-1">BPMN Modeling</h3>
              <p>
                Business Process Model and Notation (BPMN) provides a standardized graphical notation for modeling business processes. Our tool supports the  BPMN specification with professional modeling capabilities.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-xl mb-1">Unified Front</h3>
              <p className="bg-purple-100 p-3 rounded">
                Use our tool for both BPMN and Declare modeling. Upload your Activity Relationship Matrix (ARM) to visualize it in BPMN or Declare format, or upload existing BPMN/Declare files for further analysis and modification.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Supported Formats Section */}
      <div className="w-full py-14 px-4 bg-white">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-[#1a2e49] mb-8">Supported Formats</h2>

          <div className="flex flex-wrap justify-center gap-4">
            <span className="bg-gray-200 text-sm px-4 py-2 rounded-md font-medium">Import BPMN: <code>.bpmn</code></span>
            <span className="bg-gray-200 text-sm px-4 py-2 rounded-md font-medium">Export BPMN: <code>.bpmn</code>, <code>.svg</code></span>
            <span className="bg-gray-200 text-sm px-4 py-2 rounded-md font-medium">Import ConDec: <code>.xml</code>, <code>.txt</code>, <code>.json</code></span>
            <span className="bg-gray-200 text-sm px-4 py-2 rounded-md font-medium">Export ConDec: <code>.json</code>, <code>.svg</code></span>
          </div>
        </div>
      </div>

    </div>
  );
}
