import { describe, it, expect } from 'vitest';
import {
  formatFractionHuman,
  formatHumanWithDecimals,
  formatFractionRangeHuman,
  formatFractionAsPreciseString,
  formatIntegerGrouped,
  fractionToDecimalParts,
  FORMAT_PRESET_EN,
  FORMAT_PRESET_DE,
  type Fraction,
  type FormatOpts,
} from './fraction-format';

describe('fraction-format utilities', () => {
  describe('formatHumanWithDecimals', () => {
    it('should return "0" for zero value (not "0.")', () => {
      expect(formatHumanWithDecimals(0n, 6)).toBe('0');
      expect(formatHumanWithDecimals(0n, 18)).toBe('0');
      expect(formatHumanWithDecimals(0n, 0)).toBe('0');
    });

    it('should format USDC amounts correctly (6 decimals)', () => {
      // 69,123.456789 USDC
      expect(formatHumanWithDecimals(69123456789n, 6)).toBe('69,123.456789');
      
      // 1 USDC
      expect(formatHumanWithDecimals(1000000n, 6)).toBe('1');
      
      // 0.1 USDC  
      expect(formatHumanWithDecimals(100000n, 6)).toBe('0.1');
      
      // 0.000001 USDC (1 unit) - uses Unicode subscript ₅
      expect(formatHumanWithDecimals(1n, 6)).toBe('0.₍₅₎1');
    });

    it('should format ETH amounts correctly (18 decimals)', () => {
      // 1.5 ETH
      expect(formatHumanWithDecimals(1500000000000000000n, 18)).toBe('1.5');
      
      // 1 ETH
      expect(formatHumanWithDecimals(1000000000000000000n, 18)).toBe('1');
      
      // 0.1 ETH
      expect(formatHumanWithDecimals(100000000000000000n, 18)).toBe('0.1');
      
      // 1 Wei - uses Unicode subscript ₁₇
      expect(formatHumanWithDecimals(1n, 18)).toBe('0.₍₁₇₎1');
    });

    it('should handle large numbers with thousands separators', () => {
      // 1,000,000 USDC
      expect(formatHumanWithDecimals(1000000000000n, 6)).toBe('1,000,000');
      
      // 1,234,567.123456 USDC
      expect(formatHumanWithDecimals(1234567123456n, 6)).toBe('1,234,567.123456');
    });

    it('should use German formatting when specified', () => {
      const germanOpts: FormatOpts = {
        groupSep: '.',
        decimalSep: ',',
        useSubscript: true,
      };
      
      expect(formatHumanWithDecimals(1234567123456n, 6, germanOpts)).toBe('1.234.567,123456');
    });
  });

  describe('formatFractionHuman', () => {
    it('should format basic fractions', () => {
      const fraction: Fraction<bigint> = { num: 1n, den: 2n };
      expect(formatFractionHuman(fraction)).toBe('0.5');
    });

    it('should format zero fraction', () => {
      const fraction: Fraction<bigint> = { num: 0n, den: 10n };
      expect(formatFractionHuman(fraction)).toBe('0');
    });

    it('should handle large integers with grouping', () => {
      const fraction: Fraction<bigint> = { num: 1234567n, den: 1n };
      expect(formatFractionHuman(fraction)).toBe('1,234,567');
    });

    it('should use zero-skip notation for small values', () => {
      // 0.0000001234 - uses Unicode subscript ₆
      const fraction: Fraction<bigint> = { num: 1234n, den: 10000000000n };
      expect(formatFractionHuman(fraction)).toBe('0.₍₆₎1234');
    });

    it('should not use zero-skip for fewer than 4 leading zeros', () => {
      // 0.001234
      const fraction: Fraction<bigint> = { num: 1234n, den: 1000000n };
      expect(formatFractionHuman(fraction)).toBe('0.001234');
    });

    it('should handle negative values', () => {
      const fraction: Fraction<bigint> = { num: -1n, den: 2n };
      expect(formatFractionHuman(fraction)).toBe('-0.5');
    });

    it('should use ASCII fallback when useSubscript is false', () => {
      const fraction: Fraction<bigint> = { num: 1234n, den: 10000000000n };
      const opts: FormatOpts = { useSubscript: false };
      expect(formatFractionHuman(fraction, opts)).toBe('0.(6)1234');
    });
  });

  describe('formatFractionRangeHuman', () => {
    it('should format ranges with different integer parts separately', () => {
      const a: Fraction<bigint> = { num: 1n, den: 1n };
      const b: Fraction<bigint> = { num: 2n, den: 1n };
      expect(formatFractionRangeHuman(a, b)).toBe('1 – 2');
    });

    it('should compress ranges with same zero-skip pattern', () => {
      const a: Fraction<bigint> = { num: 1234n, den: 10000000000n }; // 0.0000001234
      const b: Fraction<bigint> = { num: 1999n, den: 10000000000n }; // 0.0000001999
      expect(formatFractionRangeHuman(a, b)).toBe('0.₍₆₎1[234–999]');
    });

    it('should handle identical ranges', () => {
      const a: Fraction<bigint> = { num: 1234n, den: 10000000000n };
      const b: Fraction<bigint> = { num: 1234n, den: 10000000000n };
      expect(formatFractionRangeHuman(a, b)).toBe('0.₍₆₎1234[∅–∅]');
    });
  });

  describe('fractionToDecimalParts', () => {
    it('should convert fraction to decimal parts', () => {
      const fraction: Fraction<bigint> = { num: 1234n, den: 1000n };
      const result = fractionToDecimalParts(fraction);
      
      expect(result.sign).toBe(1);
      expect(result.intPart).toBe('1');
      expect(result.fracDigits).toBe('234');
      expect(result.truncated).toBe(false);
    });

    it('should handle zero', () => {
      const fraction: Fraction<bigint> = { num: 0n, den: 10n };
      const result = fractionToDecimalParts(fraction);
      
      expect(result.sign).toBe(0);
      expect(result.intPart).toBe('0');
      expect(result.fracDigits).toBe('');
      expect(result.truncated).toBe(false);
    });

    it('should handle negative values', () => {
      const fraction: Fraction<bigint> = { num: -1234n, den: 1000n };
      const result = fractionToDecimalParts(fraction);
      
      expect(result.sign).toBe(-1);
      expect(result.intPart).toBe('1');
      expect(result.fracDigits).toBe('234');
      expect(result.truncated).toBe(false);
    });

    it('should truncate at maxFracDigits', () => {
      // 1/3 = 0.333...
      const fraction: Fraction<bigint> = { num: 1n, den: 3n };
      const result = fractionToDecimalParts(fraction, 5);
      
      expect(result.intPart).toBe('0');
      expect(result.fracDigits).toBe('33333');
      expect(result.truncated).toBe(true);
    });

    it('should throw on division by zero', () => {
      const fraction: Fraction<bigint> = { num: 1n, den: 0n };
      expect(() => fractionToDecimalParts(fraction)).toThrow('Division by zero');
    });
  });

  describe('formatFractionAsPreciseString', () => {
    it('should format fraction as precise integer string', () => {
      const fraction: Fraction<bigint> = { num: 1500000000000000000n, den: 1000000000000000000n };
      expect(formatFractionAsPreciseString(fraction)).toBe('1');
      
      const fraction2: Fraction<bigint> = { num: 1234567890123456789n, den: 1000000000000000000n };
      expect(formatFractionAsPreciseString(fraction2)).toBe('1');
    });

    it('should handle zero', () => {
      const fraction: Fraction<bigint> = { num: 0n, den: 1000000000000000000n };
      expect(formatFractionAsPreciseString(fraction)).toBe('0');
    });
  });

  describe('formatIntegerGrouped', () => {
    it('should format integers with thousand separators', () => {
      expect(formatIntegerGrouped(1234567n)).toBe('1,234,567');
      expect(formatIntegerGrouped(1000n)).toBe('1,000');
      expect(formatIntegerGrouped(123n)).toBe('123');
    });

    it('should handle zero', () => {
      expect(formatIntegerGrouped(0n)).toBe('0');
    });

    it('should handle negative numbers', () => {
      expect(formatIntegerGrouped(-1234567n)).toBe('-1,234,567');
    });

    it('should use custom group separator', () => {
      expect(formatIntegerGrouped(1234567n, { groupSep: '.' })).toBe('1.234.567');
    });
  });

  describe('format presets', () => {
    it('should have correct English preset', () => {
      expect(FORMAT_PRESET_EN.groupSep).toBe(',');
      expect(FORMAT_PRESET_EN.decimalSep).toBe('.');
      expect(FORMAT_PRESET_EN.useSubscript).toBe(true);
      expect(FORMAT_PRESET_EN.mantissaDigits).toBe(8);
      expect(FORMAT_PRESET_EN.maxFracDigits).toBe(200);
    });

    it('should have correct German preset', () => {
      expect(FORMAT_PRESET_DE.groupSep).toBe('.');
      expect(FORMAT_PRESET_DE.decimalSep).toBe(',');
      expect(FORMAT_PRESET_DE.useSubscript).toBe(true);
      expect(FORMAT_PRESET_DE.mantissaDigits).toBe(8);
      expect(FORMAT_PRESET_DE.maxFracDigits).toBe(200);
    });
  });

  describe('real-world DeFi scenarios', () => {
    it('should format typical USDC position values', () => {
      // $1,234.56 USDC
      expect(formatHumanWithDecimals(1234560000n, 6)).toBe('1,234.56');
      
      // $0.01 USDC
      expect(formatHumanWithDecimals(10000n, 6)).toBe('0.01');
      
      // Very small amount: 0.000123 USDC (only 3 leading zeros, no zero-skip)
      expect(formatHumanWithDecimals(123n, 6)).toBe('0.000123');
    });

    it('should format typical ETH position values', () => {
      // 2.5 ETH
      expect(formatHumanWithDecimals(2500000000000000000n, 18)).toBe('2.5');
      
      // 0.001 ETH
      expect(formatHumanWithDecimals(1000000000000000n, 18)).toBe('0.001');
      
      // Very small amount: 1 Gwei - uses Unicode subscript ₈
      expect(formatHumanWithDecimals(1000000000n, 18)).toBe('0.₍₈₎1');
    });

    it('should handle PnL calculations', () => {
      // Positive PnL: +156.789 USDC
      expect(formatHumanWithDecimals(156789000n, 6)).toBe('156.789');
      
      // Negative PnL would be handled by sign in the UI layer
      // The formatting function itself just handles magnitude
      expect(formatHumanWithDecimals(156789000n, 6)).toBe('156.789');
      
      // Zero PnL case (this was the main issue to fix)
      expect(formatHumanWithDecimals(0n, 6)).toBe('0');
    });

    it('should format liquidity values', () => {
      // Typical liquidity amount (stored as BigInt in 18 decimal precision)
      // Shows 8 mantissa digits by default, so full precision is shown
      expect(formatHumanWithDecimals(123456789012345678901n, 18)).toBe('123.456789012345678901');
    });
  });
});