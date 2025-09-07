// TypeScript Types für Uniswap V3 Subgraph Responses

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

export interface SubgraphResponse<T> {
  data?: T;
  errors?: Array<{
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: string[];
  }>;
}

export interface PositionQueryData {
  position: SubgraphPosition | null;
}

export interface PositionsQueryData {
  positions: SubgraphPosition[];
}

// Parsed Initial Value Data (unser internes Format)
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