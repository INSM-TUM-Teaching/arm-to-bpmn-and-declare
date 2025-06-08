import { stableTopoSort } from '../translateARM';
import type { ARMMatrix } from '../translateARM';

//It is tested that the function works correctly in the base and edge cases, that only < and <d relationships are taken into account, and that correct parallel layers are created.

describe('stableTopoSort', () => {
  it('should return a single layer for independent nodes', () => {
    const matrix: ARMMatrix = {
       "a": {
         "a": ['x', 'x'], 
         "b": ['-', '⇎'], 
         "c": ['-', '⇎'] 
       },
       "b": { 
         "a": ['-', '⇎'], 
         "b": ['x', 'x'], 
         "c": ['-', '⇎'] 
       },
       "c": { 
         "a": ['-', '⇎'], 
         "b": ['-', '⇎'], 
         "c": ['x', 'x'] 
       }
    };
    const result = stableTopoSort(matrix);
    expect(result).toEqual([['a', 'b', 'c']]); //nodes placed in the same internal array are independent of each other and can operate simultaneously 
  });

  it('should sort linear dependencies correctly', () => {
    const matrix: ARMMatrix = {
       "a": {
         "a": ['x', 'x'], 
         "b": ['<', '⇒'], 
         "c": ['<', '⇒'] 
      },
       "b": { 
         "a": ['>', '⇒'], 
         "b": ['x', 'x'], 
         "c": ['<', '⇒'] 
      },
       "c": { 
         "a": ['>', '⇒'], 
         "b": ['x', 'x'], 
         "c": ['x', 'x'] 
      }
    };
    const result = stableTopoSort(matrix);
    expect(result).toEqual([['a'], ['b'], ['c']]); //sequentially dependent nodes, so none of them can operate at the same time as the others. Therefore, each of them is located in a separate layer.
  });

  it('should handle multiple independent chains', () => {
    const matrix: ARMMatrix = {
      "a": {
        "a": ['x', 'x'],
        "b": ['<', '⇔'],  
        "c": ['<', '⇒'],
        "d": ['<', '⇔']   
      },
      "b": {
        "a": ['>', '⇔'],  
        "b": ['x', 'x'],
        "c": ['<', '⇔'],
        "d": ['<', '⇒']     
      },
      "c": {
        "a": ['>', '⇒'],  
        "b": ['>', '⇔'],  
        "c": ['x', 'x'],
        "d": ['<', '⇔']  
      },
      "d": {
        "a": ['>', '⇔'],  
        "b": ['>', '⇒'],  
        "c": ['>', '⇔'],
        "d": ['x', 'x']  
      }
    };
    const result = stableTopoSort(matrix);
    expect(result).toEqual([['a', 'c'], ['b', 'd']]);
  });

  it('should skip non-strict temporal relations like "-"', () => {
    const matrix: ARMMatrix = {
      "a": {
         "a": ['x', 'x'], 
         "b": ['-', '⇎']
      },
       "b": { 
         "a": ['-', '⇎'], 
         "b": ['x', 'x']
      },
    };
    const result = stableTopoSort(matrix);
    expect(result).toEqual([['a', 'b']]); // guarantees that it only considers true ordering relations such as < and <d. Verifies that it can ignore weak or ambiguous relations.
  });

  it('should handle complex dependencies with mixed relations', () => {
    const matrix: ARMMatrix = {
        "a": {
          "a": ["x", "x"],
          "b": ["<d", "⇐"],
          "c": ["<", "⇐"],
          "d": ["<", "⇔"],
          "e": ["<d", "⇐"]
        },
        "b": {
          "a": [">d", "⇒"],
          "b": ["x", "x"],
          "c": ["<d", "⇔"],
          "d": ["<", "⇒"],
          "e": ["-", "⇎"]
        },
        "c": {
          "a": [">", "⇒"],
          "b": [">d", "⇔"],
          "c": ["x", "x"],
          "d": ["<d", "⇒"],
          "e": ["-", "⇎"]
        },
        "d": {
          "a": [">", "⇔"],
          "b": [">", "⇐"],
          "c": [">d", "⇐"],
          "d": ["x", "x"],
          "e": ["<d", "⇐"]
        },
        "e": {
          "a": [">d", "⇒"],
          "b": ["-", "⇎"],
          "c": ["-", "⇎"],
          "d": [">d", "⇒"],
          "e": ["x", "x"]
        }
    };
    const result = stableTopoSort(matrix);
    expect(result).toEqual([['a'], ['b', 'c'], ['d'], ['e'] ]);//It tests complex multiple dependencies, relationship types (< and <d), and operations that can be executed in parallel.
  });

  it('should return empty array for empty matrix', () => {
    const matrix: ARMMatrix = {};
    const result = stableTopoSort(matrix);
    expect(result).toEqual([]);
  });
});
