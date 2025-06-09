import { buildBPMN } from '../buildBPMN';
import type { ARMMatrix } from '../translateARM';

//buildChecks whether the BPMN function works correctly. In particular, it tests the following aspects of the BPMN model: Which tasks are being created?, Which flows are added?, Which relationship types are ignored in terms of ordering?
//The buildBPMN function is proven to create the correct nodes, to process only the correct relationships as flows, and to exclude unnecessary (out-of-time) relationships.

describe('buildBPMN', () => {
  it('should create tasks for each activity', () => {
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
    const model = buildBPMN(matrix);

    expect(Object.keys(model.tasks)).toEqual([['a', 'b', 'c', 'd']]);
    expect(model.flows).toEqual([]);
  });

  it('should add sequence flow for direct temporal relation <d', () => {
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
    const model = buildBPMN(matrix);

    expect(model.flows).toEqual([{ from: 'a', to: 'b' }]);
    expect(model.tasks['a'].outgoing).toContain('b');
    expect(model.tasks['b'].incoming).toContain('a');
  });

  it('should ignore non-temporal relations like "-"', () => {
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
    const model = buildBPMN(matrix);

    expect(model.flows.length).toBe(0);
  });
});
