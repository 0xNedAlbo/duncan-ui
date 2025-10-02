import { useMemo } from "react";
import { normalizeAddress } from "@/lib/utils/evm";
import type { UseTokenApprovalResult } from "@/hooks/useTokenApproval";

interface PoolData {
    token0: {
        address: string;
        symbol: string;
        decimals: number;
    };
    token1: {
        address: string;
        symbol: string;
        decimals: number;
    };
}

export interface ValidationResult {
    isValid: boolean;
    hasValidPool: boolean;
    hasValidTokens: boolean;
    hasValidParams: boolean;
    error?: string;
}

export interface InsufficientFundsInfo {
    needsBase: boolean;
    needsQuote: boolean;
    missingBase: bigint;
    missingQuote: bigint;
}

export interface UsePositionValidationParams {
    isPoolLoading: boolean;
    isPoolError: boolean;
    pool: PoolData | null | undefined;
    baseToken: string | null | undefined;
    quoteToken: string | null | undefined;
    liquidity: bigint | undefined;
    tickLower: number;
    tickUpper: number;
    poolError?: any;
    isConnected: boolean;
    isWrongNetwork: boolean;
    baseBalance: bigint;
    quoteBalance: bigint;
    requiredBaseAmount: bigint;
    requiredQuoteAmount: bigint;
    baseBalanceLoading: boolean;
    quoteBalanceLoading: boolean;
    baseApproval: UseTokenApprovalResult;
    quoteApproval: UseTokenApprovalResult;
}

export interface UsePositionValidationResult {
    validation: ValidationResult;
    insufficientFunds: InsufficientFundsInfo | null;
    canExecuteTransactions: boolean;
}

/**
 * Hook for validating position parameters and checking transaction readiness
 *
 * Validates:
 * - Pool data availability
 * - Token pair matches pool tokens
 * - Position parameters (ticks, liquidity)
 * - Wallet balance sufficiency
 * - Transaction execution readiness
 *
 * @param params - Validation parameters
 * @returns Validation results and transaction readiness status
 */
export function usePositionValidation(
    params: UsePositionValidationParams
): UsePositionValidationResult {
    const {
        isPoolLoading,
        isPoolError,
        pool,
        baseToken,
        quoteToken,
        liquidity,
        tickLower,
        tickUpper,
        poolError,
        isConnected,
        isWrongNetwork,
        baseBalance,
        quoteBalance,
        requiredBaseAmount,
        requiredQuoteAmount,
        baseBalanceLoading,
        quoteBalanceLoading,
        baseApproval,
        quoteApproval,
    } = params;

    // Pool-token validation logic
    const validation = useMemo((): ValidationResult => {
        // Check if pool is loaded successfully
        if (isPoolLoading) {
            return {
                isValid: false,
                hasValidPool: false,
                hasValidTokens: false,
                hasValidParams: false,
            };
        }

        if (isPoolError || !pool) {
            return {
                isValid: false,
                hasValidPool: false,
                hasValidTokens: false,
                hasValidParams: false,
                error: poolError || "Pool could not be loaded",
            };
        }

        // Validate that both tokens exist in the pool
        if (!baseToken || !quoteToken) {
            return {
                isValid: false,
                hasValidPool: true,
                hasValidTokens: false,
                hasValidParams: false,
                error: "Base and quote tokens are required",
            };
        }

        const normalizedBaseToken = normalizeAddress(baseToken);
        const normalizedQuoteToken = normalizeAddress(quoteToken);
        const normalizedToken0 = normalizeAddress(pool.token0.address);
        const normalizedToken1 = normalizeAddress(pool.token1.address);

        const poolTokens = [normalizedToken0, normalizedToken1];
        const hasBaseToken = poolTokens.includes(normalizedBaseToken);
        const hasQuoteToken = poolTokens.includes(normalizedQuoteToken);
        const tokensValid =
            hasBaseToken &&
            hasQuoteToken &&
            normalizedBaseToken !== normalizedQuoteToken;

        if (!tokensValid) {
            return {
                isValid: false,
                hasValidPool: true,
                hasValidTokens: false,
                hasValidParams: false,
                error: "Selected tokens do not match the pool tokens",
            };
        }

        // Validate position parameters
        const liquidityBigInt = BigInt(liquidity || "0");
        const paramsValid =
            tickLower !== undefined &&
            tickUpper !== undefined &&
            !isNaN(tickLower) &&
            !isNaN(tickUpper) &&
            tickLower < tickUpper &&
            liquidityBigInt > 0n;

        if (!paramsValid) {
            return {
                isValid: false,
                hasValidPool: true,
                hasValidTokens: true,
                hasValidParams: false,
                error: "Position parameters are incomplete or invalid",
            };
        }

        return {
            isValid: true,
            hasValidPool: true,
            hasValidTokens: true,
            hasValidParams: true,
        };
    }, [
        isPoolLoading,
        isPoolError,
        pool,
        baseToken,
        quoteToken,
        liquidity,
        tickLower,
        tickUpper,
        poolError,
    ]);

    // Calculate insufficient funds
    const insufficientFunds = useMemo((): InsufficientFundsInfo | null => {
        // Don't show insufficient funds info if not connected or still loading balances
        if (!isConnected || baseBalanceLoading || quoteBalanceLoading) return null;

        // Don't show if required amounts are not calculated yet
        if (requiredBaseAmount === 0n && requiredQuoteAmount === 0n) return null;

        const needsBase = baseBalance < requiredBaseAmount;
        const needsQuote = quoteBalance < requiredQuoteAmount;

        if (!needsBase && !needsQuote) return null;

        const missingBase = needsBase ? requiredBaseAmount - baseBalance : 0n;
        const missingQuote = needsQuote ? requiredQuoteAmount - quoteBalance : 0n;

        return {
            needsBase,
            needsQuote,
            missingBase,
            missingQuote,
        };
    }, [
        isConnected,
        baseBalance,
        quoteBalance,
        requiredBaseAmount,
        requiredQuoteAmount,
        baseBalanceLoading,
        quoteBalanceLoading,
    ]);

    // Check if transaction steps should be enabled
    const canExecuteTransactions = useMemo(() => {
        // Must be connected
        if (!isConnected) return false;

        // Must be on correct network
        if (isWrongNetwork) return false;

        // Must have sufficient funds (no insufficient funds warning)
        if (insufficientFunds) return false;

        // Don't allow if still loading approval status
        if (baseApproval.isLoadingAllowance || quoteApproval.isLoadingAllowance)
            return false;

        return true;
    }, [
        isConnected,
        isWrongNetwork,
        insufficientFunds,
        baseApproval.isLoadingAllowance,
        quoteApproval.isLoadingAllowance,
    ]);

    return {
        validation,
        insufficientFunds,
        canExecuteTransactions,
    };
}
