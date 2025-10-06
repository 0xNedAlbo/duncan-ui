/**
 * Position Size Calculation Hook
 *
 * Hook for calculating position size and liquidity from investment amounts
 */

import { useMemo } from 'react';
import type { PoolData } from "@/app-shared/hooks/api/usePool";
import {
    getLiquidityFromInvestmentAmounts_withTick,
    getTokenAmountsFromLiquidity,
} from '@/lib/utils/uniswap-v3/liquidity';
import { compareAddresses } from '@/lib/utils/evm';

interface TokenInfo {
    address: string;
    symbol: string;
    decimals: number;
    logoUrl?: string | null;
}

interface PositionSizeCalculationParams {
    baseAmount: bigint;
    quoteAmount: bigint;
    baseToken: TokenInfo;
    quoteToken: TokenInfo;
    pool: PoolData;
    tickLower: number;
    tickUpper: number;
}

interface PositionSizeCalculationResult {
    liquidity: bigint;
    token0Amount: bigint;
    token1Amount: bigint;
    positionValueInQuote: bigint;
    isQuoteToken0: boolean;
}

/**
 * Calculate position size from investment amounts
 *
 * @param params Investment parameters including amounts, tokens, pool, and tick range
 * @returns Calculated position size data including liquidity and token amounts
 */
export function usePositionSizeCalculation({
    baseAmount,
    quoteAmount,
    baseToken,
    quoteToken,
    pool,
    tickLower,
    tickUpper,
}: PositionSizeCalculationParams): PositionSizeCalculationResult {
    return useMemo(() => {
        // Determine token ordering (quote token is token0 if its address is smaller)
        const isQuoteToken0 = compareAddresses(quoteToken.address, baseToken.address) < 0;

        // Calculate liquidity from investment amounts
        let liquidity: bigint = 0n;
        if (pool.sqrtPriceX96 && (baseAmount > 0n || quoteAmount > 0n)) {
            try {
                liquidity = getLiquidityFromInvestmentAmounts_withTick(
                    baseAmount,
                    baseToken.decimals,
                    quoteAmount,
                    quoteToken.decimals,
                    isQuoteToken0,
                    tickUpper,
                    tickLower,
                    BigInt(pool.sqrtPriceX96)
                );
            } catch (error) {
                console.error('Error calculating liquidity:', error);
                liquidity = 0n;
            }
        }

        // Calculate resulting token amounts from liquidity
        let token0Amount: bigint = 0n;
        let token1Amount: bigint = 0n;
        if (liquidity > 0n && pool.currentTick !== null) {
            try {
                const tokenAmounts = getTokenAmountsFromLiquidity(
                    liquidity,
                    pool.currentTick,
                    tickLower,
                    tickUpper
                );
                token0Amount = tokenAmounts.token0Amount;
                token1Amount = tokenAmounts.token1Amount;
            } catch (error) {
                console.error('Error calculating token amounts from liquidity:', error);
            }
        }

        // Calculate position value in quote token units
        // Convert base token amount to quote units and add quote amount
        const baseTokenAmount = isQuoteToken0 ? token1Amount : token0Amount;
        const quoteTokenAmount = isQuoteToken0 ? token0Amount : token1Amount;

        let positionValueInQuote: bigint = quoteTokenAmount;
        if (baseTokenAmount > 0n && pool.sqrtPriceX96) {
            try {
                // Convert base amount to quote units using current price
                const sqrtPriceX96 = BigInt(pool.sqrtPriceX96);

                if (isQuoteToken0) {
                    // quote=token0, base=token1 -> price (quote/base) = Q192 / S^2
                    const Q192 = (1n << 192n);
                    const baseAsQuote = (baseTokenAmount * Q192) / (sqrtPriceX96 * sqrtPriceX96);
                    positionValueInQuote += baseAsQuote;
                } else {
                    // quote=token1, base=token0 -> price (quote/base) = S^2 / Q192
                    const Q192 = (1n << 192n);
                    const baseAsQuote = (baseTokenAmount * sqrtPriceX96 * sqrtPriceX96) / Q192;
                    positionValueInQuote += baseAsQuote;
                }
            } catch (error) {
                console.error('Error calculating position value in quote:', error);
                // Fallback to just quote amount if conversion fails
                positionValueInQuote = quoteTokenAmount;
            }
        }

        return {
            liquidity,
            token0Amount,
            token1Amount,
            positionValueInQuote,
            isQuoteToken0,
        };
    }, [
        baseAmount,
        quoteAmount,
        baseToken.address,
        baseToken.decimals,
        quoteToken.address,
        quoteToken.decimals,
        pool.sqrtPriceX96,
        pool.currentTick,
        tickLower,
        tickUpper,
    ]);
}