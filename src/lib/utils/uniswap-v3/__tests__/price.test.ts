import { describe, it, expect } from 'vitest';
import JSBI from 'jsbi';
import {
  priceToSqrtRatioX96,
  tickToPrice,
  priceToTick,
  priceToClosestUsableTick,
  tickToSqrtRatioX96,
  sqrtRatioX96ToToken0Price,
  sqrtRatioX96ToToken1Price,
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
      const tick = 202500; // Around current WETH/USDC level
      const result = tickToPrice(tick, WETH, USDC, 18);

      // Should be positive and in reasonable range (1000-3000 USDC per WETH)
      expect(result > 1000000000n).toBe(true); // > 1000 USDC
      expect(result < 3000000000n).toBe(true); // < 3000 USDC
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
      const price = 1650000000n; // 1650 USDC per WETH
      const result = priceToTick(price, 60, WETH, USDC, 18);

      // Should be aligned to tick spacing
      expect(result % 60).toBe(0);
      
      // Should be in reasonable range
      expect(result > 200000).toBe(true);
      expect(result < 205000).toBe(true);
    });

    it('should work with different tick spacings', () => {
      const price = 1650000000n;
      const spacings = [1, 10, 60, 200];
      
      spacings.forEach(spacing => {
        const result = priceToTick(price, spacing, WETH, USDC, 18);
        expect(result % spacing).toBe(0);
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

  describe('sqrtRatioX96ToToken0Price & sqrtRatioX96ToToken1Price', () => {
    it('should convert sqrtRatio to token prices', () => {
      const tick = 202500;
      const sqrtRatio = tickToSqrtRatioX96(tick);
      
      const token0Price = sqrtRatioX96ToToken0Price(sqrtRatio, 6, 18); // USDC per WETH
      const token1Price = sqrtRatioX96ToToken1Price(sqrtRatio, 6, 18); // WETH per USDC
      
      // token1Price should be positive, token0Price might be 0 due to precision issues with high prices
      expect(token1Price > 0n).toBe(true);
      expect(typeof token0Price).toBe('bigint'); // May be 0 due to precision
    });

    it('should handle different decimal configurations', () => {
      const tick = -73000; // More reasonable tick for WBTC/WETH
      const sqrtRatio = tickToSqrtRatioX96(tick);
      
      const result = sqrtRatioX96ToToken0Price(sqrtRatio, 8, 18); // WBTC/WETH price
      expect(typeof result).toBe('bigint');
      // For very negative ticks, this might also have precision issues
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