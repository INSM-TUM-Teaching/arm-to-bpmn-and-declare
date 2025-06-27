// src/pages/Declare.tsx
import React, { useState } from 'react';
import { translateARMtoDeclare } from '../core/translateARM';
import { DeclareModel } from '../types/types';
import DeclareVisualizer from '../ui/declareVisualizer';

export default function DeclarePage() {
  const [translated, setTranslated] = useState(false);

  // Upload and translate ARM to Declare
  const handleARMUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const armData = JSON.parse(ev.target?.result as string);
        const declareModel: DeclareModel = translateARMtoDeclare(armData);

        await fetch('http://localhost:5174/api/save-declare-model', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(declareModel)
        });

        setTranslated(true);
      } catch (err: any) {
        alert('Failed to translate ARM: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  // Upload a pre-defined Declare model directly
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

        setTranslated(true);
      } catch (err: any) {
        alert('Invalid Declare model: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-center mb-6">Declare Modeler</h1>

      {!translated ? (
        <div className="space-y-6 text-center">
          <div>
            <h2 className="text-lg font-semibold mb-2">Upload Activity Relationship Matrix (ARM) in JSON format</h2>
            <input
              type="file"
              accept="application/json"
              onChange={handleARMUpload}
              className="p-2 border rounded"
            />
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">Upload Declare Model in JSON format</h2>
            <input
              type="file"
              accept="application/json"
              onChange={handleDeclareUpload}
              className="p-2 border rounded"
            />
          </div>
        </div>
      ) : (
        <DeclareVisualizer />
      )}
    </div>
  );
}
