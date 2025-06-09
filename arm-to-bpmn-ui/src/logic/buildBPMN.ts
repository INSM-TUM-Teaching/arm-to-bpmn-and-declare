import type { ARMMatrix } from './translateARM';
import { buildBPMNModelWithAnalysis } from './buildBPMNModelWithAnalysis';

export async function generateBPMNXmlFromARM(matrix: ARMMatrix): Promise<string> {
  const analysis = buildBPMNModelWithAnalysis(matrix);

  const elements = new Map<string, { type: string; name?: string }>();
  const flows: Array<{ from: string; to: string }> = [];
  const gateways = new Set<string>();
  const replacedPairs = new Set<string>();

  // Add tasks
  for (const activity of analysis.topoOrder) {
    elements.set(activity, { type: 'task', name: activity });
  }

  // Exclusive gateways
  for (const [a, b] of analysis.exclusive) {
    const splitId = `XOR_Split_${a}_${b}`;
    const joinId = `XOR_Join_${a}_${b}`;
    elements.set(splitId, { type: 'exclusiveGateway', name: 'XOR Split' });
    elements.set(joinId, { type: 'exclusiveGateway', name: 'XOR Join' });
    gateways.add(splitId);
    gateways.add(joinId);

    flows.push({ from: a, to: splitId }, { from: splitId, to: b }, { from: b, to: joinId });
    replacedPairs.add(`${a}->${b}`);
  }

  // Parallel gateways
  for (const [a, b] of analysis.parallel) {
    const splitId = `AND_Split_${a}_${b}`;
    const joinId = `AND_Join_${a}_${b}`;
    elements.set(splitId, { type: 'parallelGateway', name: 'AND Split' });
    elements.set(joinId, { type: 'parallelGateway', name: 'AND Join' });
    gateways.add(splitId);
    gateways.add(joinId);

    flows.push({ from: a, to: splitId }, { from: splitId, to: b }, { from: b, to: joinId });
    replacedPairs.add(`${a}->${b}`);
  }

  // Add direct flows only if not handled by gateway
  for (const [from, to] of analysis.chains) {
    if (!replacedPairs.has(`${from}->${to}`)) {
      flows.push({ from, to });
    }
  }

  // Start and End events
  const processId = 'Process_' + Math.random().toString(36).substring(2, 9);
  const firstActivity = analysis.topoOrder[0];
  const lastActivity = analysis.topoOrder[analysis.topoOrder.length - 1];

  flows.push({ from: 'StartEvent_1', to: firstActivity });
  flows.push({ from: lastActivity, to: 'EndEvent_1' });

  // Layout
  const layers: Map<number, string[]> = new Map();
  const visited = new Set<string>();
  function dfs(node: string, depth: number) {
    if (visited.has(node)) return;
    visited.add(node);
    if (!layers.has(depth)) layers.set(depth, []);
    layers.get(depth)!.push(node);
    const children = flows.filter(f => f.from === node).map(f => f.to);
    for (const child of children) dfs(child, depth + 1);
  }
  dfs(firstActivity, 0);

  // Build XML
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
                  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
                  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
                  id="Definitions_1"
                  targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="${processId}" isExecutable="false">
    <bpmn:startEvent id="StartEvent_1">
      <bpmn:outgoing>Flow_StartEvent_1_${firstActivity}</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:endEvent id="EndEvent_1">
      <bpmn:incoming>Flow_${lastActivity}_EndEvent_1</bpmn:incoming>
    </bpmn:endEvent>`;

  // Add elements with filtered in/out for tasks
  for (const [id, element] of elements) {
    let incoming: string[] = [];
    let outgoing: string[] = [];

    if (!gateways.has(id) && id !== 'StartEvent_1' && id !== 'EndEvent_1') {
      const inFlow = flows.find(f => f.to === id);
      const outFlow = flows.find(f => f.from === id);
      if (inFlow) incoming.push(`Flow_${inFlow.from}_${id}`);
      if (outFlow) outgoing.push(`Flow_${id}_${outFlow.to}`);
    } else {
      incoming = flows.filter(f => f.to === id).map(f => `Flow_${f.from}_${id}`);
      outgoing = flows.filter(f => f.from === id).map(f => `Flow_${id}_${f.to}`);
    }

    xml += `
    <bpmn:${element.type} id="${id}" name="${element.name || ''}">`;
    for (const inc of incoming) xml += `
      <bpmn:incoming>${inc}</bpmn:incoming>`;
    for (const out of outgoing) xml += `
      <bpmn:outgoing>${out}</bpmn:outgoing>`;
    xml += `
    </bpmn:${element.type}>`;
  }

  // Render flows (one per task)
  const taskFlowCounts = new Set<string>();
  for (const flow of flows) {
    const isFromTask = elements.has(flow.from) && elements.get(flow.from)!.type === 'task';
    const isToTask = elements.has(flow.to) && elements.get(flow.to)!.type === 'task';

    const key = `${flow.from}->${flow.to}`;
    if ((isFromTask && [...taskFlowCounts].some(k => k.startsWith(`${flow.from}->`))) ||
        (isToTask && [...taskFlowCounts].some(k => k.endsWith(`->${flow.to}`)))) {
      continue;
    }

    xml += `
    <bpmn:sequenceFlow id="Flow_${flow.from}_${flow.to}" sourceRef="${flow.from}" targetRef="${flow.to}" />`;
    taskFlowCounts.add(key);
  }

  // BPMN DI
  xml += `
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="${processId}">`;

  const elementPositions = new Map<string, { x: number; y: number }>();
  let xOffset = 150;
  let yOffset = 100;

  for (const [depth, nodes] of layers.entries()) {
    const y = yOffset + depth * 150;
    nodes.forEach((id, i) => {
      const x = xOffset + i * 200;
      elementPositions.set(id, { x, y });
      const width = gateways.has(id) ? 50 : 100;
      const height = gateways.has(id) ? 50 : 80;
      xml += `
      <bpmndi:BPMNShape id="${id}_di" bpmnElement="${id}">
        <dc:Bounds x="${x}" y="${y}" width="${width}" height="${height}" />
      </bpmndi:BPMNShape>`;
    });
  }

  elementPositions.set('StartEvent_1', { x: 100, y: 50 });
  elementPositions.set('EndEvent_1', { x: 1000, y: yOffset + layers.size * 150 });

  xml += `
      <bpmndi:BPMNShape id="StartEvent_1_di" bpmnElement="StartEvent_1">
        <dc:Bounds x="100" y="50" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="EndEvent_1_di" bpmnElement="EndEvent_1">
        <dc:Bounds x="1000" y="${yOffset + layers.size * 150}" width="36" height="36" />
      </bpmndi:BPMNShape>`;

  for (const flow of flows) {
    const key = `${flow.from}->${flow.to}`;
    if (!taskFlowCounts.has(key)) continue;

    const source = elementPositions.get(flow.from);
    const target = elementPositions.get(flow.to);
    if (source && target) {
      const sourceX = source.x + 50;
      const sourceY = source.y + 40;
      const targetX = target.x;
      const targetY = target.y + 40;
      xml += `
      <bpmndi:BPMNEdge id="Flow_${flow.from}_${flow.to}_di" bpmnElement="Flow_${flow.from}_${flow.to}">
        <di:waypoint x="${sourceX}" y="${sourceY}" />
        <di:waypoint x="${targetX}" y="${targetY}" />
      </bpmndi:BPMNEdge>`;
    }
  }

  xml += `
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;

  return xml;
}
