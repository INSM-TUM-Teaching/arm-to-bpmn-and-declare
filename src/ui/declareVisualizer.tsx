import React, { useEffect, useRef, useState } from "react";
import cytoscape from "cytoscape"; // A graph visualization library
import edgeStyles from "./edgeStyle"; // Custom styles for edges in the graph
import { getConstraintEdges } from "./constraintMap"; // Function to generate visual edges based on Declare constraints
import { DeclareModel } from "../types/types"; // Type definition for the Declare model
import cola from 'cytoscape-cola';
cytoscape.use(cola);

// Props type: expects a parsed Declare model
type Props = {
  declareModel: DeclareModel;
  onChange?: (next: DeclareModel) => void;
};

// ---- constraints categorization sets ----
const POSITIVE = new Set([
  "chain_response",
  "chain_succession",
  "chain_precedence",
  "response",
  "succession",
  "precedence",
  "resp_existence",
  "coexistence",
]);
const CHOICE = new Set(["choice"]);
const NEGATIVE = new Set([
  "neg_response",
  "not_coexistence",
  "resp_absence",
  "neg_precedence",
]);

const ALL_CONSTRAINT_TYPES = [
  ...Array.from(POSITIVE),
  ...Array.from(CHOICE),
  ...Array.from(NEGATIVE),
] as const;
type ConstraintType = (typeof ALL_CONSTRAINT_TYPES)[number];

function categorizeLabel(t: string): "positive" | "choice" | "negative" | "unknown" {
  if (POSITIVE.has(t)) return "positive";
  if (CHOICE.has(t)) return "choice";
  if (NEGATIVE.has(t)) return "negative";
  return "unknown";
}

