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
  activityLevels?: Record<string, number>;
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

//determine gateway type based on pairwise relationships
function getRelationFlags(a: string, b: string, analysis: Analysis) {
  return {
    isExclusive: analysis.exclusiveRelations.some(([x, y]) => (x === a && y === b) || (x === b && y === a)),
    isParallel: analysis.parallelRelations.some(([x, y]) => (x === a && y === b) || (x === b && y === a)),
    isInclusive: analysis.orRelations?.some(([x, y]) => (x === a && y === b) || (x === b && y === a)) ?? false,
  };
}

// Generates a label for a gateway based on its type and position (split/join)
function getGatewayLabel(type: 'exclusiveGateway' | 'parallelGateway' | 'inclusiveGateway', position: 'Split' | 'Join') {
  const labelMap = {
    exclusiveGateway: 'XOR',
    parallelGateway: 'AND',
    inclusiveGateway: 'OR',
  };
  return `${labelMap[type]} ${position}`;
}


function getReachableNodes(start: string, chains: [string, string][]): Set<string> {
  const visited = new Set<string>();
  const stack = [start];

  while (stack.length) {
    const node = stack.pop()!;
    for (const [from, to] of chains) {
      if (from === node && !visited.has(to)) {
        visited.add(to);
        stack.push(to);
      }
    }
  }

  return visited;
}

function haveCommonReachable(nodes: string[], chains: [string, string][]): string | null {
  const reachSets = nodes.map(n => getReachableNodes(n, chains));
  return [...reachSets.reduce((a, b) => new Set([...a].filter(x => b.has(x))))][0] ?? null;
}


