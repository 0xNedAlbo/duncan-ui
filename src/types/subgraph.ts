// Legacy compatibility - Re-export from new standardized files
// This file maintains backward compatibility while transitioning to the new schema

// Re-export generated types from new graphql codegen
export type {
  GetPositionQuery,
  GetPositionsByOwnerQuery,
  GetPoolQuery,
  GetFactoryQuery,
  GetTokenQuery
} from '@/graphql/types.generated';

// Re-export custom types  
export type {
  InitialValueData,
  SubgraphError,
  SubgraphToken,
  SubgraphPool,
  SubgraphTransaction,
  SubgraphPosition
} from './subgraph.custom';