/**
 * Mathematical utilities for exact calculations
 */

/**
 * Represents an exact fraction with numerator and denominator
 */
export interface Fraction<T = bigint> {
  /** Numerator */
  num: T;
  /** Denominator */  
  den: T;
}

/**
 * Creates a fraction from a decimal number and decimal places
 * @param value - The decimal value as string
 * @param decimals - Number of decimal places
 * @returns Fraction representing the exact value
 */
export function decimalToFraction(value: string, decimals: number = 18): Fraction<bigint> {
  const [integerPart = "0", fractionalPart = ""] = value.split(".");
  const paddedFractional = fractionalPart.padEnd(decimals, "0").slice(0, decimals);
  const fullString = integerPart + paddedFractional;
  
  return {
    num: BigInt(fullString),
    den: 10n ** BigInt(decimals)
  };
}