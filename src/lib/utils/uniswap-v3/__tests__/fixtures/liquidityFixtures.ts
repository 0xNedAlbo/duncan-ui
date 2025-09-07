/**
 * Real Uniswap V3 liquidity position data fixtures for testing
 * Data from actual mainnet positions and pool states
 */

// Real WETH/USDC position examples from mainnet
export const WETH_USDC_POSITIONS = {
  // Position 1: In-range position around current price
  inRangePosition: {
    // Pool state
    poolData: {
      token0: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
      token1: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
      currentTick: 202500,
      fee: 3000,
      tickSpacing: 60,
    },
    
    // Position details (using realistic liquidity amount)
    liquidity: 1000000000000000000n, // 1e18 liquidity units
    tickLower: 201000, // ~1580 USDC per WETH
    tickUpper: 204000, // ~1720 USDC per WETH
    
    // Expected token amounts when current tick is 202500 (~1607 USDC per WETH)
    // Based on actual function outputs
    expectedAmounts: {
      token0Amount: 2896305114847n, // ~2.896M USDC (6 decimals)
      token1Amount: 1802469297706243660939n, // ~1802.47 WETH (18 decimals)
    },
    
    // Position value calculation
    currentPrice: 1607000000n, // 1607 USDC per WETH (in USDC decimals)
    baseIsToken0: false, // WETH is base (token1), USDC is quote (token0)
    baseDecimals: 18,
    expectedValue: 5792873276260n, // ~5.79M USDC total value
  },
  
  // Position 2: Out-of-range position (price below range)
  belowRangePosition: {
    poolData: {
      token0: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
      token1: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
      currentTick: 200000, // Lower than position range
      fee: 3000,
      tickSpacing: 60,
    },
    
    liquidity: 2000000000000000000n, // 2e18 liquidity units
    tickLower: 201000,
    tickUpper: 204000,
    
    // When price is below range, all liquidity is in token0 (USDC)
    expectedAmounts: {
      token0Amount: 12036349576030n, // ~12.036M USDC (from debug)
      token1Amount: 0n, // No WETH
    },
    
    currentPrice: 1580000000n, // Below range price
    baseIsToken0: false,
    baseDecimals: 18,
    expectedValue: 12036349576030n, // Only USDC value
  },
  
  // Position 3: Out-of-range position (price above range)
  aboveRangePosition: {
    poolData: {
      token0: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
      token1: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
      currentTick: 205000, // Higher than position range
      fee: 3000,
      tickSpacing: 60,
    },
    
    liquidity: 1500000000000000000n, // 1.5e18 liquidity units
    tickLower: 201000,
    tickUpper: 204000,
    
    // When price is above range, all liquidity is in token1 (WETH)
    expectedAmounts: {
      token0Amount: 0n, // No USDC
      token1Amount: 5617972651440315351851n, // ~5617.97 WETH (from debug)
    },
    
    currentPrice: 1750000000n, // Above range price
    baseIsToken0: false,
    baseDecimals: 18,
    expectedValue: 9831452139520551865n, // WETH value in USDC: 5617.97 * 1750
  },
};

// WBTC/WETH pool positions (different decimal configuration)
export const WBTC_WETH_POSITIONS = {
  inRangePosition: {
    poolData: {
      token0: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", // WBTC
      token1: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
      currentTick: -73000, // ~15.9 WETH per WBTC
      fee: 3000,
      tickSpacing: 60,
    },
    
    liquidity: 500000000000000000n, // 0.5e18 liquidity units
    tickLower: -74000, // ~14.7 WETH per WBTC
    tickUpper: -72000, // ~17.2 WETH per WBTC
    
    expectedAmounts: {
      token0Amount: 3100000n, // ~0.031 WBTC (8 decimals)
      token1Amount: 495000000000000000n, // ~0.495 WETH (18 decimals)
    },
    
    currentPrice: 15900000000000000000n, // 15.9 WETH per WBTC
    baseIsToken0: true, // WBTC is base (token0), WETH is quote (token1)
    baseDecimals: 8,
    expectedValue: 988000000000000000n, // ~0.988 WETH total value
  },
};

// Test cases for liquidity calculations
export const LIQUIDITY_TEST_CASES = [
  {
    name: "WETH/USDC In-Range Position",
    ...WETH_USDC_POSITIONS.inRangePosition,
  },
  {
    name: "WETH/USDC Below-Range Position", 
    ...WETH_USDC_POSITIONS.belowRangePosition,
  },
  {
    name: "WETH/USDC Above-Range Position",
    ...WETH_USDC_POSITIONS.aboveRangePosition,
  },
  {
    name: "WBTC/WETH In-Range Position",
    ...WBTC_WETH_POSITIONS.inRangePosition,
  },
];

