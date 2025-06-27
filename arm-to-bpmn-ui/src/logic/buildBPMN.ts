import { layoutProcess } from 'bpmn-auto-layout';

// Type definition for the analysis result that drives the BPMN construction
export type Analysis = {
  activities: string[]; // List of activity names
  temporalChains: [string, string][]; // Full temporal orderings
  exclusiveRelations: [string, string][]; // Pairs of mutually exclusive activities
  parallelRelations: [string, string][]; // Pairs of parallel activities
  directDependencies: [string, string][]; // Only direct temporal edges
  optionalDependencies?: [string, string, 'optional_to' | 'optional_from'][]; // Optional links
  orRelations?: [string, string][]; // Inclusive (OR) relations
  topoOrder?: string[]; // Topological sort of activities
};

// Main function to build BPMN XML from an analysis object
export async function buildBPMN(analysis: Analysis): Promise<string> {
  // BPMN elements (tasks, gateways, events) keyed by ID
  const elements = new Map<string, { type: string; name?: string }>();

  // Sequence flows between elements
  const flows: Array<{ from: string; to: string }> = [];

  // To track already created flow pairs and avoid duplication
  const handledPairs = new Set<string>();

  // Track which elements point to each node (incoming)
  const flowTargets = new Map<string, Set<string>>();

  // Track which elements a node points to (outgoing)
  const flowSources = new Map<string, Set<string>>();

  // Add a BPMN element only if it doesn't exist
  const addElement = (id: string, type: string, name?: string) => {
    if (!elements.has(id)) {
      elements.set(id, { type, name });
    }
  };

  // Add a flow (sequence edge) between two elements
  const addFlow = (from: string, to: string) => {
    const key = `${from}->${to}`;
    if (!handledPairs.has(key)) {
      flows.push({ from, to });
      handledPairs.add(key);

      if (!flowTargets.has(to)) flowTargets.set(to, new Set());
      flowTargets.get(to)!.add(from);

      if (!flowSources.has(from)) flowSources.set(from, new Set());
      flowSources.get(from)!.add(to);
    }
  };

  // Utility: count how many incoming edges a node has
  const countIncoming = (node: string) => flowTargets.get(node)?.size || 0;

  // Utility: count how many outgoing edges a node has
  const countOutgoing = (node: string) => flowSources.get(node)?.size || 0;

  // Create a BPMN task element for each activity
  analysis.activities.forEach(act => addElement(act, 'task', act));

  // Identify a common convergence node that all sources reach
  const findConvergingNode = (sources: string[]): string | null => {
    const getReachables = (start: string): Set<string> => {
      const visited = new Set<string>();
      const stack = [start];
      while (stack.length) {
        const node = stack.pop()!;
        for (const [from, to] of analysis.temporalChains) {
          if (from === node && !visited.has(to)) {
            visited.add(to);
            stack.push(to);
          }
        }
      }
      return visited;
    };
    const reachSets = sources.map(getReachables);
    return [...reachSets.reduce((a, b) => new Set([...a].filter(x => b.has(x))))][0] ?? null;
  };

  // Walk along a temporal chain from one node until just before a target
  const findLastBefore = (target: string, from: string): string | null => {
    let current = from;
    while (true) {
      const next = analysis.temporalChains.find(([a]) => a === current)?.[1];
      if (!next || next === target) break;
      current = next;
    }
    return current === target ? null : current;
  };

  // Create a gateway (split and join) for a logic type (XOR, AND, OR)
  const createSplitJoin = (from: string, targets: string[], type: 'exclusiveGateway' | 'parallelGateway' | 'inclusiveGateway') => {
    const splitId = `${type}_Split_${from}`;
    const joinId = `${type}_Join_${from}`;
    const splitName = type === 'exclusiveGateway' ? 'XOR Split' : type === 'parallelGateway' ? 'AND Split' : 'OR Split';
    const joinName = type === 'exclusiveGateway' ? 'XOR Join' : type === 'parallelGateway' ? 'AND Join' : 'OR Join';

    addElement(splitId, type, splitName);
    addFlow(from, splitId);
    targets.forEach(t => addFlow(splitId, t));

    const convergeAt = findConvergingNode(targets);
    if (convergeAt) {
      const joinAt = `${type}_Join_${convergeAt}`;
      addElement(joinAt, type, joinName);
      targets.forEach(source => {
        const last = findLastBefore(convergeAt, source);
        if (last && last !== joinAt) addFlow(last, joinAt);
      });
      addFlow(joinAt, convergeAt);
    } else {
      addElement(joinId, type, joinName);
      targets.forEach(t => {
        if (countOutgoing(t) === 0) {
          addFlow(t, joinId);
        }
      });
      if (!flowTargets.get('EndEvent_1')?.has(joinId)) {
        addFlow(joinId, 'EndEvent_1');
      }
    }
  };

  // Create flows based on direct dependencies, handle exclusive gateways
  analysis.directDependencies.forEach(([a, b]) => {
    const dependents = analysis.directDependencies.filter(([x]) => x === a).map(([, y]) => y);
    const isExclusive = analysis.exclusiveRelations.some(([x, y]) => dependents.includes(x) && dependents.includes(y));
    if (dependents.length > 1 && isExclusive) {
      createSplitJoin(a, dependents, 'exclusiveGateway');
    } else if (!handledPairs.has(`${a}->${b}`)) {
      if (countOutgoing(a) === 0 && countIncoming(b) < 1) {
        addFlow(a, b);
      }
    }
  });

  // Group and connect elements with parallel or inclusive relations
  const groupRelations = (pairs: [string, string][], type: 'parallelGateway' | 'inclusiveGateway') => {
    const groups: string[][] = [];
    const seen = new Set<string>();
    for (const [a, b] of pairs) {
      if (seen.has(a) || seen.has(b)) continue;
      const group = [a, b];
      seen.add(a);
      seen.add(b);
      for (const [x, y] of pairs) {
        if (group.includes(x) && !group.includes(y)) { group.push(y); seen.add(y); }
        if (group.includes(y) && !group.includes(x)) { group.push(x); seen.add(x); }
      }
      groups.push(group);
    }
    for (const group of groups) {
      const preds = analysis.activities.filter(p => group.every(t => analysis.temporalChains.some(([a, b]) => a === p && b === t)));
      if (preds.length === 1) createSplitJoin(preds[0], group, type);
    }
  };

  // Apply split/join logic to parallel and OR-type relationships
  groupRelations(analysis.parallelRelations, 'parallelGateway');
  groupRelations(analysis.orRelations ?? [], 'inclusiveGateway');

  // Start Event: Single or gateway-based
  addElement('StartEvent_1', 'startEvent');
  const startNodes = analysis.activities.filter(a => !analysis.temporalChains.some(([, to]) => to === a));
  if (startNodes.length === 1) {
    addFlow('StartEvent_1', startNodes[0]);
  } else {
    const g = 'inclusiveGateway_Split_StartEvent_1';
    addElement(g, 'inclusiveGateway', 'OR Split');
    addFlow('StartEvent_1', g);
    startNodes.forEach(n => addFlow(g, n));
  }

  // End Event: Single or gateway-based join
  addElement('EndEvent_1', 'endEvent');
  const endNodes = analysis.activities.filter(a => !analysis.temporalChains.some(([from]) => from === a));
  const existingInEnd = new Set([...flows].filter(f => f.to === 'EndEvent_1').map(f => f.from));
  const uniqueEndNodes = endNodes.filter(n => !existingInEnd.has(n));

  if (uniqueEndNodes.length === 1) {
    addFlow(uniqueEndNodes[0], 'EndEvent_1');
  } else if (uniqueEndNodes.length > 1) {
    const g = 'inclusiveGateway_Join_End';
    addElement(g, 'inclusiveGateway', 'OR Join End');
    uniqueEndNodes.forEach(n => addFlow(n, g));
    addFlow(g, 'EndEvent_1');
  }

  // Generate XML string for BPMN elements and flows
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
                  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
                  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
                  id="Definitions_1"
                  targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="false">
`;
  // Output BPMN nodes
  for (const [id, { type, name }] of elements) {
    xml += `    <bpmn:${type} id="${id}"${name ? ` name="${name}"` : ''}>
`;
    flows.filter(f => f.to === id).forEach(f => xml += `      <bpmn:incoming>Flow_${f.from}_${f.to}</bpmn:incoming>
`);
    flows.filter(f => f.from === id).forEach(f => xml += `      <bpmn:outgoing>Flow_${f.from}_${f.to}</bpmn:outgoing>
`);
    xml += `    </bpmn:${type}>
`;
  }

  // Output sequence flows
  for (const { from, to } of flows) {
    xml += `    <bpmn:sequenceFlow id="Flow_${from}_${to}" sourceRef="${from}" targetRef="${to}" />
`;
  }

  xml += `  </bpmn:process>
</bpmn:definitions>`;

  // Use bpmn-auto-layout to prettify and return final layouted XML
  return await layoutProcess(xml);
}
