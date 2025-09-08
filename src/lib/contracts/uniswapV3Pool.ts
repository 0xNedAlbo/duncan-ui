/**
 * Uniswap V3 Pool Contract ABI and utilities
 * Used for fetching pool state and current prices
 */

export const UNISWAP_V3_POOL_ABI = [
  {
    "inputs": [],
    "name": "slot0",
    "outputs": [
      {"internalType": "uint160", "name": "sqrtPriceX96", "type": "uint160"},
      {"internalType": "int24", "name": "tick", "type": "int24"},
      {"internalType": "uint16", "name": "observationIndex", "type": "uint16"},
      {"internalType": "uint16", "name": "observationCardinality", "type": "uint16"},
      {"internalType": "uint16", "name": "observationCardinalityNext", "type": "uint16"},
      {"internalType": "uint8", "name": "feeProtocol", "type": "uint8"},
      {"internalType": "bool", "name": "unlocked", "type": "bool"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "liquidity",
    "outputs": [{"internalType": "uint128", "name": "", "type": "uint128"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "token0",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "token1", 
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "fee",
    "outputs": [{"internalType": "uint24", "name": "", "type": "uint24"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "tickSpacing",
    "outputs": [{"internalType": "int24", "name": "", "type": "int24"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

export interface PoolSlot0 {
  sqrtPriceX96: bigint;
  tick: number;
  observationIndex: number;
  observationCardinality: number;
  observationCardinalityNext: number;
  feeProtocol: number;
  unlocked: boolean;
}

export interface PoolState {
  sqrtPriceX96: bigint;
  tick: number;
  liquidity: bigint;
  token0: string;
  token1: string;
  fee: number;
  tickSpacing: number;
}

// sqrtPriceX96ToPrice function removed - now using shared implementation from utils/uniswap-v3/price.ts

/**
 * Determine which token should be token0 (lower address)
 */
export function sortTokens(tokenA: string, tokenB: string): [string, string] {
  const token0 = tokenA.toLowerCase() < tokenB.toLowerCase() ? tokenA : tokenB;
  const token1 = tokenA.toLowerCase() < tokenB.toLowerCase() ? tokenB : tokenA;
  return [token0, token1];
}