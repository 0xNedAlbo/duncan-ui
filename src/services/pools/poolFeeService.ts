import { getSubgraphService } from '@/services/subgraph';
import { normalizeAddress } from '@/lib/utils/evm';

export interface PoolFeeData {
  poolAddress: string;
  chain: string;
  feeTier: string;
  poolLiquidity: string; // BigInt as string
  sqrtPriceX96: string; // BigInt as string - current pool price as sqrt(price) * 2^96
  token0: {
    address: string;
    symbol: string;
    decimals: number;
    dailyVolume: string; // BigInt as string (token units)
    price: string; // BigInt as string (token0 price in token1 units)
  };
  token1: {
    address: string;
    symbol: string;
    decimals: number;
    dailyVolume: string; // BigInt as string (token units)
    price: string; // BigInt as string (token1 price in token0 units)
  };
  calculatedAt: string; // ISO timestamp
}

interface SubgraphPoolResponse {
  pools: Array<{
    id: string;
    feeTier: string;
    sqrtPrice: string; // Current pool sqrt price
    token0: {
      id: string;
      symbol: string;
      decimals: string;
    };
    token1: {
      id: string;
      symbol: string;
      decimals: string;
    };
    poolDayData: Array<{
      date: number;
      liquidity: string;
      volumeToken0: string; // Decimal string from subgraph
      volumeToken1: string; // Decimal string from subgraph
      token0Price: string; // Decimal string from subgraph (token0 price in token1 units)
      token1Price: string; // Decimal string from subgraph (token1 price in token0 units)
    }>;
  }>;
}

/**
 * Convert decimal string to BigInt with token decimals
 * @param decimalValue Decimal string from subgraph (e.g., "123.456789")
 * @param decimals Token decimals (e.g., 18 for WETH, 6 for USDC)
 * @returns BigInt string in token units
 */
function decimalToBigInt(decimalValue: string, decimals: number): string {
  if (!decimalValue || decimalValue === "0") {
    return "0";
  }

  // Parse the decimal value
  const [integerPart, fractionalPart = ""] = decimalValue.split(".");

  // Pad or truncate fractional part to match token decimals
  const paddedFractional = fractionalPart.padEnd(decimals, "0").slice(0, decimals);

  // Combine and convert to BigInt
  const fullValue = integerPart + paddedFractional;
  const result = BigInt(fullValue || "0");

  return result.toString();
}

/**
 * Get pool fee data from The Graph subgraph
 * @param chain Chain name (e.g., "ethereum", "arbitrum")
 * @param poolAddress Pool contract address (must be lowercase)
 * @returns Pool fee data for APR calculation
 */
export async function getPoolFeeData(
  chain: string,
  poolAddress: string
): Promise<PoolFeeData> {
  const subgraphService = getSubgraphService();

  // Normalize pool address to lowercase for subgraph query
  const normalizedPoolAddress = normalizeAddress(poolAddress).toLowerCase();

  const query = `
    query GetPoolFeeData($poolId: ID!) {
      pools(where: {id: $poolId}) {
        id
        feeTier
        sqrtPrice
        token0 {
          id
          symbol
          decimals
        }
        token1 {
          id
          symbol
          decimals
        }
        poolDayData(orderBy: date, orderDirection: desc, first: 1) {
          date
          liquidity
          volumeToken0
          volumeToken1
          token0Price
          token1Price
        }
      }
    }
  `;

  const variables = {
    poolId: normalizedPoolAddress,
  };

  const response = await subgraphService.query<SubgraphPoolResponse>(
    chain,
    query,
    variables
  );

  if (!response.data?.pools || response.data.pools.length === 0) {
    throw new Error(`Pool not found: ${poolAddress} on ${chain}`);
  }

  const pool = response.data.pools[0];

  if (!pool.poolDayData || pool.poolDayData.length === 0) {
    throw new Error(`No recent pool data available for: ${poolAddress} on ${chain}`);
  }

  const dayData = pool.poolDayData[0];

  // Convert decimals from string to number
  const token0Decimals = parseInt(pool.token0.decimals);
  const token1Decimals = parseInt(pool.token1.decimals);

  // Convert all decimal values to BigInt strings
  // Note: poolDayData.liquidity is already an integer, no decimal conversion needed
  const poolLiquidity = dayData.liquidity;
  const token0Volume = decimalToBigInt(dayData.volumeToken0, token0Decimals);
  const token1Volume = decimalToBigInt(dayData.volumeToken1, token1Decimals);

  // Fix: Swap the subgraph fields and use correct decimal scaling
  // dayData.token1Price = "4021..." should be the WETH price (~4016), scale with token1 (USDC) decimals
  // dayData.token0Price = "248" should be the USDC price (~0.000249), scale with token0 (WETH) decimals
  const token0PriceInToken1 = decimalToBigInt(dayData.token1Price, token1Decimals); // WETH price in USDC units
  const token1PriceInToken0 = decimalToBigInt(dayData.token0Price, token0Decimals); // USDC price in WETH units

  return {
    poolAddress: normalizeAddress(poolAddress),
    chain,
    feeTier: pool.feeTier,
    poolLiquidity,
    sqrtPriceX96: pool.sqrtPrice, // Current sqrt price from pool
    token0: {
      address: normalizeAddress(pool.token0.id),
      symbol: pool.token0.symbol,
      decimals: token0Decimals,
      dailyVolume: token0Volume,
      price: token0PriceInToken1, // token0 price in token1 units
    },
    token1: {
      address: normalizeAddress(pool.token1.id),
      symbol: pool.token1.symbol,
      decimals: token1Decimals,
      dailyVolume: token1Volume,
      price: token1PriceInToken0, // token1 price in token0 units
    },
    calculatedAt: new Date().toISOString(),
  };
}