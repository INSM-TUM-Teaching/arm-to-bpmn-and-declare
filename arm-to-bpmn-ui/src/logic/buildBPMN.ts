import { layoutProcess } from 'bpmn-auto-layout';

/* ============================================================================
 * TYPES
 * ============================================================================
 */

/**
 * The Analysis object represents all the structured information we’ve extracted
 * from a higher-level process model (like an ARM matrix or a flowchart).
 * It’s the core input for building the BPMN diagram.
 */
export type Analysis = {
  activities: string[];
  temporalChains: [string, string][];  
  exclusiveRelations: [string, string][];
  parallelRelations: [string, string][];  
  directDependencies: [string, string][];
  optionalDependencies?: [string, string, 'optional_to' | 'optional_from'][];
  orRelations?: [string, string][];
  // Optional level information (e.g., for layout or nested analysis)
  //activityLevels?: Record<string, number>;
};

/* ============================================================================
 * GATEWAY DETECTION — Inference Based on Target Relationships
 * ============================================================================
 */

/**
 * Given a list of targets that an activity branches to, this function figures out
 * what kind of gateway (split logic) is required.
 * 
 * Gateway types:
 * - XOR (exclusive): Only one path can be taken.
 * - AND (parallel): All paths are taken.
 * - OR (inclusive): One or more paths may be taken.
 * 
 * We determine the type by checking the *pairwise* relationships among the targets.
 */
function inferGatewayTypeFromGroup(
  sources: string[], // Currently unused — could be removed
  targets: string[], // Activities receiving the split
  analysis: Analysis // The context for relationships
): 'exclusiveGateway' | 'parallelGateway' | 'inclusiveGateway' {
  let hasExclusive = false;
  let hasParallel = false;
  let hasInclusive = false;

  // Compare every pair of target activities
  for (let i = 0; i < targets.length; i++) {
    for (let j = i + 1; j < targets.length; j++) {
      const [a, b] = [targets[i], targets[j]];

      // Check if they are explicitly exclusive, parallel, or inclusive
      if (analysis.exclusiveRelations.some(([x, y]) =>
        (x === a && y === b) || (x === b && y === a))) {
        hasExclusive = true;
      }
      else if (analysis.parallelRelations.some(([x, y]) =>
        (x === a && y === b) || (x === b && y === a))) {
        hasParallel = true;
      }
      else if (analysis.orRelations?.some(([x, y]) =>
        (x === a && y === b) || (x === b && y === a))) {
        hasInclusive = true;
      }
    }
  }

  // Prioritize gateway types by specificity
  if (hasExclusive) return 'exclusiveGateway';
  if (hasInclusive) return 'inclusiveGateway';
  return 'parallelGateway'; // Default fallback if no clear relation
}


/**
 * Determines what kind of gateway to use at the *start* of the process.
 * 
 * When multiple start nodes are detected, we must decide:
 * - Are they mutually exclusive? → XOR split
 * - Are they OR? → inclusive split
 * - Otherwise → parallel split (default)
 */
function detectStartGatewayType(
  startNodes: string[], // Activities with no incoming dependencies
  analysis: Analysis
): 'parallelGateway' | 'exclusiveGateway' | 'inclusiveGateway' {
  // No gateway needed if there is only one start node
  if (startNodes.length === 1) return 'parallelGateway';

  let hasExclusive = false;
  let hasParallel = false;
  let hasInclusive = false;

  // Compare all pairs of start nodes to determine their mutual relation
  for (let i = 0; i < startNodes.length; i++) {
    for (let j = i + 1; j < startNodes.length; j++) {
      const a = startNodes[i];
      const b = startNodes[j];

      if (analysis.exclusiveRelations.some(([x, y]) =>
        (x === a && y === b) || (x === b && y === a))) {
        hasExclusive = true;
      }
      if (analysis.parallelRelations.some(([x, y]) =>
        (x === a && y === b) || (x === b && y === a))) {
        hasParallel = true;
      }
      if (analysis.orRelations?.some(([x, y]) =>
        (x === a && y === b) || (x === b && y === a))) {
        hasInclusive = true;
      }
    }
  }

  // Decide the gateway type based on mutual relationships
  if (hasExclusive && !hasParallel && !hasInclusive) return 'exclusiveGateway';
  if (hasInclusive && !hasParallel) return 'inclusiveGateway';

  // Default: either no relation, or mixed relation — assume parallel
  return 'parallelGateway';
}

