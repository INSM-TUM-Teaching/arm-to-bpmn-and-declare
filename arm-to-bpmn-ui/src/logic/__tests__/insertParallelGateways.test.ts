import { buildBPMN, insertParallelGateways } from '../buildBPMN';
import type { ARMMatrix } from '../translateARM';

//tests whether the insertParallelGateways function adds the right type of gateways (parallel or exclusive) under the right conditions.

describe('insertParallelGateways', () => {
  it('should insert a and(parallel) gateway for ⇔ relations', () => {
    const matrix: ARMMatrix = {
       "a": {
          "a": ["x", "x"],
          "b": ["-", "⇔"],
          "c": ["<", "⇔"]
        },
        "b": {
          "a": ["-", "⇔"],
          "b": ["x", "x"],
          "c": ["-", "⇔"]
        },
        "c": {
          "a": [">", "⇔"],
          "b": ["-", "⇔"],
          "c": ["x", "x"]
        }
    };

    const model = buildBPMN(matrix);
    insertParallelGateways(model, matrix);

    const gatewayKeys = Object.keys(model.gateways);
    expect(gatewayKeys.length).toBe(1);

    const gateway = model.gateways[gatewayKeys[0]];
    expect(gateway.type).toBe('parallel');
    expect(model.flows).toEqual(
      expect.arrayContaining([
        { from: 'a', to: gateway.id },
        { from: gateway.id, to: 'b' },
        { from: gateway.id, to: 'c' }
      ])
    );
  });

  it('should insert an XOR(exclusive) gateway for ⇎ relations', () => {
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

    const model = buildBPMN(matrix);
    insertParallelGateways(model, matrix);

    const gatewayKeys = Object.keys(model.gateways);
    expect(gatewayKeys.length).toBe(1);
    expect(model.gateways[gatewayKeys[0]].type).toBe('exclusive');
  });

  it('should not insert a gateway if outgoing relations differ', () => {
    const matrix: ARMMatrix = {
      "a": {
        "a": ["x", "x"],
        "b": [">", "⇐"],
        "c": ["-", "⇎"],
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
        "a": ["-", "⇎"],
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

    const model = buildBPMN(matrix);
    insertParallelGateways(model, matrix);

    expect(Object.keys(model.gateways).length).toBe(0);
  });
  
});
