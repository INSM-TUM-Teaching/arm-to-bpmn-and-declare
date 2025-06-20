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


      // helper function that returns the first common reachable node from all given sources using temporalChains
  function findConvergingNode(sources: string[], chains: [string, string][]): string | null {
    const getReachables = (start: string): Set<string> => {
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
    };

    const reachSets = sources.map(getReachables);
    const common = reachSets.reduce((acc, set) => {
      return new Set([...acc].filter(x => set.has(x)));
    });

    return [...common][0] ?? null;
  }
  //end of helper function

  function findLastNodeBefore(target: string, start: string, chains: [string, string][]): string | null {
    let current = start;
    while (true) {
      const next = chains.find(([a]) => a === current)?.[1];
      if (!next || next === target) break;
      current = next;
    }
    return current === target ? null : current;
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


    // OLD logic (optional): immediate convergence
    const nextHops = targets.map(source => analysis.temporalChains.find(([a, b]) => a === source)?.[1]);
    const uniqueHops = Array.from(new Set(nextHops.filter(Boolean)));

    if (uniqueHops.length === 1) {
      console.log("uniqueHops", uniqueHops)
      const joinTarget = uniqueHops[0]!;
      const joinId = `${type}_Join_${joinTarget}`;
      elements.set(joinId, { type, name: type.includes('exclusive') ? 'XOR Join' : 'AND Join' });
      gateways.add(joinId);

      for (const source of targets) {
        flows.push({ from: source, to: joinId });
        handledPairs.add(`${source}->${joinTarget}`);
      }

      flows.push({ from: joinId, to: joinTarget });
      
    } else {
            console.log("uniqueHops", "no else")
      // neW logic: check eventual convergence
      const convergeAt = findConvergingNode(targets, analysis.temporalChains);
      if (convergeAt) {
        const joinId = `${type}_Join_${convergeAt}`;
        elements.set(joinId, { type, name: type.includes('exclusive') ? 'XOR Join' : 'AND Join' });
        gateways.add(joinId);

        for (const source of targets) {
          const lastBefore = findLastNodeBefore(convergeAt, source, analysis.temporalChains);
          if (!lastBefore) continue;
          flows.push({ from: lastBefore, to: joinId });
          handledPairs.add(`${lastBefore}->${convergeAt}`);
        }

        flows.push({ from: joinId, to: convergeAt });
      }
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
        // 修正：檢查當前活動是否需要平行分叉
        // 如果目標活動可以同時執行（不互斥），則使用平行閘道
        const hasParallelTargets = filteredTargets.length > 1 && 
          !filteredTargets.some((t1, i) =>
            filteredTargets.slice(i + 1).some(t2 =>
              analysis.exclusiveRelations.some(([x, y]) =>
                (x === t1 && y === t2) || (x === t2 && y === t1)
              )
            )
          );

        if (hasParallelTargets) {
          console.log(`Creating parallel gateway from ${activity} to [${filteredTargets.join(', ')}]`);
          createSplitGateway(activity, filteredTargets, 'parallelGateway');
        } else {
          // 否則建立普通的序列流
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