function maybeCreateNestedSplit(
  t: string,
  analysis: Analysis,
  context: ReturnType<typeof createContext>
) {
  const outgoings = analysis.directDependencies.filter(([from]) => from === t).map(([_, to]) => to);
  if (outgoings.length > 1) {
    const type = inferGatewayTypeFromGroup([t], outgoings, analysis);
    createSplitJoin(t, outgoings, type, analysis, context);
    return `${type}_Split_${t}`;
  }
  return null;
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
  const splitName = getGatewayLabel(type, 'Split');
  const joinName = getGatewayLabel(type, 'Join');

  // Create the split gateway and connect it to the source node
  addElement(elements, splitId, type, splitName);
  addFlow(from, splitId, elements, flows, handledPairs, flowSources, flowTargets);

  // For each target, check if it is itself a split (has multiple outgoing dependencies)
  targets.forEach(t => {
    const nested = maybeCreateNestedSplit(t, analysis, context);
    addFlow(splitId, nested ?? t, elements, flows, handledPairs, flowSources, flowTargets);

  });

  // Find a node all targets converge into (if any)
  const convergeAt = haveCommonReachable(targets, analysis.temporalChains);

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

function inferStartGatewayType(targets: string[], analysis: Analysis): 'exclusiveGateway' | 'inclusiveGateway' | 'parallelGateway' {
  let xorCount = 0, orCount = 0, andCount = 0;

  for (let i = 0; i < targets.length; i++) {
    for (let j = i + 1; j < targets.length; j++) {
      const a = targets[i];
      const b = targets[j];

      if (analysis.exclusiveRelations.some(([x, y]) => (x === a && y === b) || (x === b && y === a))) xorCount++;
      else if (analysis.orRelations?.some(([x, y]) => (x === a && y === b) || (x === b && y === a))) orCount++;
      else if (analysis.parallelRelations.some(([x, y]) => (x === a && y === b) || (x === b && y === a))) andCount++;
    }
  }

  const total = xorCount + orCount + andCount;

  if (xorCount === total) return 'exclusiveGateway';
  if (orCount === total) return 'inclusiveGateway';
  return 'parallelGateway'; // fallback or default
}


/**
 * Create split after an existing gateway
 */
function createSplitAfterGateway(
  gatewayId: string,
  group: string[],
  type: 'exclusiveGateway' | 'parallelGateway' | 'inclusiveGateway',
  analysis: Analysis,
  context: ReturnType<typeof createContext>
) {
  const { elements, flows, handledPairs, flowSources, flowTargets } = context;

  // Create new split gateway
  const splitId = `${type}_Split_After_${gatewayId.replace(/[^a-zA-Z0-9]/g, '_')}`;
  const splitName = getGatewayLabel(type, 'Split');


  addElement(elements, splitId, type, splitName);

  // Find the gateway's output that should be replaced with the split
  const gatewayOutputs = flows.filter(f => f.from === gatewayId);
  
  // For parallel relations like [d,e], we need to redirect the gateway's output
  // The gateway currently goes to one member of the group, we need to redirect through split
  let targetOutput = gatewayOutputs.find(f => group.includes(f.to));
  
  if (!targetOutput && gatewayOutputs.length > 0) {
    // If no direct connection to group members, take the first output
    targetOutput = gatewayOutputs[0];
  }
  
  if (targetOutput) {
    console.log(`[createSplitAfterGateway] Redirecting flow: ${gatewayId} → ${targetOutput.to} through split for group [${group.join(', ')}]`);
    
    // Remove existing flow from gateway to target
    const flowIndex = flows.indexOf(targetOutput);
    flows.splice(flowIndex, 1);
    handledPairs.delete(`${targetOutput.from}->${targetOutput.to}`);
    
    // Update flow tracking
    flowSources.get(targetOutput.from)?.delete(targetOutput.to);
    flowTargets.get(targetOutput.to)?.delete(targetOutput.from);

    // Connect gateway → new split
    addFlow(gatewayId, splitId, elements, flows, handledPairs, flowSources, flowTargets);
    
    // Connect split → all group members
    group.forEach(member => {
      addFlow(splitId, member, elements, flows, handledPairs, flowSources, flowTargets);
      console.log(`[createSplitAfterGateway] Added flow: ${splitId} → ${member}`);
    });

    // Create join if needed
    //const convergeAt = findConvergingNode(group, analysis);
    const convergeAt = haveCommonReachable(group, analysis.temporalChains);

    if (convergeAt) {
      const joinId = `${type}_Join_${convergeAt}`;
      const joinName = getGatewayLabel(type, 'Join');


      // Only add join if it doesn't exist
      if (!elements.has(joinId)) {
        addElement(elements, joinId, type, joinName);
        
        // Connect each group member to the join
        group.forEach(member => {
          addFlow(member, joinId, elements, flows, handledPairs, flowSources, flowTargets);
        });
        
        // Connect join to convergence point
        addFlow(joinId, convergeAt, elements, flows, handledPairs, flowSources, flowTargets);
        
        console.log(`[createSplitAfterGateway] Created join: ${joinId} → ${convergeAt}`);
      }
    }
  } else {
    console.log(`[createSplitAfterGateway] No suitable output found from gateway ${gatewayId} for group [${group.join(', ')}]`);
  }
}


/**
 * Creates a join gateway after existing gateways to handle convergence patterns
 */
function createJoinAfterGateway(
  gatewayId: string,
  convergingActivities: string[],
  type: 'exclusiveGateway' | 'parallelGateway' | 'inclusiveGateway',
  analysis: Analysis,
  context: ReturnType<typeof createContext>
) {
  const { elements, flows, handledPairs, flowSources, flowTargets } = context;

  // Create new join gateway
  const joinId = `${type}_Join_After_${gatewayId.replace(/[^a-zA-Z0-9]/g, '_')}`;
  const joinName = getGatewayLabel(type, 'Join');


  addElement(elements, joinId, type, joinName);

  // Find the gateway's current output
  const gatewayOutputs = flows.filter(f => f.from === gatewayId);
  
  if (gatewayOutputs.length === 1) {
    const gatewayOutput = gatewayOutputs[0];
    
    // Remove existing flow from gateway to its target
    const flowIndex = flows.indexOf(gatewayOutput);
    flows.splice(flowIndex, 1);
    handledPairs.delete(`${gatewayOutput.from}->${gatewayOutput.to}`);
    
    // Update flow tracking
    flowSources.get(gatewayOutput.from)?.delete(gatewayOutput.to);
    flowTargets.get(gatewayOutput.to)?.delete(gatewayOutput.from);

    // Connect gateway → new join
    addFlow(gatewayId, joinId, elements, flows, handledPairs, flowSources, flowTargets);
    
    // Connect all converging activities to the join
    convergingActivities.forEach(activity => {
      addFlow(activity, joinId, elements, flows, handledPairs, flowSources, flowTargets);
    });
    
    // Connect join → original target
    addFlow(joinId, gatewayOutput.to, elements, flows, handledPairs, flowSources, flowTargets);
    
    console.log(`[createJoinAfterGateway] Created: [${gatewayId}, ${convergingActivities.join(', ')}] → ${joinId} → ${gatewayOutput.to}`);
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
  const { elements, flows } = context;
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
    // Try to find a common predecessor
    const preds = analysis.activities.filter(p =>
      group.every(t => analysis.temporalChains.some(([a, b]) => a === p && b === t))
    );

    if (preds.length === 1) {
      // Standard case: single activity predecessor
      createSplitJoin(preds[0], group, type, analysis, context);
    } else if (group.every(t => startNodes.includes(t))) {
      // Special case: all group members are start nodes
      createSplitJoin('StartEvent_1', group, type, analysis, context);
    } else {
      // Enhanced: Look for gateway predecessor
      const gatewayPred = findGatewayPredecessor(group, elements, flows);
      if (gatewayPred) {
        console.log(`[GATEWAY-TO-GATEWAY] Creating ${type} split after gateway ${gatewayPred} for group [${group.join(', ')}]`);
        createSplitAfterGateway(gatewayPred, group, type, analysis, context);
      } else {
        console.log(`[SKIP] No valid split origin found for group [${group.join(', ')}]`);
      }
    }
  }
}

/* ============================================================================
 * Convergence handling — for converging join gateways to join gateways or splits to joins
 * ============================================================================
 */

/**
 * Find a gateway that can serve as predecessor for a group
 */
function findGatewayPredecessor(
  group: string[],
  elements: Map<string, { type: string; name?: string }>,
  flows: Array<{ from: string; to: string }>
): string | null {
  // Find all gateways
  const gateways = Array.from(elements.keys()).filter(id => 
    elements.get(id)?.type.includes('Gateway')
  );

  for (const gateway of gateways) {
    // Check if this gateway's outputs can reach all group members
    const gatewayOutputs = flows.filter(f => f.from === gateway).map(f => f.to);
    
    // Simple check: gateway directly connects to at least one group member
    // and other group members are reachable
    const hasDirectConnection = gatewayOutputs.some(output => group.includes(output));
    
    if (hasDirectConnection && gatewayOutputs.length === 1) {
      // Gateway has single output that's part of our group - perfect candidate
      return gateway;
    }
  }

  return null;
}


function findIntendedTargetForJoin(
  joinGateway: string,
  analysis: Analysis,
  flows: Array<{ from: string; to: string }>
): string | null {
  // Get the activities that feed into this join
  const joinInputs = flows.filter(f => f.to === joinGateway).map(f => f.from);
  
  console.log(`[findIntendedTargetForJoin] Join ${joinGateway} has inputs: [${joinInputs.join(', ')}]`);
  
  if (joinInputs.length === 0) return null;
  
  // Look for common targets in temporal chains
  const commonTargets = analysis.activities.filter(target => {
    // Check if ALL join inputs have temporal chains leading to this target
    return joinInputs.every(input => 
      analysis.temporalChains.some(([from, to]) => from === input && to === target)
    );
  });
  
  console.log(`[findIntendedTargetForJoin] Common targets for inputs: [${commonTargets.join(', ')}]`);
  
  // Return the first common target (if any)
  return commonTargets[0] || null;
}

/**
 * Create convergence when join gateway is disconnected
 */
function createConvergenceFromDisconnectedJoin(
  joinGateway: string,
  convergingActivities: string[],
  targetActivity: string,
  convergenceType: 'exclusiveGateway' | 'parallelGateway' | 'inclusiveGateway',
  context: ReturnType<typeof createContext>
) {
  const { elements, flows, handledPairs, flowSources, flowTargets } = context;
  
  // Create convergence gateway
  const convergenceId = `${convergenceType}_Join_${targetActivity}`;
  const convergenceName = convergenceType === 'exclusiveGateway' ? 'XOR Join' : 
                         convergenceType === 'parallelGateway' ? 'AND Join' : 'OR Join';
  
  console.log(`[createConvergenceFromDisconnectedJoin] Creating convergence: ${convergenceId}`);
  
  addElement(elements, convergenceId, convergenceType, convergenceName);
  
  // Connect the disconnected join to the convergence gateway
  addFlow(joinGateway, convergenceId, elements, flows, handledPairs, flowSources, flowTargets);
  
  // Connect all converging activities to the convergence gateway
  convergingActivities.forEach(activity => {
    // Remove any existing direct flows from activity to target
    const existingFlows = flows.filter(f => f.from === activity && f.to === targetActivity);
    existingFlows.forEach(flow => {
      const flowIndex = flows.indexOf(flow);
      flows.splice(flowIndex, 1);
      handledPairs.delete(`${flow.from}->${flow.to}`);
      flowSources.get(flow.from)?.delete(flow.to);
      flowTargets.get(flow.to)?.delete(flow.from);
    });
    
    // Connect activity to convergence gateway
    addFlow(activity, convergenceId, elements, flows, handledPairs, flowSources, flowTargets);
  });
  
  // Connect convergence gateway to target
  addFlow(convergenceId, targetActivity, elements, flows, handledPairs, flowSources, flowTargets);
  
  console.log(`[createConvergenceFromDisconnectedJoin] Created: [${joinGateway}, ${convergingActivities.join(', ')}] → ${convergenceId} → ${targetActivity}`);
}

/**
 * Enhanced function to detect and handle join-to-join convergence patterns
 */
function handleJoinToJoinConvergence(analysis: Analysis, context: ReturnType<typeof createContext>) {
  const { elements, flows } = context;
  
  console.log(`[handleJoinToJoinConvergence] Analyzing join-to-join patterns`);
  
  // Find all existing join gateways
  const joinGateways = Array.from(elements.keys()).filter(id => 
    id.includes('_Join_') && elements.get(id)?.type.includes('Gateway')
  );
  
  for (const joinGateway of joinGateways) {
    console.log(`[handleJoinToJoinConvergence] Checking join gateway: ${joinGateway}`);
    
    // Find what this join gateway connects to
    const joinOutputs = flows.filter(f => f.from === joinGateway);
    
    let targetActivity: string;
    
if (joinOutputs.length === 1) {
      // Join already has an output
      targetActivity = joinOutputs[0].to;
    } else if (joinOutputs.length === 0) {
      // **NEW**: Join has no output yet - try to find its intended target
      const intendedTarget = findIntendedTargetForJoin(joinGateway, analysis, flows);
      if (!intendedTarget) {
        console.log(`[handleJoinToJoinConvergence] No intended target found for ${joinGateway}, skipping`);
        continue;
      }
      targetActivity = intendedTarget;
      console.log(`[handleJoinToJoinConvergence] Found intended target for ${joinGateway}: ${targetActivity}`);
    } else {
      // Multiple outputs - skip for now
      continue;
    }
    
    if (targetActivity) {
      // Find other activities that should converge with this join's output
      const convergingActivities = findConvergingActivitiesForTarget(targetActivity, joinGateway, analysis, flows);
      
      if (convergingActivities.length > 0) {
        console.log(`[handleJoinToJoinConvergence] Found convergence: ${joinGateway} and [${convergingActivities.join(', ')}] should converge before ${targetActivity}`);
        
        // Determine the type of convergence gateway needed
        const convergenceType = determineConvergenceGatewayType(joinGateway, convergingActivities, analysis);
        
        // **ENHANCED**: Handle case where join has no output yet
        if (joinOutputs.length === 0) {
          createConvergenceFromDisconnectedJoin(joinGateway, convergingActivities, targetActivity, convergenceType, context);
        } else {
          createJoinAfterGateway(joinGateway, convergingActivities, convergenceType, analysis, context);
        }
      }
    }
  }
}

/**
 * Find activities that should converge with a join gateway's output at a specific target
 */

function findConvergingActivitiesForTarget(
  targetActivity: string,
  excludeGateway: string,
  analysis: Analysis,
  flows: Array<{ from: string; to: string }>
): string[] {
  const convergingActivities: string[] = [];
  
  console.log(`[findConvergingActivitiesForTarget] Looking for activities converging at ${targetActivity}, excluding ${excludeGateway}`);
  
  // **FIX**: Look for activities that have direct flows OR temporal chains to the target
  // but are NOT part of the excluded gateway's branch
  
  // 1. Check temporal chains leading to target
  const directTemporalToTarget = analysis.temporalChains
    .filter(([from, to]) => to === targetActivity)
    .map(([from]) => from);
  
  console.log(`[findConvergingActivitiesForTarget] Direct temporal chains to ${targetActivity}: [${directTemporalToTarget.join(', ')}]`);
  
  // 2. Check direct flows leading to target (but not from the excluded gateway)
  const directFlowsToTarget = flows
    .filter(f => f.to === targetActivity && f.from !== excludeGateway)
    .map(f => f.from)
    .filter(source => !source.includes('Gateway')); // Only include actual activities
  
  console.log(`[findConvergingActivitiesForTarget] Direct flows to ${targetActivity}: [${directFlowsToTarget.join(', ')}]`);
  
  // 3. Combine and filter out activities handled by the excluded gateway
  const allCandidates = [...new Set([...directTemporalToTarget, ...directFlowsToTarget])];
  
  for (const candidate of allCandidates) {
    // **KEY FIX**: Skip if this candidate flows INTO the excluded gateway
    const flowsToExcludedGateway = flows.some(f => f.from === candidate && f.to === excludeGateway);
    
    // Skip if this candidate is reachable FROM the excluded gateway (part of its branch)
    const isInExcludedBranch = flows.some(f => f.from === excludeGateway && 
      (f.to === candidate || canReachThroughFlows(f.to, candidate, flows)));
    
    if (!flowsToExcludedGateway && !isInExcludedBranch) {
      convergingActivities.push(candidate);
      console.log(`[findConvergingActivitiesForTarget] Found converging activity: ${candidate}`);
    } else {
      console.log(`[findConvergingActivitiesForTarget] Skipping ${candidate} (part of ${excludeGateway} branch)`);
    }
  }
  
  console.log(`[findConvergingActivitiesForTarget] Final converging activities: [${convergingActivities.join(', ')}]`);
  
  return convergingActivities;
}
/**
 * Helper function to check reachability through flows
 */
function canReachThroughFlows(
  from: string, 
  to: string, 
  flows: Array<{ from: string; to: string }>
): boolean {
  const visited = new Set<string>();
  const queue = [from];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);

    if (current === to) return true;

    flows
      .filter(f => f.from === current)
      .forEach(f => {
        if (!visited.has(f.to)) queue.push(f.to);
      });
  }

  return false;
}

