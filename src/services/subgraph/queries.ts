// GraphQL Queries für Uniswap V3 Subgraph

export const POSITION_QUERY = `
  query GetPosition($tokenId: String!) {
    position(id: $tokenId) {
      id
      liquidity
      depositedToken0
      depositedToken1
      withdrawnToken0
      withdrawnToken1
      collectedFeesToken0
      collectedFeesToken1
      transaction {
        id
        timestamp
        blockNumber
        gasUsed
        gasPrice
      }
      pool {
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
      }
    }
  }
`;

export const POSITIONS_BY_OWNER_QUERY = `
  query GetPositionsByOwner($owner: String!, $first: Int!, $skip: Int!) {
    positions(
      where: { owner: $owner }
      first: $first
      skip: $skip
      orderBy: transaction__timestamp
      orderDirection: desc
    ) {
      id
      liquidity
      depositedToken0
      depositedToken1
      withdrawnToken0
      withdrawnToken1
      collectedFeesToken0
      collectedFeesToken1
      transaction {
        id
        timestamp
        blockNumber
      }
      pool {
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
      }
    }
  }
`;

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