/* ============================================================================
 * UTILITY FUNCTIONS — Support Traversals, Cleanup, and Control Flow
 * ============================================================================
 */

/**
 * Given multiple starting nodes, this function finds their first common successor
 * (i.e., a node reachable from all of them) by computing reachability sets.
 */
function findConvergingNode(sources: string[], analysis: Analysis): string | null {
  // Helper: returns all reachable nodes from a given start point
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

  // Get reachability sets for each source node
  const reachSets = sources.map(getReachables);

  // Find the intersection: any node reachable from all sources
  return [...reachSets.reduce((a, b) => new Set([...a].filter(x => b.has(x))))][0] ?? null;
}

/**
 * Removes gateways that are not needed for valid BPMN (e.g., AND/XOR with only one path).
 * This avoids bloated diagrams.
 */
function removeUnnecessaryGateways(context: ReturnType<typeof createContext>) {
  const { elements, flows, handledPairs, flowSources, flowTargets } = context;

  console.log('[CLEANUP] Starting gateway cleanup process...');

  const unnecessaryGateways: string[] = [];

  // Loop over all elements; filter those of type "*Gateway"
  for (const [gatewayId, gatewayInfo] of elements) {
    if (!gatewayInfo.type.includes('Gateway')) continue;

    const outgoingFlows = flows.filter(f => f.from === gatewayId);
    const incomingFlows = flows.filter(f => f.to === gatewayId);

    // Gateways are unnecessary if they only have 1 outgoing flow
    let isUnnecessary = false;
    if (gatewayId.includes('Split')) {
      isUnnecessary = outgoingFlows.length < 2;
    } else if (gatewayId.includes('Join')) {
      isUnnecessary = incomingFlows.length < 2;
    } else {
      isUnnecessary = outgoingFlows.length < 2;
    }

    if (isUnnecessary) unnecessaryGateways.push(gatewayId);
  }

  // Rewire flows and remove gateway
  for (const gatewayId of unnecessaryGateways) {
    const incomingFlows = flows.filter(f => f.to === gatewayId);
    const outgoingFlows = flows.filter(f => f.from === gatewayId);

    // Remove flows
    [...incomingFlows, ...outgoingFlows].forEach(flow => {
      const index = flows.indexOf(flow);
      if (index > -1) {
        flows.splice(index, 1);
        handledPairs.delete(`${flow.from}->${flow.to}`);
      }
    });

    // Reconnect incoming -> outgoing directly
    incomingFlows.forEach(inFlow => {
      outgoingFlows.forEach(outFlow => {
        const newFlow = { from: inFlow.from, to: outFlow.to };
        const key = `${newFlow.from}->${newFlow.to}`;

        if (!flows.some(f => f.from === newFlow.from && f.to === newFlow.to)) {
          flows.push(newFlow);
          handledPairs.add(key);

          if (!flowSources.has(newFlow.from)) flowSources.set(newFlow.from, new Set());
          flowSources.get(newFlow.from)!.add(newFlow.to);

          if (!flowTargets.has(newFlow.to)) flowTargets.set(newFlow.to, new Set());
          flowTargets.get(newFlow.to)!.add(newFlow.from);
        }
      });
    });

    // Remove gateway node from context
    flowSources.delete(gatewayId);
    flowTargets.delete(gatewayId);
    elements.delete(gatewayId);
  }

  console.log(`[CLEANUP] Removed ${unnecessaryGateways.length} unnecessary gateways`);
}

