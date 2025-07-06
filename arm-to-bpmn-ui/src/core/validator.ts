import { DeclareModel, ARMMatrix } from '../types/types';

// Validation rules
const TEMPORAL_SET = ['<d', '>d', '<', '>', '-', 'x'];
const EXISTENTIAL_SET = ['⇒', '⇐', '⇔', '⇎', '∨', '¬∧', '-', 'x'];

// Constraints that make no logical sense and should be rejected
const ILLEGAL_COMBOS = new Set([
    '<d⇎', '>d⇎', '<⇎', '>⇎',
    '<d∨', '>d∨', '<∨', '>∨',
    '<d¬∧', '>d¬∧', '<¬∧', '>¬∧'
]);

// Validates that both temporal and existential parts of a relationship are acceptable.
function isValidDependency([temp, exist]: string[]): boolean {
    return TEMPORAL_SET.includes(temp) && EXISTENTIAL_SET.includes(exist);
}

export function validateARM(arm: ARMMatrix): boolean {
    const activities = Object.keys(arm);
    for (const i of activities) {
        for (const j of activities) {
            const [temp, exist] = arm[i][j];
            const relKey = temp + exist;
            const [revTemp, revExist] = arm[j][i];

            if (i === j) {
                if (temp !== 'x' || exist !== 'x') throw new Error(`Self-relationship on '${i}' must be ['x','x']`);
            }
            else {
                // Validate temporal and existential values
                if (isValidDependency([temp, exist])) {
                    if (ILLEGAL_COMBOS.has(relKey)) {
                        throw new Error(`Illogical combination at [${i}][${j}]: ${relKey}`);
                    }
                    if (temp === '⇔' && revTemp === '⇎') {
                        throw new Error(`Conflicting existential relations between [${i}][${j}] and [${j}][${i}]: ⇔ cannot coexist with ⇎`);
                    }
                    if (temp === '⇎' && revTemp === '⇔') {
                        throw new Error(`Conflicting existential relations between [${i}][${j}] and [${j}][${i}]: ⇎ cannot coexist with ⇔`);
                    }
                    if ((exist === '⇔' && revExist !== '⇔') || (exist === '⇎' && revExist !== '⇎')) {
                        throw new Error(`Existential relation conflict: [${i}][${j}] and [${j}][${i}] is not reciprocal`);
                    }
                    if (temp === '<' || temp === '<d') {
                        if (revTemp === '<' || revTemp === '<d') {
                            throw new Error(`Temporal order clash: both "[${i}][${j}] <(d) [${j}][${i}]" and "[${j}][${i}] <(d) [${i}][${j}]" present`);
                        }
                    }
                    if (temp === '>' || temp === '>d') {
                        if (revTemp === '>' || revTemp === '>d') {
                            throw new Error(`Temporal order clash: both "[${i}][${j}] >(d) [${j}][${i}]" and "[${j}][${i}] >(d) [${i}][${j}]" present`);
                        }
                    }
                }
                else if (!isValidDependency([temp, exist])) {
                    throw new Error(`Invalid dependency at [${i}][${j}]: ${temp}, ${exist}`);
                }
            }
        }
    }
    return true;
}