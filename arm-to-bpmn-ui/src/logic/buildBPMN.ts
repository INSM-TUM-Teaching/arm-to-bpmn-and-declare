import { layoutProcess } from 'bpmn-auto-layout';

// Type definition for the input analysis structure
export type Analysis = {
  activities: string[]; // All activity IDs
  temporalChains: [string, string][]; // Ordered pairs representing sequence constraints (a → b)
  exclusiveRelations: [string, string][]; // Mutually exclusive branches
  parallelRelations: [string, string][]; // Activities that should run in parallel
  directDependencies: [string, string][]; // Direct a → b links (not transitive)
  optionalDependencies?: [string, string, 'optional_to' | 'optional_from'][]; // Optional relations (not used here)
  topoOrder?: string[]; // Optional topological ordering of activities
};

// Main function to build the BPMN XML from an analysis object
export async function buildBPMN(analysis: Analysis): Promise<string> {
  const elements = new Map<string, { type: string; name?: string }>(); // BPMN nodes
  const flows: Array<{ from: string; to: string }> = []; // Sequence flows
  const gateways = new Set<string>(); // Set of inserted gateways
  const handledPairs = new Set<string>(); // To avoid duplicate flows

  console.log("start", analysis.parallelRelations)

  // Step 1: Create all activities as BPMN task elements
  for (const activity of analysis.activities) {
    elements.set(activity, { type: 'task', name: activity });
  }

  /**
   * Helper: Insert split + join gateways (exclusive or parallel)
   * - Adds a gateway from the source to each target
   * - If all targets reconverge at the same activity, add a join gateway before it
   */
  function createSplitGateway(from: string, targets: string[], type: 'exclusiveGateway' | 'parallelGateway') {
    const splitId = `${type}_Split_${from}`;
    elements.set(splitId, { type, name: type.includes('exclusive') ? 'XOR Split' : 'AND Split' });
    gateways.add(splitId);

    flows.push({ from, to: splitId });

    for (const to of targets) {
      flows.push({ from: splitId, to });
      handledPairs.add(`${from}->${to}`);
    }

    // Optional: add join gateway if all targets lead to the same next activity
    const nextHops = targets.map(source =>
      analysis.temporalChains.find(([a, b]) => a === source)?.[1]
    );

    const uniqueHops = Array.from(new Set(nextHops.filter(Boolean)));

    if (uniqueHops.length === 1) {
      const joinTarget = uniqueHops[0]!;
      const joinId = `${type}_Join_${joinTarget}`;
      elements.set(joinId, { type, name: type.includes('exclusive') ? 'XOR Join' : 'AND Join' });
      gateways.add(joinId);

      for (const source of targets) {
        flows.push({ from: source, to: joinId });
        handledPairs.add(`${source}->${joinTarget}`);
      }

      flows.push({ from: joinId, to: joinTarget });
    }
  }

  /**
   * Step 2: Analyze directDependencies and build structure
   * - For each activity, determine its outgoing flows
   * - Decide if it's a plain sequence, exclusive gateway, or parallel gateway
   */
  for (const activity of analysis.activities) {
    //check direct dependi
    const allTargets = analysis.directDependencies
      .filter(([a]) => a === activity)
      .map(([, b]) => b);

    // Remove transitive dependencies (i.e., b in a → b → c)
    let filteredTargets = allTargets.filter(target =>
      !allTargets.some(other =>
        other !== target &&
        analysis.temporalChains.some(([from, to]) => from === other && to === target)
      )
    );

    if (filteredTargets.length === 1) {
      // Just a plain sequence flow
      const to = filteredTargets[0];
      const key = `${activity}->${to}`;
      if (!handledPairs.has(key)) {
        flows.push({ from: activity, to });
        handledPairs.add(key);
      }
    } else if (filteredTargets.length > 1) {
      // Step 3: Decide if it's an exclusive or parallel gateway

      const isExclusive = analysis.exclusiveRelations.some(
        ([x, y]) => filteredTargets.includes(x) && filteredTargets.includes(y)
      );

      if (isExclusive) {
        createSplitGateway(activity, filteredTargets, 'exclusiveGateway');
      } else {
        // If not exclusive, check for parallel
        console.log("parallel", analysis.parallelRelations)
        const isParallel = filteredTargets.some((t1, i) =>
          filteredTargets.slice(i + 1).some(t2 =>
            analysis.parallelRelations.some(
              ([x, y]) =>
                (x === t1 && y === t2) || (x === t2 && y === t1)
            )
          )
        );

        if (isParallel) {
          createSplitGateway(activity, filteredTargets, 'parallelGateway');
        } else {
          // Otherwise, connect all normally (e.g., if relationships are unclear)
          for (const to of filteredTargets) {
            const key = `${activity}->${to}`;
            if (!handledPairs.has(key)) {
              flows.push({ from: activity, to });
              handledPairs.add(key);
            }
          }
        }
      }
    }
  }

  // Step 4: Add Start and End events connected to the first and last activity
  const first = analysis.topoOrder?.[0] || analysis.activities[0];
  const last = analysis.topoOrder?.[analysis.activities.length - 1] || analysis.activities.at(-1)!;

  elements.set('StartEvent_1', { type: 'startEvent' });
  elements.set('EndEvent_1', { type: 'endEvent' });
  flows.push({ from: 'StartEvent_1', to: first });
  flows.push({ from: last, to: 'EndEvent_1' });

  /**
   * Step 5: Generate BPMN XML from all elements and flows
   */
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
                  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
                  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
                  id="Definitions_1"
                  targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="false">
`;

  // Add all BPMN nodes
  for (const [id, { type, name }] of elements) {
    xml += `    <bpmn:${type} id="${id}"${name ? ` name="${name}"` : ''}>
`;
    const inc = flows.filter(f => f.to === id).map(f => `Flow_${f.from}_${f.to}`);
    const out = flows.filter(f => f.from === id).map(f => `Flow_${f.from}_${f.to}`);
    for (const i of inc) xml += `      <bpmn:incoming>${i}</bpmn:incoming>
`;
    for (const o of out) xml += `      <bpmn:outgoing>${o}</bpmn:outgoing>
`;
    xml += `    </bpmn:${type}>
`;
  }

  // Add all sequence flows
  for (const { from, to } of flows) {
    xml += `    <bpmn:sequenceFlow id="Flow_${from}_${to}" sourceRef="${from}" targetRef="${to}" />
`;
  }

  xml += `  </bpmn:process>
</bpmn:definitions>`;

  // Step 6: Apply auto-layout to get readable positioning for diagram
  const laidOut = await layoutProcess(xml);
  return laidOut;
}
