import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUpload } from 'react-icons/fa';
import { IoIosArrowForward } from "react-icons/io";
import { validateARM } from "../core/validator";

export type Analysis = {
  activities: string[];
  temporalChains: [string, string][];
  exclusiveRelations: [string, string][];
  parallelRelations: [string, string][];
  directDependencies: [string, string][];
  optionalDependencies?: [string, string, 'optional_to' | 'optional_from'][];
  orRelations?: [string, string][];
  topoOrder?: string[];
};

export default function HomePage() {
  const [uploadedARM, setUploadedARM] = useState<Analysis | null>(null);
  const navigate = useNavigate();

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

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
      {!uploadedARM ? (
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
      ) : (
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-4">ARM Uploaded Successfully!</h2>
          <div className="flex flex-row gap-8 pt-6">
            <button
              className="bg-[#3070B3] text-white px-4 py-2 shadow hover:bg-blue-800 rounded flex items-center justify-center gap-2 transition-colors  ease-in"
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
