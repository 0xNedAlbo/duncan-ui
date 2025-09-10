// Custom domain-specific types for Duncan's Subgraph integration
// These are not generated and contain our business logic types

import type { Position, Transaction, Pool, Token } from './subgraph.generated';

// Legacy compatibility types (maintain existing API)
export interface SubgraphToken {
  id: string;
  symbol: string;
  name: string;
  decimals: number;
}

export interface SubgraphPool {
  id: string;
  token0: SubgraphToken;
  token1: SubgraphToken;
  feeTier: number;
  token0Price: string;
  token1Price: string;
  liquidity: string;
  sqrtPrice: string;
  tick: number;
}

export interface SubgraphTransaction {
  id: string;
  timestamp: string;
  blockNumber: string;
  gasUsed: string;
  gasPrice: string;
}

export interface SubgraphPosition {
  id: string;
  liquidity: string;
  depositedToken0: string;
  depositedToken1: string;
  withdrawnToken0: string;
  withdrawnToken1: string;
  collectedFeesToken0: string;
  collectedFeesToken1: string;
  transaction: SubgraphTransaction;
  pool: SubgraphPool;
}

// Parsed Initial Value Data (Duncan's internal format)
export interface InitialValueData {
  value: string;           // Gesamtwert in Quote Asset
  token0Amount: string;    // Menge Token0
  token1Amount: string;    // Menge Token1
  timestamp: Date;         // Erstellungszeitpunkt
  source: 'subgraph' | 'snapshot';
  confidence: 'exact' | 'estimated';
  transactionHash?: string;
  blockNumber?: number;
}

// Error Types
export interface SubgraphError {
  code: 'NETWORK_ERROR' | 'QUERY_ERROR' | 'NOT_FOUND' | 'RATE_LIMIT' | 'TIMEOUT';
  message: string;
  chain: string;
  query?: string;
  variables?: Record<string, any>;
}

// Type conversion utilities
export function convertToLegacyPosition(position: Position): SubgraphPosition {
  return {
    id: position.id,
    liquidity: position.liquidity,
    depositedToken0: position.depositedToken0,
    depositedToken1: position.depositedToken1,
    withdrawnToken0: position.withdrawnToken0,
    withdrawnToken1: position.withdrawnToken1,
    collectedFeesToken0: position.collectedFeesToken0,
    collectedFeesToken1: position.collectedFeesToken1,
    transaction: {
      id: position.transaction.id,
      timestamp: position.transaction.timestamp,
      blockNumber: position.transaction.blockNumber,
      gasUsed: position.transaction.gasUsed,
      gasPrice: position.transaction.gasPrice,
    },
    pool: {
      id: position.pool.id,
      token0: {
        id: position.pool.token0.id,
        symbol: position.pool.token0.symbol,
        name: position.pool.token0.name,
        decimals: parseInt(position.pool.token0.decimals),
      },
      token1: {
        id: position.pool.token1.id,
        symbol: position.pool.token1.symbol,
        name: position.pool.token1.name,
        decimals: parseInt(position.pool.token1.decimals),
      },
      feeTier: parseInt(position.pool.feeTier),
      token0Price: position.pool.token0Price,
      token1Price: position.pool.token1Price,
      liquidity: position.pool.liquidity,
      sqrtPrice: position.pool.sqrtPrice,
      tick: position.pool.tick ? parseInt(position.pool.tick) : 0,
    }
  };
}