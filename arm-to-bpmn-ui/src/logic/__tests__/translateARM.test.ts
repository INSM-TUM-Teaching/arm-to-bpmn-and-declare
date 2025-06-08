import { stableTopoSort } from '../translateARM';
import type { ARMMatrix } from '../translateARM';

describe('stableTopoSort', () => {
  it('should return a single layer for independent nodes', () => {
    const matrix: ARMMatrix = {
      A: {},
      B: {},
      C: {}
    };
    const result = stableTopoSort(matrix);
    expect(result).toEqual([['A', 'B', 'C']]);
  });

  it('should sort linear dependencies correctly', () => {
    const matrix: ARMMatrix = {
      A: { B: ['<', '⇒'] },
      B: { C: ['<', '⇒'] },
      C: {}
    };
    const result = stableTopoSort(matrix);
    expect(result).toEqual([['A'], ['B'], ['C']]);
  });

  it('should handle multiple independent chains', () => {
    const matrix: ARMMatrix = {
      A: { B: ['<', '⇔'] },
      B: {},
      C: { D: ['<', '⇔'] },
      D: {}
    };
    const result = stableTopoSort(matrix);
    expect(result).toEqual([['A', 'C'], ['B', 'D']]);
  });

  it('should skip non-strict temporal relations like "-" and "x"', () => {
    const matrix: ARMMatrix = {
      A: { B: ['-', '⇔'] },
      B: {}
    };
    const result = stableTopoSort(matrix);
    // "-" is not a dependency relation in topo sort, so both are independent
    expect(result).toEqual([['A', 'B']]);
  });

  it('should handle complex dependencies with mixed relations', () => {
    const matrix: ARMMatrix = {
      A: { B: ['<', '⇔'], C: ['<', '⇔'] },
      B: { D: ['<d', '⇔'] },
      C: { D: ['<', '⇔'] },
      D: {}
    };
    const result = stableTopoSort(matrix);
    expect(result).toEqual([['A'], ['B', 'C'], ['D']]);
  });

  it('should return empty array for empty matrix', () => {
    const matrix: ARMMatrix = {};
    const result = stableTopoSort(matrix);
    expect(result).toEqual([]);
  });
});
