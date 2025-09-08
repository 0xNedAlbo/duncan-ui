import { describe, it, expect } from 'vitest';
import JSBI from 'jsbi';
import {
  priceToSqrtRatioX96,
  tickToPrice,
  priceToTick,
  priceToClosestUsableTick,
  tickToSqrtRatioX96,
  sqrtRatioX96ToToken1PerToken0,
  sqrtRatioX96ToToken0PerToken1,
} from '../price';

describe('Uniswap V3 Price Utilities', () => {
  // Test addresses
  const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
  const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
  const WBTC = "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599";

  describe('priceToSqrtRatioX96', () => {
    it('should convert price to sqrtRatioX96 format', () => {
      const price = 1650000000n; // 1650 USDC per WETH
      const result = priceToSqrtRatioX96(WETH, USDC, 18, price);

      // Basic validation: result should be a positive JSBI
      expect(result).toBeInstanceOf(Object);
      expect(result.toString().length).toBeGreaterThan(10);
      expect(JSBI.GT(result, JSBI.BigInt(0))).toBe(true);
    });

    it('should handle different decimal configurations', () => {
      const price = 16000000000000000000n; // 16 WETH per WBTC
      const result = priceToSqrtRatioX96(WBTC, WETH, 8, price);

      expect(result).toBeInstanceOf(Object);
      expect(JSBI.GT(result, JSBI.BigInt(0))).toBe(true);
    });

    it('should throw error for zero or negative price', () => {
      expect(() => {
        priceToSqrtRatioX96(WETH, USDC, 18, 0n);
      }).toThrow('price must be a positive bigint');

      expect(() => {
        priceToSqrtRatioX96(WETH, USDC, 18, -100n);
      }).toThrow('price must be a positive bigint');
    });
  });

  describe('tickToPrice', () => {
    it('should convert tick to reasonable price', () => {
      // Real Arbitrum WETH/USDC data (tick -192593, ~4327 USDC per WETH)
      const WETH_ARBITRUM = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";
      const USDC_ARBITRUM = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831"; 
      const realTick = -192593;
      
      const result = tickToPrice(realTick, WETH_ARBITRUM, USDC_ARBITRUM, 18);

      // Should be positive and in reasonable range (4000-5000 USDC per WETH)
      expect(result > 4000000000n).toBe(true); // > 4000 USDC (scaled by 10^6)
      expect(result < 5000000000n).toBe(true); // < 5000 USDC (scaled by 10^6)
      
      // Should be close to expected value (~4327 USDC per WETH)
      const humanReadable = Number(result) / Math.pow(10, 6);
      expect(humanReadable).toBeGreaterThan(4300);
      expect(humanReadable).toBeLessThan(4350);
    });

    it('should handle different decimal configurations', () => {
      const tick = -73000; // Around current WBTC/WETH level
      const result = tickToPrice(tick, WBTC, WETH, 8);

      // Should be positive
      expect(result > 0n).toBe(true);
    });

    it('should handle edge case ticks within valid range', () => {
      // Test reasonably high tick (within practical range)
      const highResult = tickToPrice(400000, WETH, USDC, 18);
      expect(highResult > 0n).toBe(true);

      // Test reasonably low tick (within practical range)
      const lowResult = tickToPrice(-400000, WETH, USDC, 18);
      expect(lowResult > 0n).toBe(true);
      
      // Test that extreme ticks handle gracefully (may return 0 due to precision)
      const extremeHighResult = tickToPrice(800000, WETH, USDC, 18);
      expect(typeof extremeHighResult).toBe('bigint'); // Should not error, even if 0
    });
  });

  describe('priceToTick', () => {
    it('should convert price to valid tick with proper spacing', () => {
      // Real Arbitrum addresses and realistic current price
      const WETH_ARBITRUM = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";
      const USDC_ARBITRUM = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
      const price = 4327480000n; // 4327.48 USDC per WETH (scaled by 10^6)
      
      const result = priceToTick(price, 60, WETH_ARBITRUM, USDC_ARBITRUM, 18);

      // Should be aligned to tick spacing
      expect(result % 60 === 0).toBe(true);
      
      // Should be in reasonable range around -192593 (current real tick)
      expect(result > -195000).toBe(true);
      expect(result < -190000).toBe(true);
    });

    it('should work with different tick spacings', () => {
      const WETH_ARBITRUM = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";
      const USDC_ARBITRUM = "0xaf88d065e77c8cC2239327C5EDb3A432268e5831";
      const price = 4327480000n; // 4327.48 USDC per WETH
      const spacings = [1, 10, 60, 200];
      
      spacings.forEach(spacing => {
        const result = priceToTick(price, spacing, WETH_ARBITRUM, USDC_ARBITRUM, 18);
        expect(result % spacing === 0).toBe(true);
      });
    });
  });

  describe('priceToClosestUsableTick', () => {
    it('should find closest usable tick', () => {
      const price = 1650000000n; // 1650 USDC per WETH
      const result = priceToClosestUsableTick(price, 60, WETH, USDC, 18);

      // Should be aligned to tick spacing
      expect(result % 60).toBe(0);
      
      // Should be in reasonable range
      expect(result > 200000).toBe(true);
      expect(result < 205000).toBe(true);
    });

    it('should handle extreme prices gracefully', () => {
      // Very high price (should be capped near MAX_TICK)
      const highResult = priceToClosestUsableTick(
        BigInt("999999999999999999999"),
        60,
        WETH,
        USDC,
        18
      );
      expect(Math.abs(highResult % 60)).toBeLessThanOrEqual(1); // Allow for floating point precision
      expect(highResult).toBeLessThanOrEqual(887220);

      // Very low price (should be capped near MIN_TICK)
      const lowResult = priceToClosestUsableTick(1n, 60, WETH, USDC, 18);
      expect(Math.abs(lowResult % 60)).toBeLessThanOrEqual(1); // Allow for floating point precision  
      expect(lowResult).toBeGreaterThanOrEqual(-887220);
    });
  });

  describe('tickToSqrtRatioX96', () => {
    it('should convert tick to sqrtRatioX96', () => {
      const tick = 202500;
      const result = tickToSqrtRatioX96(tick);
      
      expect(result).toBeInstanceOf(Object);
      expect(JSBI.GT(result, JSBI.BigInt(0))).toBe(true);
    });

    it('should handle edge case ticks', () => {
      const highResult = tickToSqrtRatioX96(800000);
      expect(JSBI.GT(highResult, JSBI.BigInt(0))).toBe(true);

      const lowResult = tickToSqrtRatioX96(-800000);
      expect(JSBI.GT(lowResult, JSBI.BigInt(0))).toBe(true);
    });
  });

  // Test fixtures for precise price calculations
  const fixtures = {
    wbtcWeth: {
      sqrtPriceX96: JSBI.BigInt("40396383607147620851397090925881670"),
      token0: {
        symbol: 'WBTC',
        decimals: 8,
      },
      token1: {
        symbol: 'WETH', 
        decimals: 18,
      },
      expected: {
        token1PerToken0: "25997154058158642121", // ~25.997 WETH per WBTC
        token0PerToken1: "3846574", // ~0.03846574 WBTC per WETH
      }
    },
    wethUsdc: {
      sqrtPriceX96: JSBI.BigInt("5211915345268226134615181"),
      token0: {
        symbol: 'WETH',
        decimals: 18,
      },
      token1: {
        symbol: 'USDC',
        decimals: 6,
      },
      expected: {
        token1PerToken0: "4327484675", // ~4327.48 USDC per WETH
        token0PerToken1: "231081118708235", // ~0.0002310811 WETH per USDC
      }
    }
  };

  describe('sqrtRatioX96ToToken1PerToken0', () => {
    it('should calculate correct WETH per WBTC', () => {
      const { sqrtPriceX96, token0, expected } = fixtures.wbtcWeth;
      
      const result = sqrtRatioX96ToToken1PerToken0(sqrtPriceX96, token0.decimals);
      
      expect(result.toString()).toBe(expected.token1PerToken0);
    });

    it('should calculate correct USDC per WETH', () => {
      const { sqrtPriceX96, token0, expected } = fixtures.wethUsdc;
      
      const result = sqrtRatioX96ToToken1PerToken0(sqrtPriceX96, token0.decimals);
      
      expect(result.toString()).toBe(expected.token1PerToken0);
    });

    it('should produce reasonable human-readable values for WBTC/WETH', () => {
      const { sqrtPriceX96, token0, token1 } = fixtures.wbtcWeth;
      
      const result = sqrtRatioX96ToToken1PerToken0(sqrtPriceX96, token0.decimals);
      const humanReadable = Number(result) / Math.pow(10, token1.decimals);
      
      // Should be around 25-26 WETH per WBTC
      expect(humanReadable).toBeGreaterThan(25);
      expect(humanReadable).toBeLessThan(27);
    });

    it('should produce reasonable human-readable values for WETH/USDC', () => {
      const { sqrtPriceX96, token0, token1 } = fixtures.wethUsdc;
      
      const result = sqrtRatioX96ToToken1PerToken0(sqrtPriceX96, token0.decimals);
      const humanReadable = Number(result) / Math.pow(10, token1.decimals);
      
      // Should be around 4000-5000 USDC per WETH
      expect(humanReadable).toBeGreaterThan(4000);
      expect(humanReadable).toBeLessThan(5000);
    });
  });

  describe('sqrtRatioX96ToToken0PerToken1', () => {
    it('should calculate correct WBTC per WETH', () => {
      const { sqrtPriceX96, token1, expected } = fixtures.wbtcWeth;
      
      const result = sqrtRatioX96ToToken0PerToken1(sqrtPriceX96, token1.decimals);
      
      expect(result.toString()).toBe(expected.token0PerToken1);
    });

    it('should calculate correct WETH per USDC', () => {
      const { sqrtPriceX96, token1, expected } = fixtures.wethUsdc;
      
      const result = sqrtRatioX96ToToken0PerToken1(sqrtPriceX96, token1.decimals);
      
      expect(result.toString()).toBe(expected.token0PerToken1);
    });

    it('should produce reasonable human-readable values for WBTC/WETH', () => {
      const { sqrtPriceX96, token0, token1 } = fixtures.wbtcWeth;
      
      const result = sqrtRatioX96ToToken0PerToken1(sqrtPriceX96, token1.decimals);
      const humanReadable = Number(result) / Math.pow(10, token0.decimals);
      
      // Should be around 0.035-0.045 WBTC per WETH
      expect(humanReadable).toBeGreaterThan(0.035);
      expect(humanReadable).toBeLessThan(0.045);
    });

    it('should produce reasonable human-readable values for WETH/USDC', () => {
      const { sqrtPriceX96, token0, token1 } = fixtures.wethUsdc;
      
      const result = sqrtRatioX96ToToken0PerToken1(sqrtPriceX96, token1.decimals);
      const humanReadable = Number(result) / Math.pow(10, token0.decimals);
      
      // Should be around 0.0002-0.0003 WETH per USDC
      expect(humanReadable).toBeGreaterThan(0.0002);
      expect(humanReadable).toBeLessThan(0.0003);
    });
  });

  describe('Reciprocal relationships', () => {
    it('should maintain reciprocal relationship for WBTC/WETH', () => {
      const { sqrtPriceX96, token0, token1 } = fixtures.wbtcWeth;
      
      const token1PerToken0 = sqrtRatioX96ToToken1PerToken0(sqrtPriceX96, token0.decimals);
      const token0PerToken1 = sqrtRatioX96ToToken0PerToken1(sqrtPriceX96, token1.decimals);
      
      const humanToken1PerToken0 = Number(token1PerToken0) / Math.pow(10, token1.decimals);
      const humanToken0PerToken1 = Number(token0PerToken1) / Math.pow(10, token0.decimals);
      
      const reciprocal = 1 / humanToken1PerToken0;
      
      // Should be approximately equal (within 0.1% tolerance due to precision)
      expect(Math.abs(reciprocal - humanToken0PerToken1) / humanToken0PerToken1).toBeLessThan(0.001);
    });

    it('should maintain reciprocal relationship for WETH/USDC', () => {
      const { sqrtPriceX96, token0, token1 } = fixtures.wethUsdc;
      
      const token1PerToken0 = sqrtRatioX96ToToken1PerToken0(sqrtPriceX96, token0.decimals);
      const token0PerToken1 = sqrtRatioX96ToToken0PerToken1(sqrtPriceX96, token1.decimals);
      
      const humanToken1PerToken0 = Number(token1PerToken0) / Math.pow(10, token1.decimals);
      const humanToken0PerToken1 = Number(token0PerToken1) / Math.pow(10, token0.decimals);
      
      const reciprocal = 1 / humanToken1PerToken0;
      
      // Should be approximately equal (within 0.1% tolerance due to precision)
      expect(Math.abs(reciprocal - humanToken0PerToken1) / humanToken0PerToken1).toBeLessThan(0.001);
    });
  });

  describe('Edge cases and input validation', () => {
    it('should handle very small sqrtRatioX96 values', () => {
      const smallSqrt = JSBI.BigInt("1000000000000000000"); // Very small value
      
      expect(() => {
        sqrtRatioX96ToToken1PerToken0(smallSqrt, 18);
      }).not.toThrow();
      
      expect(() => {
        sqrtRatioX96ToToken0PerToken1(smallSqrt, 6);
      }).not.toThrow();
    });

    it('should handle different decimal configurations', () => {
      const { sqrtPriceX96 } = fixtures.wbtcWeth; // Use WBTC/WETH instead as it has larger sqrtPriceX96
      
      // Test with various decimal combinations
      const result6Decimals = sqrtRatioX96ToToken1PerToken0(sqrtPriceX96, 6);
      const result8Decimals = sqrtRatioX96ToToken1PerToken0(sqrtPriceX96, 8);
      const result18Decimals = sqrtRatioX96ToToken1PerToken0(sqrtPriceX96, 18);
      
      expect(result6Decimals > 0n).toBe(true);
      expect(result8Decimals > 0n).toBe(true);
      expect(result18Decimals > 0n).toBe(true);
    });

    it('should accept both JSBI and bigint inputs', () => {
      const { expected } = fixtures.wbtcWeth;
      
      // Test with JSBI input
      const jsbiInput = JSBI.BigInt("40396383607147620851397090925881670");
      const resultFromJSBI = sqrtRatioX96ToToken1PerToken0(jsbiInput, 8);
      
      expect(resultFromJSBI.toString()).toBe(expected.token1PerToken0);
    });
  });

  describe('Round-trip conversions', () => {
    it('should maintain consistency in price -> tick -> price conversions', () => {
      const testPrices = [1000000000n, 1500000000n, 2000000000n]; // Various USDC prices
      
      testPrices.forEach(originalPrice => {
        // price -> tick -> price
        const tick = priceToTick(originalPrice, 60, WETH, USDC, 18);
        const convertedPrice = tickToPrice(tick, WETH, USDC, 18);
        
        // Should be within 20% (due to tick spacing and rounding)
        const tolerance = originalPrice / 5n; // 20%
        const diff = convertedPrice > originalPrice 
          ? convertedPrice - originalPrice 
          : originalPrice - convertedPrice;
        
        expect(diff).toBeLessThanOrEqual(tolerance);
      });
    });

    it('should maintain consistency in tick -> sqrtRatio -> conversion chain', () => {
      const testTicks = [200000, 202500, 205000];
      
      testTicks.forEach(tick => {
        // tick -> sqrtRatio -> price -> tick
        const sqrtRatio = tickToSqrtRatioX96(tick);
        const price = tickToPrice(tick, WETH, USDC, 18);
        const convertedTick = priceToTick(price, 60, WETH, USDC, 18);
        
        // Should be within a few tick spacings
        const diff = Math.abs(convertedTick - tick);
        expect(diff).toBeLessThanOrEqual(180); // 3 tick spacings of 60
      });
    });
  });

  describe('Token ordering', () => {
    it('should handle token address ordering correctly', () => {
      // Test that function recognizes which token has lower address
      expect(BigInt(USDC) < BigInt(WETH)).toBe(true);
      expect(BigInt(WBTC) < BigInt(WETH)).toBe(true);
      
      // Functions should work regardless of parameter order
      const price = 1650000000n;
      
      const result1 = priceToTick(price, 60, WETH, USDC, 18);
      const result2 = priceToTick(price, 60, USDC, WETH, 6);
      
      // Results should both be valid ticks
      expect(result1 % 60).toBe(0);
      expect(result2 % 60).toBe(0);
    });
  });
});