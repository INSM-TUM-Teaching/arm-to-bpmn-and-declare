import { useState } from 'react';
import { translateARMtoDeclare } from '../core/translateARM';
import { DeclareModel } from '../types/types';


export default function ArmToDeclareUI() {
  const [inputJSON, setInputJSON] = useState('');
  const [output, setOutput] = useState<DeclareModel | null>(null);
  const [error, setError] = useState<string | null>(null);


  /**
   * Translates ARM JSON input into a Declare model, updates the output state,
   * and POST the result to a backend server for persistence.
   *
   * @async
   * @function
   * @returns {Promise<void>}
   */
  const handleTranslate = async () => {
    try {
      const parsed = JSON.parse(inputJSON);
      const result = translateARMtoDeclare(parsed);
      setOutput(result);
      setError(null);


      // Send to backend
      const response = await fetch('http://localhost:5174/api/save-declare-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result),
      });


      if (!response.ok) throw new Error("Failed to save model to backend");
      alert('Declare model saved and ready to visualize!');
    } catch (err: any) {
      setError('Translation failed: ' + err.message);
      setOutput(null);
    }
  };


   /**
   * Handles uploading a local `.json` file and sets its content as input JSON.
   *
   * @function
   * @param {React.ChangeEvent<HTMLInputElement>} event - File input change event
   * @returns {void}
   */
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;


    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result;
      if (typeof content === 'string') {
        setInputJSON(content);
      }
    };
    reader.readAsText(file);
  };


   /**
   * Triggers a download of the translated Declare model to local disk as JSON
   *
   * @function
   * @returns {void}
   */
  const handleDownload = () => {
    if (!output) return;
    const blob = new Blob([JSON.stringify(output, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'declare_model.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };


  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">ARM to Declare Translator</h1>


      <input
        type="file"
        accept="application/json"
        className="mb-4"
        onChange={handleFileUpload}
      />


      <textarea
        className="w-full h-64 p-3 border rounded mb-4"
        placeholder="Paste ARM JSON here or upload a .json file..."
        value={inputJSON}
        onChange={(e) => setInputJSON(e.target.value)}
      ></textarea>


      <button
        className="bg-blue-600 text-white px-4 py-2 rounded mr-2"
        onClick={handleTranslate}
      >
        Translate
      </button>


      {output && (
        <button
          className="bg-green-600 text-white px-4 py-2 rounded"
          onClick={handleDownload}
        >
          Download JSON
        </button>
      )}


      {error && <p className="text-red-600 mt-4 whitespace-pre-wrap">{error}</p>}


      {output && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-2">Translated Declare Model:</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
            {JSON.stringify(output, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
