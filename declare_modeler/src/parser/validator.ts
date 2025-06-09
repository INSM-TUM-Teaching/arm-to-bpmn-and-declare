import { Dependency } from "../types/types";
import { concatenate_dependencies } from "./normalizer";

export function isValidDependency(
    dep: Dependency,
    relationshipMap: Record<string, string>
): boolean {
    const key = concatenate_dependencies(dep);
    return key in relationshipMap;
}