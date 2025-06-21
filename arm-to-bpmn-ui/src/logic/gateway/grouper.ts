import type {
  GatewayGroupingResult,
  GatewayGroup,
  RelationMaps
} from '../relations';
import { gatewayChain } from './registry';

/* 給外部 (buildBPMN) 使用的 API */
export function groupTargetsByGateway(
  targets: string[],
  relMaps: RelationMaps
): GatewayGroupingResult {
  const gType = gatewayChain.handle(targets, relMaps);

  if (gType) {
    const grp: GatewayGroup = { type: gType, targets };
    return { groups: [grp], fallback: [] };
  }
  return { groups: [], fallback: targets };
}
