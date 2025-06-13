import { generateBPMNXmlFromARM } from '../buildBPMN';
import type { ARMMatrix } from '../translateARM';


//Checks that the generateBPMNXml function correctly generates BPMN XML output.

describe('generateBPMNXml', () => {
  it('should generate valid BPMN XML with start and end events', async () => {
    const matrix: ARMMatrix = {
      "a": {
        "a": ["x", "x"],
        "b": ["<", "⇔"]
      },
      "b": {
        "a": [">", "⇔"],
        "b": ["x", "x"]
      }
    };


    const xml = await generateBPMNXmlFromARM(matrix);

    expect(xml).toContain('<bpmn:startEvent id="StartEvent_1">');
    expect(xml).toContain('<bpmn:endEvent id="EndEvent_1">');
    expect(xml).toContain('<bpmn:task id="a"');
    expect(xml).toContain('<bpmn:task id="b"');

    expect(xml).toMatch(/Flow_a_b/);

  });

  it('should include AND gateway in the XML if inserted', async () => {
    const matrix: ARMMatrix = {
      "a": {
        "a": ["x", "x"],
        "b": ["<", "⇔"],
        "c": ["<", "⇔"]
      },
      "b": {
        "a": [">", "⇔"],
        "b": ["x", "x"],
        "c": ["-", "⇔"]
      },
      "c": {
        "a": [">", "⇔"],
        "b": ["-", "⇔"],
        "c": ["x", "x"]
      }
    };

    const xml = await generateBPMNXmlFromARM(matrix);

    expect(xml).toContain('<bpmn:parallelGateway'); 
    expect(xml).toMatch(/Flow_a_AND_Split_/);      
    expect(xml).toMatch(/Flow_AND_Split_.*_b/);    
    expect(xml).toMatch(/Flow_AND_Split_.*_c/);    
  });

  it('should include XOR gateway in the XML if inserted', async () => {
    const matrix: ARMMatrix = {
      "a": {
        "a": ["x", "x"],
        "b": [">", "⇐"],
        "c": ["-", "⇔"],
        "d": ["<", "⇔"],
        "e": [">", "⇐"]
      },
      "b": {
        "a": ["<", "⇒"],
        "b": ["x", "x"],
        "c": ["-", "⇒"],
        "d": ["<", "⇒"],
        "e": ["-", "⇎"]
      },
      "c": {
        "a": ["-", "⇔"],
        "b": ["-", "⇐"],
        "c": ["x", "x"],
        "d": ["<", "⇔"],
        "e": ["-", "⇐"]
      },
      "d": {
        "a": [">", "⇔"],
        "b": [">", "⇐"],
        "c": [">", "⇔"],
        "d": ["x", "x"],
        "e": [">", "⇐"]
      },
      "e": {
        "a": ["<", "⇒"],
        "b": ["-", "⇎"],
        "c": ["-", "⇒"],
        "d": ["<", "⇒"],
        "e": ["x", "x"]
      }
    };

    const xml = await generateBPMNXmlFromARM(matrix);

    expect(xml).toContain('<bpmn:exclusiveGateway'); // XOR gateways
  });

  it('should include BPMNDiagram and BPMNPlane in the XML', async () => {
    const matrix: ARMMatrix = {
      "a": {
        "a": ["x", "x"],
        "b": ["-", "⇔"],
        "c": ["<", "⇔"],
        "d": ["<", "⇔"]
      },
      "b": {
        "a": ["-", "⇔"],
        "b": ["x", "x"],
        "c": ["-", "⇔"],
        "d": ["<", "⇔"]
      },
      "c": {
        "a": [">", "⇔"],
        "b": ["-", "⇔"],
        "c": ["x", "x"],
        "d": ["-", "⇔"]
      },
      "d": {
        "a": [">", "⇔"],
        "b": [">", "⇔"],
        "c": ["-", "⇔"],
        "d": ["x", "x"]
      }
    };

    const xml = await generateBPMNXmlFromARM(matrix);

    expect(xml).toContain('<bpmndi:BPMNDiagram');
    expect(xml).toContain('<bpmndi:BPMNPlane');
    expect(xml).toContain('<dc:Bounds');
  });
});
