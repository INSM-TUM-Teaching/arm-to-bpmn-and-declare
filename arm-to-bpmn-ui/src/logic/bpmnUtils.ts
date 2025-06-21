// bpmnUtils.ts – helper utilities for building BPMN in-memory model
// -----------------------------------------------------------------------------
// This file defines lightweight helpers to keep buildBPMN.ts clean. It does NOT
// rely on any external BPMN engine runtime. We only manipulate plain JS objects
// and later serialize them to XML strings compatible with bpmn-js / Camunda.
// -----------------------------------------------------------------------------

import { v4 as uuid } from 'uuid';

/* -------------------------------------------------------------------------- */
/*  1. Types                                                                  */
/* -------------------------------------------------------------------------- */
export interface BpmnNode {
  id: string;
  type: string;           // 'task' | 'exclusiveGateway' | 'parallelGateway' | ...
  name?: string;
  incoming: string[];
  outgoing: string[];
}

export interface BpmnEdge {
  id: string;
  type: 'sequenceFlow';
  sourceRef: string;
  targetRef: string;
}

/** bpmElements Map<string, BpmnNode | BpmnEdge> */
export type BpmnElementMap = Map<string, any>;

/* -------------------------------------------------------------------------- */
/*  2. Node creation helpers                                                  */
/* -------------------------------------------------------------------------- */
export function ensureTaskNode(act: string): void {
  if (elements.has(act)) return;
  elements.set(act, {
    id: act,
    type: 'task',
    name: act,
    incoming: [],
    outgoing: []
  });
}

export function createGateway(
  type: 'exclusiveGateway' | 'parallelGateway' | 'inclusiveGateway',
  id?: string
): string {
  const gwId = id ?? `Gateway_${uuid().slice(0, 8)}`;
  elements.set(gwId, {
    id: gwId,
    type,
    incoming: [],
    outgoing: []
  });
  return gwId;
}

export function createSplitGateway(
  from: string,
  targets: string[],
  type: 'exclusiveGateway' | 'parallelGateway' | 'inclusiveGateway'
): string {
  const gw = createGateway(type);
  createFlow(from, gw);
  targets.forEach((t) => createFlow(gw, t));
  return gw;
}

export function createJoinGateway(
  targets: string[],
  to: string,
  type: 'exclusiveGateway' | 'parallelGateway' | 'inclusiveGateway'
): string {
  const gw = createGateway(type);
  targets.forEach((src) => createFlow(src, gw));
  createFlow(gw, to);
  return gw;
}

/* -------------------------------------------------------------------------- */
/*  3. Flow creation                                                          */
/* -------------------------------------------------------------------------- */
function newEdgeId(): string {
  return `Flow_${uuid().slice(0, 8)}`;
}

export function createFlow(source: string, target: string): string {
  const edgeId = newEdgeId();
  const edge: BpmnEdge = {
    id: edgeId,
    type: 'sequenceFlow',
    sourceRef: source,
    targetRef: target
  };
  flows.set(edgeId, edge);
  (elements.get(source)!.outgoing as string[]).push(edgeId);
  (elements.get(target)!.incoming as string[]).push(edgeId);
  return edgeId;
}

/* -------------------------------------------------------------------------- */
/*  4. Convenience – add Start / End events                                   */
/* -------------------------------------------------------------------------- */
export function addStartAndEndEvents() {
  const startId = 'StartEvent_1';
  if (!elements.has(startId)) {
    elements.set(startId, { id: startId, type: 'startEvent', outgoing: [], incoming: [] });
  }
  const endId = 'EndEvent_1';
  if (!elements.has(endId)) {
    elements.set(endId, { id: endId, type: 'endEvent', outgoing: [], incoming: [] });
  }
  return { startId, endId };
}

/* -------------------------------------------------------------------------- */
/*  5. Serialization to BPMN XML (very minimal)                               */
/* -------------------------------------------------------------------------- */
export function serializeProcess(map: BpmnElementMap = elements): string {
  const nodesXml = Array.from(map.values())
    .filter((n) => n.type !== 'sequenceFlow')
    .map((n) =>
      `    <bpmn:${n.type} id="${n.id}" name="${n.name ?? ''}">
${n.incoming.map((i) => `      <bpmn:incoming>${i}</bpmn:incoming>`).join('\n')}
${n.outgoing.map((o) => `      <bpmn:outgoing>${o}</bpmn:outgoing>`).join('\n')}
    </bpmn:${n.type}>`
    )
    .join('\n');

  const edgesXml = Array.from(map.values())
    .filter((e) => e.type === 'sequenceFlow')
    .map((e: BpmnEdge) => `    <bpmn:sequenceFlow id="${e.id}" sourceRef="${e.sourceRef}" targetRef="${e.targetRef}"/>`)
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <bpmn:process id="Process_1" isExecutable="false">
${nodesXml}
${edgesXml}
  </bpmn:process>
</bpmn:definitions>`;
}

/* -------------------------------------------------------------------------- */
/*  6. Module‑local storage (simple maps) – can be reset per build call       */
/* -------------------------------------------------------------------------- */
const elements: BpmnElementMap = new Map<string, any>();
const flows: Map<string, BpmnEdge> = new Map<string, BpmnEdge>();

export function resetBpmnMaps() {
  elements.clear();
  flows.clear();
}
