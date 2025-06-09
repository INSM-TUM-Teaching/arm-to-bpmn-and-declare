import { Dependency } from "../types/types";

const reverseMap: Record<string, string> = {
    "precedence": "response",
    "response": "precedence",
    "chain_precedence": "chain_response",
    "chain_response": "chain_precedence",
    "succession": "succession",
    "chain_succession": "chain_succession",
    "coexistence": "coexistence",
    "not-coexistence": "not-coexistence",
    "responded-existence": "responded-existence",
    "inclusive_or": "inclusive_or",
    "nand": "nand",
    "chain_responded-existence": "chain_responded-existence"
};

export function concatenate_dependencies(dep: Dependency): string {
    const [temporal, existential] = dep;
    return temporal + existential;
}

export function reverseDependency(dep: Dependency): Dependency {
    const [temporal, existential] = dep;

    const reversedTemporal = temporal.startsWith("<") ? temporal.replace("<", ">")
        : temporal.startsWith(">") ? temporal.replace(">", "<")
            : temporal;

    const reversedExistential = existential === "⇐" ? "⇒"
        : existential === "⇒" ? "⇐"
            : existential; // Keep ⇔ and ⇎ unchanged

    return [reversedTemporal, reversedExistential];
}

export function normalizeDependency(        // returns the valid key
    dep: Dependency,
    relationshipMap: Record<string, string>
): { key: string; reversed: boolean } {
    const key = concatenate_dependencies(dep);
    if (key in relationshipMap) {
        return { key, reversed: false };
    }

    const reversedKey = concatenate_dependencies(reverseDependency(dep));
    if (reversedKey in relationshipMap) {
        return { key: reversedKey, reversed: true };
    }

    return { key, reversed: false }; // fallback: return original key even if missing
}

export function isValidDependency(
    dep: Dependency,
    relationshipMap: Record<string, string>
): boolean {
    const key = concatenate_dependencies(dep);
    return key in relationshipMap;
}
