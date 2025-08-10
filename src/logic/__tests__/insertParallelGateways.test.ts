//import { buildBPMN, insertParallelGateways } from '../buildBPMN';
//import { detectExclusiveRelations, detectParallelRelations, detectOptionalDependencies } from '../translateARM';

import { buildBPMNModelWithAnalysis } from '../buildBPMNModelWithAnalysis'; 
import type { ARMMatrix } from '../translateARM';

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

    const model = buildBPMNModelWithAnalysis(matrix);

    expect(model.parallel).toEqual(
      expect.arrayContaining([
        ["a", "b"],
        ["a", "c"],
        ["b", "c"]
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

    const model = buildBPMNModelWithAnalysis(matrix);

    expect(model.parallel).toEqual(
      expect.arrayContaining([
        ["b", "e"],
        ["e", "b"]
      ])
    );
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

    const model = buildBPMNModelWithAnalysis(matrix);

    expect(model.parallel).toEqual([]);
  });
  
});
