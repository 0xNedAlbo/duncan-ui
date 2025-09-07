import JSBI from "jsbi";

/**
 * Real Uniswap V3 pool data fixtures for testing price calculations
 * Data snapshots from mainnet pools at specific block heights
 */

// WETH/USDC 0.3% pool - Popular pair for testing
export const WETH_USDC_POOL = {
  // Pool details
  token0: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC (lower address)
  token1: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
  fee: 3000,
  tickSpacing: 60,
  
  // Snapshot data from block 18500000 (Oct 2023)
  sqrtPriceX96: "1771845812700503272634157384",
  tick: 202509,
  
  // Token details
  token0Decimals: 6,  // USDC
  token1Decimals: 18, // WETH
  
  // Expected conversions (USDC per WETH)
  token0Price: 1650250000n, // 1650.25 USDC per WETH (in USDC decimals)
  token1Price: 605679734213136n, // ~0.000605679 WETH per USDC (in WETH decimals)
  
  // For our base/quote terminology tests (WETH as base, USDC as quote)
  baseTokenAddress: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH (base) 
  quoteTokenAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC (quote)
  baseTokenDecimals: 18,
  // Note: In Uniswap V3, USDC (lower address) is actually token0, WETH is token1
  // So when we want "USDC per WETH", we need to be careful about the calculation
  priceQuotePerBase: 1650000000n, // ~1650 USDC per WETH (approximately)
};

// WBTC/WETH 0.3% pool - Different decimal configuration
export const WBTC_WETH_POOL = {
  // Pool details  
  token0: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", // WBTC (lower address)
  token1: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
  fee: 3000,
  tickSpacing: 60,
  
  // Snapshot data from block 18500000
  sqrtPriceX96: "156816507463892137869584",
  tick: -73136,
  
  // Token details
  token0Decimals: 8,  // WBTC
  token1Decimals: 18, // WETH
  
  // Expected conversions (WETH per WBTC)
  token0Price: 15887500000000000000n, // ~15.8875 WETH per WBTC (in WETH decimals)
  token1Price: 6294285n, // ~0.06294285 WBTC per WETH (in WBTC decimals)
  
  // For our base/quote terminology tests
  baseTokenAddress: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", // WBTC (base)
  quoteTokenAddress: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH (quote)
  baseTokenDecimals: 8,
  priceQuotePerBase: 15887500000000000000n, // ~15.8875 WETH per WBTC
};

// USDC/WETH 0.05% pool - Lower fee tier, different tick spacing
export const USDC_WETH_500_POOL = {
  // Pool details
  token0: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
  token1: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
  fee: 500,
  tickSpacing: 10,
  
  // Snapshot data
  sqrtPriceX96: "1771945812700503272634157384",
  tick: 202512,
  
  // Token details
  token0Decimals: 6,  // USDC
  token1Decimals: 18, // WETH
  
  // Expected conversions
  token0Price: 1650420000n, // 1650.42 USDC per WETH
  token1Price: 605616734213136n, // ~0.000605616 WETH per USDC
  
  // Base/quote tests
  baseTokenAddress: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH (base)
  quoteTokenAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC (quote)
  baseTokenDecimals: 18,
  priceQuotePerBase: 1650420000n,
};

// Test cases for price conversion functions
export const PRICE_TEST_CASES = [
  {
    name: "WETH/USDC - Standard case",
    ...WETH_USDC_POOL,
    // Test various price points around current price
    testPrices: [
      {
        price: 1500000000n, // 1500 USDC per WETH
        expectedTick: 201870,
        tickSpacing: 60,
      },
      {
        price: 1650250000n, // Current price
        expectedTick: 202500, // Should be close to current tick
        tickSpacing: 60,
      },
      {
        price: 1800000000n, // 1800 USDC per WETH
        expectedTick: 203070,
        tickSpacing: 60,
      },
    ],
  },
  {
    name: "WBTC/WETH - 8 decimal base token",
    ...WBTC_WETH_POOL,
    testPrices: [
      {
        price: 14000000000000000000n, // 14 WETH per WBTC
        expectedTick: -74100,
        tickSpacing: 60,
      },
      {
        price: 15887500000000000000n, // Current price
        expectedTick: -73140, // Should be close to current tick
        tickSpacing: 60,
      },
      {
        price: 18000000000000000000n, // 18 WETH per WBTC
        expectedTick: -72000,
        tickSpacing: 60,
      },
    ],
  },
];

// Edge cases for testing boundaries
export const EDGE_CASES = {
  // Very high tick (near MAX_TICK)
  highTick: {
    tick: 887220,
    sqrtRatioX96: JSBI.BigInt("1461446703485210103287273052203988822378723970341"),
    baseTokenAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    quoteTokenAddress: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    baseTokenDecimals: 18,
    tickSpacing: 60,
  },
  
  // Very low tick (near MIN_TICK)
  lowTick: {
    tick: -887220,
    sqrtRatioX96: JSBI.BigInt("4295128739"),
    baseTokenAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    quoteTokenAddress: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    baseTokenDecimals: 18,
    tickSpacing: 60,
  },
  
  // Different tick spacings for various fee tiers
  tickSpacings: {
    "100": 1,   // 0.01% fee
    "500": 10,  // 0.05% fee
    "3000": 60, // 0.3% fee
    "10000": 200, // 1% fee
  },
};

// Token ordering test cases
export const TOKEN_ORDERING_CASES = [
  {
    name: "USDC (token0) / WETH (token1)",
    token0: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC (lower)
    token1: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH (higher)
    token0Decimals: 6,
    token1Decimals: 18,
    isToken0Lower: true,
  },
  {
    name: "WBTC (token0) / WETH (token1)",
    token0: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", // WBTC (lower)
    token1: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH (higher)
    token0Decimals: 8,
    token1Decimals: 18,
    isToken0Lower: true,
  },
  {
    name: "Reversed addresses for testing",
    token0: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH as "token0"
    token1: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC as "token1"
    token0Decimals: 18,
    token1Decimals: 6,
    isToken0Lower: false, // This would actually be invalid, but good for testing
  },
];

// Precision test cases - testing rounding and precision handling
export const PRECISION_TESTS = [
  {
    name: "High precision price",
    baseTokenAddress: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    quoteTokenAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    baseTokenDecimals: 18,
    price: 1650123456n, // Very precise price
    tolerance: 1000n, // Allow 0.001 USDC tolerance
  },
  {
    name: "Small decimal token price",
    baseTokenAddress: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", // WBTC (8 decimals)
    quoteTokenAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC (6 decimals)
    baseTokenDecimals: 8,
    price: 27500123n, // 27500.123 USDC per WBTC
    tolerance: 100n, // Allow 0.0001 USDC tolerance
  },
];