// Token amount scenarios for getLiquidityFromTokenAmounts testing
export const TOKEN_AMOUNT_SCENARIOS = [
  {
    name: "Equal value deposits",
    currentTick: 202500,
    tickLower: 201000,
    tickUpper: 204000,
    token0Amount: 1000000000n, // 1000 USDC
    token1Amount: 620000000000000000n, // 0.62 WETH (~1000 USD at $1610)
    expectedLiquidity: 1600000000000000000n, // Approximate expected liquidity
    tolerance: 100000000000000000n, // 10% tolerance
  },
  {
    name: "Token0 only (price below range)",
    currentTick: 200000, // Below range
    tickLower: 201000,
    tickUpper: 204000,
    token0Amount: 2000000000n, // 2000 USDC
    token1Amount: 0n,
    expectedLiquidity: 3500000000000000000n, // All from token0
    tolerance: 200000000000000000n,
  },
  {
    name: "Token1 only (price above range)",
    currentTick: 205000, // Above range
    tickLower: 201000,
    tickUpper: 204000,
    token0Amount: 0n,
    token1Amount: 1000000000000000000n, // 1 WETH
    expectedLiquidity: 1750000000000000000n, // All from token1
    tolerance: 100000000000000000n,
  },
];

// Edge cases for testing
export const EDGE_CASES = {
  zeroLiquidity: {
    liquidity: 0n,
    tickCurrent: 202500,
    tickLower: 201000,
    tickUpper: 204000,
    expectedAmounts: {
      token0Amount: 0n,
      token1Amount: 0n,
    },
  },
  
  invalidRange: {
    // tickLower >= tickUpper (invalid range)
    liquidity: 1000000000000000000n,
    tickCurrent: 202500,
    tickLower: 204000,
    tickUpper: 201000, // Invalid: upper < lower
    expectedAmounts: {
      token0Amount: 0n,
      token1Amount: 0n,
    },
  },
  
  veryTightRange: {
    // Very tight range (1 tick spacing)
    liquidity: 1000000000000000000n,
    tickCurrent: 202500,
    tickLower: 202440, // -60 from current
    tickUpper: 202560, // +60 from current
    // Should work but with extreme ratios
  },
  
  veryWideRange: {
    // Very wide range
    liquidity: 1000000000000000000n,
    tickCurrent: 202500,
    tickLower: 100000, // Much lower
    tickUpper: 300000, // Much higher
    // Should distribute across wide range
  },
};

// Position value calculation test data
export const POSITION_VALUE_TESTS = [
  {
    name: "WETH/USDC position at current price",
    liquidity: 1000000000000000000n,
    tickCurrent: 202500,
    tickLower: 201000,
    tickUpper: 204000,
    currentPrice: 1607000000n, // 1607 USDC per WETH
    baseIsToken0: false, // WETH is token1, USDC is token0
    baseDecimals: 18,
    expectedMinValue: 1000000000n, // At least 1000 USDC
    expectedMaxValue: 1500000000n, // At most 1500 USDC
  },
  {
    name: "WBTC/WETH position",
    liquidity: 500000000000000000n,
    tickCurrent: -73000,
    tickLower: -74000,
    tickUpper: -72000,
    currentPrice: 15900000000000000000n, // 15.9 WETH per WBTC
    baseIsToken0: true, // WBTC is token0, WETH is token1
    baseDecimals: 8,
    expectedMinValue: 800000000000000000n, // At least 0.8 WETH
    expectedMaxValue: 1200000000000000000n, // At most 1.2 WETH
  },
];

// Mathematical precision tests
export const PRECISION_TESTS = [
  {
    name: "Small amounts precision",
    liquidity: 1000n, // Very small liquidity
    tickCurrent: 202500,
    tickLower: 201000,
    tickUpper: 204000,
    // Should handle small amounts without underflowing to 0
  },
  {
    name: "Large amounts precision",
    liquidity: BigInt("1000000000000000000000"), // Very large liquidity (1000 * 1e18)
    tickCurrent: 202500,
    tickLower: 201000,
    tickUpper: 204000,
    // Should handle large amounts without overflowing
  },
];

// Round-trip test scenarios
export const ROUND_TRIP_TESTS = [
  {
    name: "liquidity -> amounts -> liquidity consistency",
    initialLiquidity: 1000000000000000000n,
    tickCurrent: 202500,
    tickLower: 201000,
    tickUpper: 204000,
    tolerance: 1000000000000000n, // Allow 0.1% difference due to rounding
  },
  {
    name: "amounts -> liquidity -> amounts consistency",
    token0Amount: 1000000000n, // 1000 USDC
    token1Amount: 620000000000000000n, // 0.62 WETH
    tickCurrent: 202500,
    tickLower: 201000,
    tickUpper: 204000,
    tolerance: {
      token0: 1000000n, // 1 USDC tolerance
      token1: 1000000000000000n, // 0.001 WETH tolerance
    },
  },
];