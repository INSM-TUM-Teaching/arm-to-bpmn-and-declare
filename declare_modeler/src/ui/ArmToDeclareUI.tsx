import { useState } from "react";
import { translateARMtoDeclare } from "../core/translateARM";
import relationshipMap from "../data/relationship_map.json";
import { reverseConstraintLabel } from "../parser/normalizer";

export default function ArmToDeclareUI() {
  const [inputJSON, setInputJSON] = useState("");
  const [output, setOutput] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTranslate = () => {
    try {
      const parsed = JSON.parse(inputJSON);
      const result = translateARMtoDeclare(parsed, relationshipMap);
      setOutput(result);
      setError(null);
    } catch (err: any) {
      setError("Invalid JSON or mapping error: " + err.message);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result;
      if (typeof content === "string") {
        setInputJSON(content);
      }
    };
    reader.readAsText(file);
  };

  const handleDownload = () => {
    if (!output) return;
    const blob = new Blob([JSON.stringify(output, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "declare_model.json";
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

      {error && <p className="text-red-600 mt-4">{error}</p>}

      {output && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-2">Translated Declare Model:</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto">
            {JSON.stringify(
              {
                ...output,
                constraints: output.constraints.map((c: any) => ({
                  ...c,
                  label: c.reversed
                    ? reverseConstraintLabel(c.constraint)
                    : c.constraint,
                })),
              },
              null,
              2
            )}
          </pre>
        </div>
      )}
    </div>
  );
}
