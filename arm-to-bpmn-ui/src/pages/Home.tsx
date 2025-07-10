import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUpload } from 'react-icons/fa';
import { IoIosArrowForward } from "react-icons/io";
import { validateARM } from "../core/validator";
import { Analysis } from 'logic/buildBPMN';


export default function HomePage() {
  const [uploadedARM, setUploadedARM] = useState<Analysis | null>(null);
  const [uploadedDeclare, setUploadedDeclare] = useState(false);
  const navigate = useNavigate();
  const [uploadedBPMN, setUploadedBPMN] = useState(false);

  
const handleBPMNUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = async (event) => {
    const xmlString = event.target?.result as string;

    // Basic check to verify it's a BPMN file
    if (!xmlString.includes("definitions")) {
      alert("Invalid BPMN file.");
      return;
    }

    setUploadedBPMN(true); 
    navigate("/bpmn", { state: { bpmnXml: xmlString } });
  };

  reader.readAsText(file);
};


  //upload Declare model 
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

        navigate('/declare', { state: { declare: declareData } });

      } catch (err: any) {
        alert('Invalid Declare model: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  //upload ARM
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const tmp = JSON.parse(text);
        if (!validateARM(tmp)) {
          return;
        }
        const json = JSON.parse(event.target?.result as string);
        setUploadedARM(json);
      } catch (err: any) {
        alert('Invalid ARM: ' + err.message);
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

  const handleModelUpload = (type: 'bpmn' | 'declare') => {
    // Placeholder: You can customize this logic based on actual file handling
    alert(`You selected a ${type.toUpperCase()} model. Replace this with file processing logic.`);
  };

return (
  <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 space-y-12">

    {!uploadedARM && !uploadedDeclare ? (
      <>
        {/* ARM Upload Section */}
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Welcome to the ARM Modeling Tool</h1>
          <p className="mb-4">Upload your Activity Relationship Matrix (ARM) in JSON format to begin.</p>

          <label className="inline-flex items-center gap-2 bg-purple-500 text-white px-4 py-2 rounded cursor-pointer hover:bg-purple-700">
            <FaUpload />
            Upload ARM JSON
            <input
              type="file"
              accept="application/json"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>

        {/* Already Have a Model? */}
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-4">Already have a model?</h2>
          <div className="flex flex-row gap-4 items-center">
            <label className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded cursor-pointer hover:bg-blue-800">
              <FaUpload />
              Upload BPMN Model
              <input
                type="file"
                accept=".bpmn,application/xml,text/xml"
                onChange={handleBPMNUpload}
                className="hidden"
              />
            </label>

            <label className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded cursor-pointer hover:bg-green-800">
              <FaUpload />
              Upload Declare Model
              <input
                type="file"
                accept="application/json"
                onChange={handleDeclareUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </>
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
        <div className="flex flex-row gap-8 pt-6">
          <button
            className="bg-[#3070B3] text-white px-4 py-2 shadow hover:bg-blue-800 rounded flex items-center justify-center gap-2 transition-colors ease-in"
            onClick={() => goToModeler('/BPMN')}
          >
            Go to BPMN Modeler <IoIosArrowForward />
          </button>
          <button
            className="bg-[#3070B3] text-white px-4 py-2 shadow hover:bg-blue-800 rounded flex items-center justify-center gap-2 transition-colors ease-in"
            onClick={() => goToModeler('/declare')}
          >
            Go to Declare Modeler <IoIosArrowForward />
          </button>
        </div>
      </div>
    )}
  </div>
);


}