/**
 * Traces a path from 'from' → ... → target and returns the last activity before reaching `target`.
 * Used to determine where to insert join gateways in examples with pathways.
 */
function findLastBefore(target: string, from: string, analysis: Analysis): string | null {
  let current = from;

  while (true) {
    const next = analysis.temporalChains.find(([a]) => a === current)?.[1];
    if (!next || next === target) break;
    current = next;
  }

  return current === target ? null : current;
}

/* ============================================================================
 * FLOW CONTROL HELPERS
 * ============================================================================
 */

/**
 * Adds an element to the elements map if it doesn't exist.
 */
function addElement(
  elements: Map<string, { type: string; name?: string }>,
  id: string,
  type: string,
  name?: string
) {
  if (!elements.has(id)) {
    elements.set(id, { type, name });
  }
}

/**
 * Adds a flow (edge) from → to between two elements, with protection
 * against duplicates and illegal structures (e.g., multiple flows to a task).
 */
function addFlow(
  from: string,
  to: string,
  elements: Map<string, { type: string }>,
  flows: Array<{ from: string; to: string }>,
  handledPairs: Set<string>,
  flowSources: Map<string, Set<string>>,
  flowTargets: Map<string, Set<string>>
) {
  const key = `${from}->${to}`;
  if (handledPairs.has(key)) return;

  const fromType = elements.get(from)?.type;
  const toType = elements.get(to)?.type;

  // Optional: avoid adding more than one incoming/outgoing to/from a task
  if (fromType === 'task' && (flowSources.get(from)?.size ?? 0) >= 1) return;
  if (toType === 'task' && (flowTargets.get(to)?.size ?? 0) >= 1) return;

  // Add flow and update state
  flows.push({ from, to });
  handledPairs.add(key);

  if (!flowTargets.has(to)) flowTargets.set(to, new Set());
  flowTargets.get(to)!.add(from);

  if (!flowSources.has(from)) flowSources.set(from, new Set());
  flowSources.get(from)!.add(to);
}


/* ============================================================================
 * SPLIT / JOIN CREATION — Insert Gateways Between Activities
 * ============================================================================
 */

/**
 * Inserts a split gateway before multiple targets, and (if needed) a join gateway
 * after them. Handles nested gateway-to-gateway splits recursively.
 */
function createSplitJoin(
  from: string,
  targets: string[],
  type: 'exclusiveGateway' | 'parallelGateway' | 'inclusiveGateway',
  analysis: Analysis,
  context: {
    elements: Map<string, { type: string; name?: string }>,
    flows: Array<{ from: string; to: string }>,
    handledPairs: Set<string>,
    flowSources: Map<string, Set<string>>,
    flowTargets: Map<string, Set<string>>,
    joinGatewayFor: Record<string, string>
  }
) {
  const { elements, flows, handledPairs, flowSources, flowTargets, joinGatewayFor } = context;

  // Generate split and join IDs
  const splitId = `${type}_Split_${from}`;
  const joinId = `${type}_Join_${from}`;
  const splitName = type === 'exclusiveGateway' ? 'XOR Split' : type === 'parallelGateway' ? 'AND Split' : 'OR Split';
  const joinName = type === 'exclusiveGateway' ? 'XOR Join' : type === 'parallelGateway' ? 'AND Join' : 'OR Join';

  // Create the split gateway and connect it to the source node
  addElement(elements, splitId, type, splitName);
  addFlow(from, splitId, elements, flows, handledPairs, flowSources, flowTargets);

  // For each target, check if it is itself a split (has multiple outgoing dependencies)
  targets.forEach(t => {
    const tOutgoings = analysis.directDependencies.filter(([depFrom]) => depFrom === t).map(([_, to]) => to);

    if (tOutgoings.length > 1) {
      // Target is also a split — recursively handle it
      const nestedType = inferGatewayTypeFromGroup([t], tOutgoings, analysis);
      createSplitJoin(t, tOutgoings, nestedType, analysis, context);

      // Connect outer split to nested split
      addFlow(splitId, `${nestedType}_Split_${t}`, elements, flows, handledPairs, flowSources, flowTargets);
    } else {
      // Normal: connect directly to the activity
      addFlow(splitId, t, elements, flows, handledPairs, flowSources, flowTargets);
    }
  });

  // Find a node all targets converge into (if any)
  const convergeAt = findConvergingNode(targets, analysis);
  if (convergeAt) {
    const joinAt = `${type}_Join_${convergeAt}`;
    addElement(elements, joinAt, type, joinName);

    targets.forEach(source => {
      const last = findLastBefore(convergeAt, source, analysis);
      if (last && last !== joinAt) {
        addFlow(last, joinAt, elements, flows, handledPairs, flowSources, flowTargets);
      }
    });

    addFlow(joinAt, convergeAt, elements, flows, handledPairs, flowSources, flowTargets);
  } else {
    // If no natural convergence, add a generic join after all branches
    addElement(elements, joinId, type, joinName);
    targets.forEach(t => {
      if ((flowSources.get(t)?.size ?? 0) === 0) {
        addFlow(t, joinId, elements, flows, handledPairs, flowSources, flowTargets);
        joinGatewayFor[t] = joinId;
      }
    });
  }
}

