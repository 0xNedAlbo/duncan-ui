// Legacy compatibility - Re-export from new standardized files
// This file maintains backward compatibility while transitioning to the new schema

// Re-export generated types
export type {
  Position,
  Pool,
  Token,
  Transaction,
  SubgraphResponse,
  PositionQueryData,
  PositionsQueryData
} from './subgraph.generated';

// Re-export custom types  
export type {
  InitialValueData,
  SubgraphError,
  SubgraphToken,
  SubgraphPool,
  SubgraphTransaction,
  SubgraphPosition
} from './subgraph.custom';