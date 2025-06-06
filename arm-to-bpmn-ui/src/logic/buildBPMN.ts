import type { ARMMatrix, Relation, Existential } from './translateARM';

export interface BPMNTask {
  id: string;
  incoming: string[];
  outgoing: string[];
}

export interface BPMNGateway {
  id: string;
  type: "parallel" | "exclusive";
  incoming: string[];
  outgoing: string[];
}

export interface BPMNModel {
  tasks: Record<string, BPMNTask>;
  gateways: Record<string, BPMNGateway>; 
  flows: { from: string; to: string }[];
}


export interface BPMNModel {
  tasks: Record<string, BPMNTask>;
  flows: { from: string; to: string }[];
}

export function buildBPMN(matrix: ARMMatrix): BPMNModel {
  const model: BPMNModel = {
    tasks: {},
    flows: [],
    gateways: {},
  };

  // Step 1: Create a task node for every activity
  for (const activity in matrix) {
    model.tasks[activity] = {
      id: activity,
      incoming: [],
      outgoing: []
    };
  }

  // Step 2: Add sequence flows for each strict temporal relation
  for (const from in matrix) {
    for (const to in matrix[from]) {
      const [temporal] = matrix[from][to];
      if (temporal === "<" || temporal === "<d") {
        model.flows.push({ from, to });
        model.tasks[from].outgoing.push(to);
        model.tasks[to].incoming.push(from);
      }
    }
  }

  return model;
}


//insert gateway 
let gatewayCounter = 1;

function insertGateway(
  model: BPMNModel,
  source: string,
  targets: string[],
  type: "parallel" | "exclusive"
) {
  const gatewayId = `Gateway_${gatewayCounter++}`;
  console.log("Inserting gateway", gatewayId, "from", source, "to", targets, "type:", type);

  model.gateways[gatewayId] = {
    id: gatewayId,
    type,
    incoming: [source],
    outgoing: targets
  };

  //1. Remove direct flows
  model.flows = model.flows.filter(f => !(f.from === source && targets.includes(f.to)));

  //2. Fix `outgoing` in source to point only to gateway
  model.tasks[source].outgoing = [gatewayId];

  //3. Add new flow: source → gateway
  model.flows.push({ from: source, to: gatewayId });

  //4. For each target, add gateway → target
  for (const target of targets) {
    model.flows.push({ from: gatewayId, to: target });

    // Replace incoming link from source to gateway
    model.tasks[target].incoming = model.tasks[target].incoming.map(id =>
      id === source ? gatewayId : id
    );
  }

  return gatewayId;
}


//insert paarallel gateway
export function insertParallelGateways(model: BPMNModel, arm: ARMMatrix) {
  for (const source in model.tasks) {
    const outgoing = model.tasks[source].outgoing;

    if (outgoing.length <= 1) continue; // skip if no split

    const types = outgoing.map((target) => {
      const relation = arm[source]?.[target];
      return relation ? relation[1] : "x"; // get existential part
    });

        const uniqueTypes = new Set(types);

        if (uniqueTypes.size === 1) {
        const type = uniqueTypes.values().next().value;
        if (type === "⇔") {
            insertGateway(model, source, outgoing, "parallel");
        } else if (type === "⇎") {
            insertGateway(model, source, outgoing, "exclusive");
        }
        }

  }
}

