import {
  XORStrategy,
  ANDStrategy,
  ORStrategy,
  
} from './strategy';
import type { GatewayHandler } from './strategy';
/* 建立責任鏈：XOR → AND → OR → (末端 null) */
const xor = new XORStrategy();
xor.setNext(new ANDStrategy()).setNext(new ORStrategy());

export const gatewayChain: GatewayHandler = xor;
