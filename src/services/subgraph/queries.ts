// GraphQL Queries für Uniswap V3 Subgraph

export const POOL_QUERY = `
  query GetPool($poolId: String!) {
    pool(id: $poolId) {
      id
      token0 {
        id
        symbol
        name
        decimals
      }
      token1 {
        id
        symbol
        name
        decimals
      }
      feeTier
      token0Price
      token1Price
      liquidity
      sqrtPrice
      tick
      volumeUSD
      tvlUSD
      feesUSD
    }
  }
`;

export const POOLS_QUERY = `
  query GetPools($poolIds: [String!]!) {
    pools(where: { id_in: $poolIds }) {
      id
      token0 {
        id
        symbol
        name
        decimals
      }
      token1 {
        id
        symbol
        name
        decimals
      }
      feeTier
      token0Price
      token1Price
      liquidity
      sqrtPrice
      tick
      totalValueLockedUSD
      poolDayData(first: 1, orderBy: date, orderDirection: desc) {
        date
        volumeUSD
        feesUSD
      }
    }
  }
`;

// Utility für Query Building
export function buildQuery(query: string, variables: Record<string, any>): {
  query: string;
  variables: Record<string, any>;
} {
  return {
    query,
    variables
  };
}