/* ============================================================================
 * RELATION GROUPING — Bundle Related Activities and Create Gateways
 * ============================================================================
 */

/**
 * Groups together all related activities (e.g., all mutually parallel or exclusive),
 * and tries to insert a gateway split from their common predecessor.
 */
function groupRelations(
  pairs: [string, string][], // Relations (e.g., parallel pairs)
  type: 'exclusiveGateway' | 'parallelGateway' | 'inclusiveGateway',
  analysis: Analysis,
  context: ReturnType<typeof createContext>
) {
  const groups: string[][] = [];
  const seen = new Set<string>();

  // Group connected components of related nodes
  for (const [a, b] of pairs) {
    if (seen.has(a) || seen.has(b)) continue;
    const group = [a, b];
    seen.add(a); seen.add(b);

    for (const [x, y] of pairs) {
      if (group.includes(x) && !group.includes(y)) { group.push(y); seen.add(y); }
      if (group.includes(y) && !group.includes(x)) { group.push(x); seen.add(x); }
    }

    groups.push(group);
  }

  // Start nodes are activities with no incoming temporal edges
  const hasIncoming = new Set(analysis.temporalChains.map(([, to]) => to));
  const startNodes = analysis.activities.filter(a => !hasIncoming.has(a));

  for (const group of groups) {
    // Find a single predecessor that leads to all group members
    const preds = analysis.activities.filter(p =>
      group.every(t => analysis.temporalChains.some(([a, b]) => a === p && b === t))
    );

    if (preds.length === 1) {
      createSplitJoin(preds[0], group, type, analysis, context);
    } else if (group.every(t => startNodes.includes(t))) {
      // Special case: all group members are start nodes
      createSplitJoin('StartEvent_1', group, type, analysis, context);
    } else {
      // No valid split origin — skip
    }
  }
}

/* ============================================================================
 * CONTEXT SETUP — Initializes the Data Structures for BPMN Generation
 * ============================================================================
 */

/**
 * Creates and returns the initial context needed to track nodes and flows
 */
function createContext() {
  return {
    elements: new Map<string, { type: string; name?: string }>(), // All nodes
    flows: [] as Array<{ from: string; to: string }>, // All edges
    handledPairs: new Set<string>(), // Avoids duplicate flows
    flowTargets: new Map<string, Set<string>>(), // Reverse map for validation
    flowSources: new Map<string, Set<string>>(), // Forward map
    joinGatewayFor: {} as Record<string, string> // Track where joins happen
  };
}