export function generateBPMNXml(model: BPMNModel): string {
  const startTargets = Object.keys(model.tasks).filter(id => model.tasks[id].incoming.length === 0);
  const endSources = Object.keys(model.tasks).filter(id => model.tasks[id].outgoing.length === 0);
  console.log("All flows:", model.flows);
  console.log("Tasks:", model.tasks);
  console.log("Flows:", model.flows);
  console.log("Gateways:", model.gateways);

    const allFlows = [
    ...model.flows,
    ...startTargets.map(id => ({ from: "StartEvent_1", to: id })),
    ...endSources.map(id => ({ from: id, to: "EndEvent_1" }))
    ];


  const tasksXml = Object.keys(model.tasks).map(id => {
    return `<bpmn:task id="${id}" name="${id}">
      ${model.tasks[id].incoming.map(inId => `<bpmn:incoming>flow_${inId}_${id}</bpmn:incoming>`).join("\n")}
      ${model.tasks[id].outgoing.map(outId => `<bpmn:outgoing>flow_${id}_${outId}</bpmn:outgoing>`).join("\n")}
    </bpmn:task>`;
  });

  const gatewaysXml = Object.values(model.gateways).map(gateway => {
    const tag = gateway.type === "parallel" ? "bpmn:parallelGateway" : "bpmn:exclusiveGateway";
    return `<${tag} id="${gateway.id}">
      ${gateway.incoming.map(inId => `<bpmn:incoming>flow_${inId}_${gateway.id}</bpmn:incoming>`).join("\n")}
      ${gateway.outgoing.map(outId => `<bpmn:outgoing>flow_${gateway.id}_${outId}</bpmn:outgoing>`).join("\n")}
    </${tag}>`;
  });

const sequenceFlowsXml = allFlows.map(({ from, to }) =>
  `<bpmn:sequenceFlow id="flow_${from}_${to}" sourceRef="${from}" targetRef="${to}" />`
);

const edgeElements = allFlows.map(({ from, to }) => `
  <bpmndi:BPMNEdge id="edge_${from}_${to}" bpmnElement="flow_${from}_${to}">
    <di:waypoint x="0" y="0" />
    <di:waypoint x="0" y="0" />
  </bpmndi:BPMNEdge>
`);

  const startEvent = `<bpmn:startEvent id="StartEvent_1">
    ${startTargets.map(id => `<bpmn:outgoing>flow_StartEvent_1_${id}</bpmn:outgoing>`).join("\n")}
  </bpmn:startEvent>`;

  const endEvent = `<bpmn:endEvent id="EndEvent_1">
    ${endSources.map(id => `<bpmn:incoming>flow_${id}_EndEvent_1</bpmn:incoming>`).join("\n")}
  </bpmn:endEvent>`;



  const shapeElements = Object.keys(model.tasks).map((id, index) => {
    const x = 150;
    const y = 100 + index * 100;
    return `
      <bpmndi:BPMNShape id="shape_${id}" bpmnElement="${id}">
        <dc:Bounds x="${x}" y="${y}" width="100" height="80"/>
      </bpmndi:BPMNShape>
    `;
  });

  const gatewayShapes = Object.values(model.gateways).map((gw, index) => {
    const x = 400;
    const y = 100 + index * 100;
    return `
      <bpmndi:BPMNShape id="shape_${gw.id}" bpmnElement="${gw.id}">
        <dc:Bounds x="${x}" y="${y}" width="50" height="50"/>
      </bpmndi:BPMNShape>
    `;
  });

  const startBounds = `
    <bpmndi:BPMNShape id="shape_StartEvent_1" bpmnElement="StartEvent_1">
      <dc:Bounds x="50" y="50" width="36" height="36"/>
    </bpmndi:BPMNShape>
  `;

  const endBounds = `
    <bpmndi:BPMNShape id="shape_EndEvent_1" bpmnElement="EndEvent_1">
      <dc:Bounds x="600" y="50" width="36" height="36"/>
    </bpmndi:BPMNShape>
  `;


  return `<?xml version="1.0" encoding="UTF-8"?>
  <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                    xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
                    xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
                    xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
                    id="Definitions_1"
                    targetNamespace="http://bpmn.io/schema/bpmn">
    <bpmn:process id="Process_1" isExecutable="false">
      ${startEvent}
      ${tasksXml.join("\n")}
      ${gatewaysXml.join("\n")}
      ${endEvent}
      ${sequenceFlowsXml.join("\n")}
    </bpmn:process>

    <bpmndi:BPMNDiagram id="BPMNDiagram_1">
      <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
        ${startBounds}
        ${endBounds}
        ${shapeElements.join("\n")}
        ${gatewayShapes.join("\n")}
        ${edgeElements.join("\n")}
      </bpmndi:BPMNPlane>
    </bpmndi:BPMNDiagram>
  </bpmn:definitions>`;
}
