import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { translateARMtoDeclare } from '../core/translateARM';
import { DeclareModel } from '../types/types';
import DeclareVisualizer from '../ui/declareVisualizer';
import { validateARM } from "../core/validator";

export default function DeclarePage() {
  const location = useLocation(); // Used to access passed state data from navigation
  const [translated, setTranslated] = useState(false); // Flag to track whether ARM has been translated
  const [declareModel, setDeclareModel] = useState<DeclareModel | null>(null); // The resulting Declare model

  useEffect(() => {
    const armData = location.state?.arm; // Check if ARM data was passed via router state
    const declareData = location.state?.declare;

    if (declareData) {
      // Skip translation, just use declare directly
      setDeclareModel(declareData);
      setTranslated(true);
      return;
    }

    if (armData) {
      try {
        const model = translateARMtoDeclare(armData); // Convert to Declare format
        setDeclareModel(model); // Store the result in state

        // Send model to backend server
        fetch('http://localhost:5174/api/save-declare-model', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(model),
        });

        setTranslated(true); // Mark translation as complete
      } catch (error: any) {
        alert('Failed to translate ARM: ' + error.message);
      }
    }
  }, [location.state]);

  const handleARMUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();

    const reader = new FileReader();

    // When file has been read successfully
    reader.onload = async (ev) => {
      try {
        const json = JSON.parse(text);
        if (!validateARM(json)) {
          return;
        }
        const armData = JSON.parse(ev.target?.result as string); // Parse JSON content
        const model: DeclareModel = translateARMtoDeclare(armData); // Convert to Declare model

        // Save Declare model to backend
        await fetch('http://localhost:5174/api/save-declare-model', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(model)
        });
        setDeclareModel(model);
        setTranslated(true); // Indicate model is ready to be visualized
      } catch (err: any) {
        alert('Invalid ARM: ' + err.message);
      }
    };

    reader.readAsText(file); // Read file content as text
  };

  return (
    <div className="min-h-screen bg-white min-w-screen">
      <main className="px-6 py-10 md:px-12 lg:px-16">
        <header className="mb-12">
          <h1 className="text-2xl font-bold text-[#3070B3]">ARM to Declare</h1>
          <p className="text-gray-600 mt-2">Easily translate your ARM matrices into Declare models.</p>
        </header>
        <div className="flex flex-wrap gap-4 mb-8">
          {/* Show different views depending on whether translation is done */}
          {!translated ? (
            location.state?.arm ? (
              // If ARM is being processed from navigation state
              <p className="text-center text-lg">Processing ARM data...</p>
            ) : (
              // If no data passed, show manual file upload option
              <div className="space-y-6 text-center">
                <div>
                  <h2 className="text-lg font-semibold mb-2">
                    Upload Activity Relationship Matrix (ARM) in JSON format
                  </h2>
                  <input
                    type="file"
                    accept="application/json"
                    onChange={handleARMUpload}
                    className="p-2 border rounded"
                  />
                </div>
              </div>
            )
          ) : (
            // Once translated, render the visualization component
            declareModel && <DeclareVisualizer declareModel={declareModel} />
          )}
        </div>
      </main>
    </div>

  );
}