// ---------- Main Function ----------
/**
 * Main entry point: Builds a complete BPMN diagram from an Analysis object.
 * Handles task creation, gateway insertion, flow generation, and XML formatting.
 */
export async function buildBPMN(analysis: Analysis): Promise<string> {
  const ctx = createContext();
  const {
    elements, flows, handledPairs, flowSources, flowTargets, joinGatewayFor
  } = ctx;

  /* ============================================================================
   * STEP 1 — Add Task Elements
   * ============================================================================
   */
  analysis.activities.forEach(act => addElement(elements, act, 'task', act));

  /* ============================================================================
   * STEP 2 — Direct Dependencies & Initial Split Handling
   * ============================================================================
   */
  for (const activity of analysis.activities) {
    const outgoings = analysis.directDependencies
      .filter(([from]) => from === activity)
      .map(([_, to]) => to);

    if (outgoings.length > 1) {
      // Determine gateway type based on how targets relate
      const gatewayType = inferGatewayTypeFromGroup([activity], outgoings, analysis);
      createSplitJoin(activity, outgoings, gatewayType, analysis, ctx);
    } else if (outgoings.length === 1) {
      // Simple flow between two tasks
      addFlow(activity, outgoings[0], elements, flows, handledPairs, flowSources, flowTargets);
    }
  }

  /* ============================================================================
   * STEP 3 — Handle Special Relations: Parallel, Inclusive (OR), Exclusive (XOR)
   * ============================================================================
   */
  groupRelations(analysis.parallelRelations, 'parallelGateway', analysis, ctx);
  groupRelations(analysis.orRelations ?? [], 'inclusiveGateway', analysis, ctx);
  groupRelations(analysis.exclusiveRelations, 'exclusiveGateway', analysis, ctx);

  /* ============================================================================
   * STEP 4 — Add Start Event + Detect Start Gateway if Needed
   * ============================================================================
   */
  addElement(elements, 'StartEvent_1', 'startEvent');

  const hasIncoming = new Set(analysis.temporalChains.map(([, to]) => to));

  // Find all relation participants that might be early start points
  const relatedFrom = new Set<string>();
  [
    ...(analysis.parallelRelations ?? []),
    ...(analysis.exclusiveRelations ?? []),
    ...(analysis.orRelations ?? [])
  ].forEach(([a, b]) => {
    relatedFrom.add(a);
    relatedFrom.add(b);
  });

  const cleanRelated = Array.from(relatedFrom).filter(a => !hasIncoming.has(a));

  // Final list of start nodes
  const startNodes = analysis.activities.filter(
    a => !hasIncoming.has(a) || cleanRelated.includes(a)
  );

  if (startNodes.length === 1) {
    // Simple case: one start node
    addFlow('StartEvent_1', startNodes[0], elements, flows, handledPairs, flowSources, flowTargets);
  } else {
    // Complex case: multiple start nodes, needs a split
    const gatewayType = detectStartGatewayType(startNodes, analysis);
    const splitId = `${gatewayType}_Split_StartEvent_1`;
    const splitName = gatewayType === 'exclusiveGateway'
      ? 'XOR Split' : gatewayType === 'parallelGateway'
      ? 'AND Split' : 'OR Split';

    addElement(elements, splitId, gatewayType, splitName);
    addFlow('StartEvent_1', splitId, elements, flows, handledPairs, flowSources, flowTargets);
    startNodes.forEach(n => addFlow(splitId, n, elements, flows, handledPairs, flowSources, flowTargets));

    // Optional: Add join gateway if all start branches reconverge
    const successorCandidates = analysis.activities.filter(target =>
      startNodes.every(source =>
        analysis.temporalChains.some(([from, to]) => from === source && to === target)
      )
    );

    if (successorCandidates.length === 1) {
      const target = successorCandidates[0];
      const joinId = `${gatewayType}_Join_${target}`;
      const joinName = gatewayType === 'exclusiveGateway'
        ? 'XOR Join' : gatewayType === 'parallelGateway'
        ? 'AND Join' : 'OR Join';

      addElement(elements, joinId, gatewayType, joinName);
      startNodes.forEach(source => {
        const last = findLastBefore(target, source, analysis);
        if (last && last !== joinId) {
          addFlow(last, joinId, elements, flows, handledPairs, flowSources, flowTargets);
        }
      });
      addFlow(joinId, target, elements, flows, handledPairs, flowSources, flowTargets);
    }
  }

  /* ============================================================================
   * STEP 5 — Merge Multiple Start Splits under One Gateway (if needed)
   * ============================================================================
   */
  const startSplits = ['exclusiveGateway_Split_StartEvent_1', 'parallelGateway_Split_StartEvent_1', 'inclusiveGateway_Split_StartEvent_1']
    .filter(g => elements.has(g));

  if (startSplits.length > 1) {
    const mergedStartId = 'parallelGateway_Split_Start';
    addElement(elements, mergedStartId, 'parallelGateway', 'AND Split');
    addFlow('StartEvent_1', mergedStartId, elements, flows, handledPairs, flowSources, flowTargets);

    for (const g of startSplits) {
      const idx = flows.findIndex(f => f.from === 'StartEvent_1' && f.to === g);
      if (idx !== -1) flows.splice(idx, 1); // Remove old flow
      addFlow(mergedStartId, g, elements, flows, handledPairs, flowSources, flowTargets);
    }
  }

  /* ============================================================================
   * STEP 6 — Add End Event
   * ============================================================================
   */
  addElement(elements, 'EndEvent_1', 'endEvent');

  const endNodes = analysis.activities.filter(a =>
    !analysis.temporalChains.some(([from]) => from === a)
  );

  const existingInEnd = new Set(flows.filter(f => f.to === 'EndEvent_1').map(f => f.from));
  const uniqueEndNodes = endNodes.filter(n => !existingInEnd.has(n));

  if (uniqueEndNodes.length === 1) {
    const n = joinGatewayFor[uniqueEndNodes[0]] || uniqueEndNodes[0];
    addFlow(n, 'EndEvent_1', elements, flows, handledPairs, flowSources, flowTargets);
  } else if (uniqueEndNodes.length > 1) {
    const g = 'inclusiveGateway_Join_End';
    addElement(elements, g, 'inclusiveGateway', 'OR Join');
    uniqueEndNodes.map(n => joinGatewayFor[n] || n).forEach(n => {
      addFlow(n, g, elements, flows, handledPairs, flowSources, flowTargets);
    });
    addFlow(g, 'EndEvent_1', elements, flows, handledPairs, flowSources, flowTargets);
  }

  /* ============================================================================
   * STEP 7 — Cleanup & Optimization
   * ============================================================================
   */
  removeUnnecessaryGateways(ctx);

  /* ============================================================================
   * STEP 8 — BPMN XML Generation
   * ============================================================================
   */
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
                  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
                  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
                  id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="false">
`;

  // Add all nodes
  for (const [id, { type, name }] of elements) {
    xml += `    <bpmn:${type} id="${id}"${name ? ` name="${name}"` : ''}>\n`;
    flows.filter(f => f.to === id).forEach(f => {
      xml += `      <bpmn:incoming>Flow_${f.from}_${f.to}</bpmn:incoming>\n`;
    });
    flows.filter(f => f.from === id).forEach(f => {
      xml += `      <bpmn:outgoing>Flow_${f.from}_${f.to}</bpmn:outgoing>\n`;
    });
    xml += `    </bpmn:${type}>\n`;
  }

  // Add all flows
  for (const { from, to } of flows) {
    xml += `    <bpmn:sequenceFlow id="Flow_${from}_${to}" sourceRef="${from}" targetRef="${to}" />\n`;
  }

  xml += `  </bpmn:process>\n</bpmn:definitions>`;

  // Final layout processing
  return await layoutProcess(xml);
}
