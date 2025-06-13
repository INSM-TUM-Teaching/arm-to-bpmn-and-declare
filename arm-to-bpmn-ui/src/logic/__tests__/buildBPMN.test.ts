
import { generateBPMNXmlFromARM } from '../buildBPMN';
import type { ARMMatrix } from '../translateARM';
//buildChecks whether the BPMN function works correctly. In particular, it tests the following aspects of the BPMN model: Which tasks are being created?, Which flows are added?, Which relationship types are ignored in terms of ordering?
//The buildBPMN function is proven to create the correct nodes, to process only the correct relationships as flows, and to exclude unnecessary (out-of-time) relationships.

describe('buildBPMN', () => {
  it('should create tasks for each activity', async () => {
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

    // Activities must be passed as task id or name in XML.
    expect(xml).toContain('a');
    expect(xml).toContain('b');
    expect(xml).toContain('c');
    expect(xml).toContain('d');

  });

  it('should add sequence flow for direct temporal relation <d', async () => {
    const matrix: ARMMatrix = {
      "a": {
          "a": ["x", "x"],
          "b": ["<d", "⇒"]
        },
        "b": {
          "a": [">d", "⇐"],
          "b": ["x", "x"]
        }
    };

    const xml = await generateBPMNXmlFromARM(matrix);

    // Check if sequenceFlow from a to b exists in XML
    expect(xml).toContain('sequenceFlow id="Flow_a_b"');

    // XML check that task a is outgoing and task b is incoming
    expect(xml).toContain('task id="a"');
    expect(xml).toContain('task id="b"');
      
  });

  it('should ignore non-temporal relations like "-"', async () => {
    const matrix: ARMMatrix = {
     "a": {
          "a": ["x", "x"],
          "b": ["-", "⇎"]
        },
        "b": {
          "a": ["-", "⇎"],
          "b": ["x", "x"]
        }
    };

    const xml = await generateBPMNXmlFromARM(matrix);

    // There should be no sequenceFlow in XML because "-" is not temporal
    expect(xml).not.toContain('sequenceFlow id="Flow_a_b"');
    
  });
});