const DeclareVisualizer: React.FC<Props> = ({ declareModel, onChange }) => {
  const containerRef = useRef<HTMLDivElement | null>(null); // Reference to the DOM container where the graph will render
  const cyRef = useRef<cytoscape.Core | null>(null); // Reference to the Cytoscape instance (the graph engine)
  const [isEditing, setIsEditing] = useState(false);

  // Keep a local, editable copy synced from props
  const [model, setModel] = useState<DeclareModel>(declareModel);
  useEffect(() => setModel(declareModel), [declareModel]);

  // ---- panel state ----
  const [newActivity, setNewActivity] = useState("");
  const [deleteActivity, setDeleteActivity] = useState("");

  // ---- constraints panel state ----
  const [cSource, setCSource] = useState("");
  const [cTarget, setCTarget] = useState("");
  const [cType, setCType] = useState<ConstraintType>("response");
  const [deleteConstraintIdx, setDeleteConstraintIdx] = useState<string>("");

  // ---- init panel state ----
  const [initCandidate, setInitCandidate] = useState("");

  // ---- edit helpers ----
  const apply = (next: DeclareModel) => {
    setModel(next);
    onChange?.(next); // push change to parent immediately
  };

  // ---- Edit activities if user wants ----
  const addActivity = () => {
    const a = newActivity.trim();
    if (!a) return;
    if (model.activities.includes(a)) return; // no duplicates
    const next: DeclareModel = {
      ...model,
      activities: [...model.activities, a],
    };
    apply(next);
    setNewActivity("");
  };

  const removeActivity = (act: string) => {
    if (!act) return;
    const nextActivities = model.activities.filter((x) => x !== act);
    const nextUnary = model.unary.filter((u) => u.activity !== act);
    const nextConstraints = model.constraints.filter(
      (c) => c.source !== act && c.target !== act
    );
    const next: DeclareModel = {
      ...model,
      activities: nextActivities,
      unary: nextUnary,
      constraints: nextConstraints,
    };
    apply(next);
    setDeleteActivity("");
  };

  // ---- Edit constraints if user wants ----
  const addConstraint = () => {
    const s = cSource.trim();
    const t = cTarget.trim();
    if (!s || !t || !cType) return;
    if (s === t) return; // no self-loop for this editor
    if (!model.activities.includes(s) || !model.activities.includes(t)) return;

    const dup = model.constraints.some(
      (c) => c.source === s && c.target === t && c.constraint === cType
    );
    if (dup) return;

    const next: DeclareModel = {
      ...model,
      constraints: [
        ...model.constraints,
        { source: s, target: t, constraint: cType, label: categorizeLabel(cType) },
      ],
    };
    apply(next);
  };

  const deleteConstraint = (idx: number) => {
    if (idx < 0 || idx >= model.constraints.length) return;
    const next = {
      ...model,
      constraints: model.constraints.filter((_, i) => i !== idx),
    };
    apply(next);
  };

  // ---- Add init to activity if user wants ----
  const hasInit = model.unary.some((u) => u.constraint === "init");
  const setInit = () => {
    if (hasInit) return;
    const a = initCandidate.trim();
    if (!a || !model.activities.includes(a)) return;
    apply({ ...model, unary: [...model.unary, { activity: a, constraint: "init" }] });
    setInitCandidate("");
  };

  useEffect(() => {
    // Ensure all required data is present before rendering
    if (!containerRef.current || !Array.isArray(model.activities)) return;

    // Initialize Cytoscape instance with container and styles
    const cy = cytoscape({
      container: containerRef.current,
      elements: [],
      style: [
        {
          selector: 'node',
          style: {
            label: 'data(label)',
            'text-valign': 'center',
            'text-halign': 'center',
            width: 80,
            height: 40,
            shape: 'roundrectangle',
            'background-color': '#f0f0f0',
            'border-width': 1.5,
            'border-color': '#333',
            'font-size': 12,
            'font-weight': 'bold'
          }
        },
        {
          // Special style for init-nodes
          selector: 'node.init-node',
          style: {
            'label': 'init',                         // Always shows 'init'
            'text-valign': 'top',                    // Show label above the node
            'text-halign': 'center',
            'background-color': '#ffffff',           // White background
            'border-width': 0,
            'font-size': 18,
            'z-compound-depth': 'bottom',
          }
        },
        ...edgeStyles // Add custom edge styles
      ]
    });
    cy.minZoom(0.1);
    cy.maxZoom(3);
    cyRef.current = cy;

    // Find the init activity if any
    const initActivity = model.unary?.find(u => u.constraint === "init")?.activity;
    const fixedInitPosition = { x: 0, y: 0 };

    // Create a Cytoscape node for each Declare activity
    const nodes = model.activities.map(act => {
      if (act === initActivity) {
        return {
          data: { id: act, label: act },
          position: fixedInitPosition,
          locked: true,
        };
      } else {
        return { data: { id: act, label: act } };
      }
    });
    // Containers for "init" nodes and edges (unary constraints)
    const initNodes: cytoscape.ElementDefinition[] = [];
    const initEdges: cytoscape.ElementDefinition[] = [];

    // If unary constraints exist, extract and handle "init" constraints
    if ("unary" in model) {
      model.unary.forEach((u, idx) => {
        if (u.constraint === "init") {
          const initNodeId = `init-${u.activity}`;


          // Create a new "init" node visually linked to the actual activity
          initNodes.push({
            data: { id: initNodeId },
            position: fixedInitPosition, // use same position as activity node
            locked: true,
            classes: "init-node"
          });


          // Create an edge from the init node to the target activity node
          initEdges.push({
            data: {
              id: `edge-init-${u.activity}`,
              source: initNodeId,
              target: u.activity,
              constraint: "init"
            }
          });
        }
      });
    }

    // Add all activity nodes and "init" nodes to the graph
    cy.add([...nodes, ...initNodes]);

    // Convert Declare constraints (binary) into visual edges
    const edges = model.constraints.flatMap((c, i) =>
      getConstraintEdges(c.constraint, c.source, c.target, i)
    );

    // Add constraint edges and init edges to the graph
    cy.add([...edges, ...initEdges]);

    // auto-layout using cytoscape-cola
    const edgeCount = model.constraints.length;
    const nodeSpacingValue = edgeCount > 7 ? 150 : 40;

    cy.layout({
      name: 'cola',
      edgeLength: function (edge: any) {
        const constraint = edge.data("constraint");
        return constraint === "succession" ? 500 : 250;
      },
      avoidOverlap: true,
      animate: true,
      randomize: false,
      maxSimulationTime: 1500,
    } as any).run();

    // Manually reposition "init" nodes
    cy.nodes(".init-node").forEach(n => {
      const target = cy.getElementById(n.id().replace("init-", ""));
      const pos = target.position();
      n.position({ x: pos.x - 0, y: pos.y - 0 });
    });

    // Clean up the Cytoscape instance on unmount or re-render
    return () => cy.destroy();
  }, [model]);

  return (
    <div className="min-h-screen bg-white min-w-screen">
      <main className="px-6 py-10 md:px-12 lg:px-16">
        <div className="flex flex-wrap gap-4 mb-8">
          {/* Buttons for exporting the Declare model */}
          {/* Download the Declare model as JSON */}
          <button
            onClick={() => {
              const blob = new Blob([JSON.stringify(model, null, 2)], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "declareModel.json";
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="flex gap-2 items-center bg-purple-600 text-white px-4 py-2 rounded shadow hover:bg-purple-700"
          >
            Download JSON
          </button>
          {/* Download the current graph as a PNG image */}
          <button
            onClick={() => {
              if (cyRef.current) {
                const png = cyRef.current.png({ full: true });
                const a = document.createElement("a");
                a.href = png;
                a.download = "declareModel_graph.png";
                a.click();
              }
            }}
            className="flex gap-2 items-center bg-purple-600 text-white px-4 py-2 rounded shadow hover:bg-purple-700"
          >
            Download PNG
          </button>
          {/* Toggle edit panel */}
          <button
            onClick={() => setIsEditing((v) => !v)}
            className="flex gap-2 items-center bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 border-0"
          >
            {isEditing ? "done editting" : "edit activities/ constraints"}
          </button>
        </div>
        {isEditing && (
          <div className="flex flex-wrap gap-4 mb-8">
            {/* EDIT PANEL */}
            <section className="mb-6 border rounded-xl p-4 bg-gray-50">
              <h2 className="text-lg font-semibold mb-3">Edit activities</h2>

              {/* Add */}
              <div className="flex flex-col lg:flex-row gap-3 items-center">
                <input
                  value={newActivity}
                  onChange={(e) => setNewActivity(e.target.value)}
                  placeholder="New activity name"
                  className="border rounded px-3 py-2"
                />
                <button
                  onClick={addActivity}
                  className="bg-emerald-600 text-white px-3 py-2 rounded hover:bg-emerald-700"
                >
                  Add node
                </button>
              </div>

              {/* Delete */}
              <div className="flex flex-col lg:flex-row gap-3 items-center">
                <select
                  value={deleteActivity}
                  onChange={(e) => setDeleteActivity(e.target.value)}
                  className="border rounded px-3 py-2"
                >
                  <option value="">Select activity to delete</option>
                  {model.activities.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => removeActivity(deleteActivity)}
                  disabled={!deleteActivity}
                  className="bg-rose-600 disabled:bg-rose-300 text-white px-3 py-2 rounded hover:bg-rose-700"
                >
                  Delete node
                </button>
              </div>

              <p className="text-xs text-gray-600 mt-2">
                Deleting an activity will also remove any unary and constraints referencing it.
              </p>
            </section>
            {/* EDIT CONSTRAINTS */}
            <section className="mb-6 border rounded-xl p-4 bg-gray-50">
              <h2 className="text-lg font-semibold mb-3">Edit constraints</h2>

              <div className="flex flex-col lg:flex-row gap-3 items-center">
                <select
                  value={cSource}
                  onChange={(e) => setCSource(e.target.value)}
                  className="border rounded px-3 py-2"
                >
                  <option value="">Source</option>
                  {model.activities.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>

                <span className="hidden lg:inline">→</span>

                <select
                  value={cTarget}
                  onChange={(e) => setCTarget(e.target.value)}
                  className="border rounded px-3 py-2"
                >
                  <option value="">Target</option>
                  {model.activities.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>

                <select
                  value={cType}
                  onChange={(e) => setCType(e.target.value as ConstraintType)}
                  className="border rounded px-3 py-2"
                >
                  {ALL_CONSTRAINT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>

                <button
                  onClick={addConstraint}
                  className="bg-emerald-600 text-white px-3 py-2 rounded hover:bg-emerald-700"
                  disabled={!cSource || !cTarget || cSource === cTarget}
                >
                  Add edge
                </button>
              </div>
              <div className="flex flex-col lg:flex-row gap-3 items-center">
                <select
                  value={deleteConstraintIdx}
                  onChange={(e) => setDeleteConstraintIdx(e.target.value)}
                  className="border rounded px-3 py-2"
                >
                  <option value="">Select constraint to delete</option>
                  {model.constraints.map((c, i) => (
                    <option key={`${c.source}-${c.target}-${c.constraint}-${i}`} value={String(i)}>
                      [{c.source}] → [{c.target}] : {c.constraint}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    if (deleteConstraintIdx === "") return;
                    deleteConstraint(Number(deleteConstraintIdx));
                    setDeleteConstraintIdx("");
                  }}
                  disabled={deleteConstraintIdx === ""}
                  className="bg-rose-600 disabled:bg-rose-300 text-white px-3 py-2 rounded hover:bg-rose-700"
                >
                  Delete constraint
                </button>
              </div>
            </section>

            {/* INIT CONTROL */}
            <section className="mb-6 border rounded-xl p-4 bg-gray-50">
              <h2 className="text-lg font-semibold mb-3">Init activity</h2>
              {hasInit ? (
                <p className="text-sm text-gray-700">
                  An init activity already exists.
                </p>
              ) : (
                <div className="flex items-center gap-2">
                  <select
                    value={initCandidate}
                    onChange={(e) => setInitCandidate(e.target.value)}
                    className="border rounded px-3 py-2"
                  >
                    <option value="">Select activity as init</option>
                    {model.activities.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={setInit}
                    disabled={!initCandidate}
                    className="bg-indigo-600 text-white px-3 py-2 rounded hover:bg-indigo-700"
                  >
                    Set init
                  </button>
                </div>
              )}
              <p className="text-xs text-gray-600 mt-2">
                You can set an init activity only when none exists.
              </p>
            </section>
          </div>
        )}
        {/* Logic Output Section */}
        {
          <section id="output" className="mb-10">
            <h2 className="text-xl font-semibold mb-4">Translation Results</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <h3 className="font-medium text-gray-800 mb-1">Involved activities</h3>
                <ul className="text-sm text-gray-700 space-y-1">{model.activities.map((a) => <li key={a}>[{a}]</li>)}</ul>
              </div>
              <div>
                <h3 className="font-medium text-gray-800 mb-1">ConDec relation constraints</h3>
                <ul className="text-sm text-gray-700 space-y-1">{model.constraints.filter((c) => POSITIVE.has(c.constraint)).map((a) => <li key={`${a.source}-${a.target}-${a.constraint}`}>
                  [{a.source}] → [{a.target}] :  {a.constraint}
                </li>)}</ul>
              </div>
              <div>
                <h3 className="font-medium text-gray-800 mb-1">ConDec negation constraints</h3>
                <ul className="text-sm text-gray-700 space-y-1">{model.constraints.filter((c) => NEGATIVE.has(c.constraint)).map((a) => <li key={`${a.source}-${a.target}-${a.constraint}`}>
                  [{a.source}] → [{a.target}] :  {a.constraint}
                </li>)}</ul>
              </div>

              <div>
                <h3 className="font-medium text-gray-800 mb-1">init Activity</h3>
                <ul className="text-sm text-gray-700 space-y-1">{model.unary.map((a) => <li key={a.activity}>[{a.activity}]</li>)}</ul>
              </div>
              <div>
                <h3 className="font-medium text-gray-800 mb-1">ConDec choice constraints</h3>
                <ul className="text-sm text-gray-700 space-y-1">{model.constraints.filter((c) => CHOICE.has(c.constraint)).map((a) => <li key={`${a.source}-${a.target}-${a.constraint}`}>
                  [{a.source}] → [{a.target}] :  {a.constraint}
                </li>)}</ul>
              </div>

            </div>
          </section>
        }
        {/* Container for Cytoscape graph */}
        <section id="viewer" className="mb-10">
          <h2 className="text-xl font-semibold mb-4">🧾 Declare Viewer</h2>
          <div
            ref={containerRef}
            style={{ width: "88%", height: "600px", border: "1px solid #ccc", backgroundColor: 'white' }}
          />
        </section>

        {/* How to Use */}
        <footer id="how" className="pt-6 border-t text-sm text-gray-600">
          <h2 className="text-md font-semibold mb-2">How to Use:</h2>
          <ol className="list-decimal ml-6 space-y-1">
            <li>Navigate to Home page, choose your upload option</li>
            <li>Choose BPMN or Declare to generate the model</li>
            <li>The translation results will appear above.</li>
            <li>The translated Declare diagram will be shown in the viewer section.</li>
            <li>You can add or delete activities and constraints.</li>
            <li>You can download the Declare model in JSON or as image for further use.</li>
          </ol>
        </footer>
      </main >
    </div >
  );
};


export default DeclareVisualizer;