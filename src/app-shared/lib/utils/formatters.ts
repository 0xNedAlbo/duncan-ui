/**
 * Currency, percentage, and token amount formatting utilities
 */

import { formatHumanWithDecimals, FORMAT_PRESET_EN, FORMAT_PRESET_DE } from '@/lib/utils/fraction-format';

/**
 * Format a currency value with K/M suffixes
 * @param value - The currency value as string or number
 * @returns Formatted currency string (e.g., "$1.23K", "$4.56M")
 */
export const formatCurrency = (value: string | number): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(num)) return '$0.00';
  
  if (num >= 1000000) {
    return `$${(num / 1000000).toFixed(2)}M`;
  } else if (num >= 1000) {
    return `$${(num / 1000).toFixed(2)}K`;
  } else {
    return `$${num.toFixed(2)}`;
  }
};

/**
 * Format a percentage with + or - prefix
 * @param value - The percentage value as number
 * @returns Formatted percentage string (e.g., "+5.23%", "-2.14%")
 */
export const formatPercent = (value: number): string => {
  if (isNaN(value)) return '0.00%';
  
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
};

/**
 * Format liquidity value with exact precision (no rounding)
 * @param liquidity - The liquidity value as string
 * @param useGermanFormat - Use German number format (comma as decimal separator)
 * @returns Formatted liquidity string with exact precision
 */
export const formatLiquidity = (liquidity: string, useGermanFormat: boolean = false): string => {
  try {
    const liquidityBigInt = BigInt(liquidity);
    const preset = useGermanFormat ? FORMAT_PRESET_DE : FORMAT_PRESET_EN;
    
    return formatHumanWithDecimals(liquidityBigInt, 18, {
      ...preset,
      mantissaDigits: 6, // Show 6 significant digits
      maxFracDigits: 50   // Limit to prevent excessive computation
    });
  } catch (error) {
    console.error('Error formatting liquidity:', error);
    return liquidity; // Fallback to original string
  }
};

/**
 * Format a token amount with exact precision
 * @param amount - The token amount as string or bigint
 * @param decimals - Number of decimals for the token
 * @param useGermanFormat - Use German number format
 * @returns Formatted token amount string
 */
export const formatTokenAmount = (
  amount: string | bigint, 
  decimals: number = 18,
  useGermanFormat: boolean = false
): string => {
  try {
    const amountBigInt = typeof amount === 'string' ? BigInt(amount) : amount;
    const preset = useGermanFormat ? FORMAT_PRESET_DE : FORMAT_PRESET_EN;
    
    return formatHumanWithDecimals(amountBigInt, decimals, {
      ...preset,
      mantissaDigits: 8, // Show 8 significant digits for token amounts
      maxFracDigits: 100
    });
  } catch (error) {
    console.error('Error formatting token amount:', error);
    return amount.toString();
  }
};