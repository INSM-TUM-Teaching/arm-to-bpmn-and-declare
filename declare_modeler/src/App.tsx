import React, { useState } from 'react';
import { translateARMtoDeclare } from './core/translateARM';
import DeclareVisualizer from './ui/declareVisualizer';

function App() {
  const [translated, setTranslated] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result;
      if (typeof content === 'string') {
        try {
          const parsed = JSON.parse(content);
          const result = translateARMtoDeclare(parsed);

          const response = await fetch('http://localhost:5174/api/save-declare-model', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(result),
          });

          if (!response.ok) throw new Error("Failed to save model to backend");
          setTranslated(true);
        } catch (err: any) {
          alert('Translation failed: ' + err.message);
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-center">ARM to Declare Graph Visualizer</h1>
      {!translated ? (
        <div className="text-center">
          <p className="text-gray-500">Upload your ARM JSON to auto-generate and view the Declare model graph.</p>
          <input
            type="file"
            accept="application/json"
            className="mb-4"
            onChange={handleFileUpload}
          />
        </div>
      ) : (
        <DeclareVisualizer />
      )}
    </div>
  );
}

export default App;