/**
 * Determine what type of gateway is needed for convergence
 */
function determineConvergenceGatewayType(
  joinGateway: string,
  convergingActivities: string[],
  analysis: Analysis
): 'exclusiveGateway' | 'parallelGateway' | 'inclusiveGateway' {
  let hasExclusive = false;
  let hasInclusive = false;
  let hasParallel = false;

  for (let i = 0; i < convergingActivities.length; i++) {
    for (let j = i + 1; j < convergingActivities.length; j++) {
      const { isExclusive, isInclusive, isParallel } = getRelationFlags(
        convergingActivities[i],
        convergingActivities[j],
        analysis
      );
      hasExclusive ||= isExclusive;
      hasInclusive ||= isInclusive;
      hasParallel ||= isParallel;
    }
  }

  if (hasExclusive) return 'exclusiveGateway';
  if (hasInclusive) return 'inclusiveGateway';
  return 'parallelGateway';
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
  handleJoinToJoinConvergence(analysis, ctx);

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

    const splitName = getGatewayLabel(gatewayType, 'Split');


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

      const joinName = getGatewayLabel(gatewayType, 'Join');

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
  // STEP 5 — Smart Merge of Multiple StartEvent Gateways
    const startSplits = ['exclusiveGateway_Split_StartEvent_1', 'parallelGateway_Split_StartEvent_1', 'inclusiveGateway_Split_StartEvent_1']
      .filter(g => elements.has(g));

    if (startSplits.length > 1) {
      // Get the target activities connected to those start gateways
      const targetActivities = startSplits
        .map(g => flows.find(f => f.from === g)?.to)
        .filter((x): x is string => !!x);

      // Determine what type of split we should use based on the relations
      const inferredType = inferStartGatewayType(targetActivities, analysis);
      const mergedStartId = `${inferredType}_Split_Start`;
      const label = getGatewayLabel(inferredType, 'Split');


      // Add the merged gateway
      addElement(elements, mergedStartId, inferredType, label);
      addFlow('StartEvent_1', mergedStartId, elements, flows, handledPairs, flowSources, flowTargets);

      // Reconnect each original gateway to the new merged gateway
      for (const g of startSplits) {
        const idx = flows.findIndex(f => f.from === 'StartEvent_1' && f.to === g);
        if (idx !== -1) flows.splice(idx, 1); // remove old flow
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
    // edited to Determine the correct gateway type based on relationships between end nodes not just include an OR gateway
    const endGatewayType = inferGatewayTypeFromGroup([], uniqueEndNodes, analysis);
    const gatewayName = endGatewayType === 'exclusiveGateway' ? 'XOR Join' : 
                      endGatewayType === 'parallelGateway' ? 'AND Join' : 'OR Join';
    const g = `${endGatewayType}_Join_End`;
    
    addElement(elements, g, endGatewayType, gatewayName);
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