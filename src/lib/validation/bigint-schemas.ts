import { z } from 'zod';

/**
 * Validation schemas for BigInt string values used in APIs
 * All token amounts, prices, and position values must use BigInt strings
 */

// BigInt string validation - must be a string representing a non-negative integer
export const BigIntStringSchema = z.string()
  .regex(/^\d+$/, 'Must be a valid BigInt string (digits only)')
  .refine(val => val !== '' && !val.startsWith('-'), 'Must be a non-negative integer string');

// Optional BigInt string - for nullable/optional values
export const OptionalBigIntStringSchema = BigIntStringSchema.optional();

// Token amount validation - scaled to token decimals
export const TokenAmountSchema = z.object({
  amount: BigIntStringSchema,
  decimals: z.number().int().min(0).max(36)
});

// Price validation - always in quote token terms, scaled
export const PriceSchema = z.object({
  price: BigIntStringSchema,
  baseTokenDecimals: z.number().int().min(0).max(36),
  quoteTokenDecimals: z.number().int().min(0).max(36)
});

// Position value validation - all values in quote token smallest unit
export const PositionValueSchema = z.object({
  initialValue: BigIntStringSchema,
  currentValue: BigIntStringSchema,
  pnl: z.string().regex(/^-?\d+$/, 'PnL must be a valid signed BigInt string'), // Can be negative
  fees: BigIntStringSchema
});

// Range validation for Uniswap V3 positions
export const PositionRangeSchema = z.object({
  lowerPrice: BigIntStringSchema,
  upperPrice: BigIntStringSchema,
  currentPrice: BigIntStringSchema
});

// Liquidity validation
export const LiquiditySchema = z.object({
  liquidity: BigIntStringSchema,
  token0Amount: BigIntStringSchema,
  token1Amount: BigIntStringSchema
});

// Helper function to validate BigInt string
export function validateBigIntString(value: unknown): value is string {
  return typeof value === 'string' && /^\d+$/.test(value) && value !== '';
}

// Helper function to validate signed BigInt string (for PnL)
export function validateSignedBigIntString(value: unknown): value is string {
  return typeof value === 'string' && /^-?\d+$/.test(value) && value !== '' && value !== '-';
}