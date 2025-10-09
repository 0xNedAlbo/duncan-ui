"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { PencilLine, PencilOff, RefreshCw } from "lucide-react";
import { useAccount } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useTranslations } from "@/app-shared/i18n/client";
import { TokenAmountInput } from "@/app-shared/components/common/TokenAmountInput";
import type { PoolData } from "@/app-shared/hooks/api/usePool";
import type { SupportedChainsType } from "@/config/chains";
import { usePositionSizeCalculation } from "@/app-shared/hooks/usePositionSizeCalculation";
import {
    getTokenAmountsFromLiquidity,
    getLiquidityFromAmount0,
    getLiquidityFromAmount1,
} from "@/lib/utils/uniswap-v3/liquidity";
import { formatCompactValue } from "@/lib/utils/fraction-format";
import { TickMath } from "@uniswap/v3-sdk";

interface TokenInfo {
    address: string;
    symbol: string;
    decimals: number;
    logoUrl?: string | null;
}

interface PositionSizeConfigProps {
    pool: PoolData;
    baseToken: TokenInfo;
    quoteToken: TokenInfo;
    tickLower: number;
    tickUpper: number;
    liquidity: bigint; // Current liquidity value from parent/URL
    // eslint-disable-next-line no-unused-vars
    onLiquidityChange: (liquidity: bigint) => void;
    initialMode?: "quote" | "base" | "matched" | "independent";
    chain?: SupportedChainsType;
    onRefreshPool?: () => Promise<any>;
    label?: string; // Custom label for the header (default: "Position Size:")
}

type InputMode = "quote" | "base" | "matched" | "independent";

export function PositionSizeConfig({
    pool,
    baseToken,
    quoteToken,
    tickLower,
    tickUpper,
    liquidity,
    onLiquidityChange,
    initialMode = "independent",
    chain,
    onRefreshPool,
    label = "Position Size:",
}: PositionSizeConfigProps) {
    const t = useTranslations();
    const { isConnected } = useAccount();
    const { openConnectModal } = useConnectModal();
    const [mode, setMode] = useState<InputMode>(initialMode);
    const [baseAmount, setBaseAmount] = useState<string>("0");
    const [quoteAmount, setQuoteAmount] = useState<string>("0");
    const [baseAmountBigInt, setBaseAmountBigInt] = useState<bigint>(0n);
    const [quoteAmountBigInt, setQuoteAmountBigInt] = useState<bigint>(0n);
    const [isExpanded, setIsExpanded] = useState<boolean>(false);
    const [isInitialized, setIsInitialized] = useState<boolean>(false);
    const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
    const [lastChangedField, setLastChangedField] = useState<"base" | "quote" | null>(null);

    // Use the position size calculation hook
    const positionCalculation = usePositionSizeCalculation({
        baseAmount: baseAmountBigInt,
        quoteAmount: quoteAmountBigInt,
        baseToken,
        quoteToken,
        pool,
        tickLower,
        tickUpper,
    });

    // Initialize input fields from liquidity prop when component first loads
    useEffect(() => {
        if (!isInitialized && liquidity > 0n && pool.currentTick !== null) {
            try {
                const { token0Amount, token1Amount } = getTokenAmountsFromLiquidity(
                    liquidity,
                    pool.currentTick,
                    tickLower,
                    tickUpper
                );

                const baseTokenAmount = positionCalculation.isQuoteToken0 ? token1Amount : token0Amount;
                const quoteTokenAmount = positionCalculation.isQuoteToken0 ? token0Amount : token1Amount;

                // Set the amounts
                const baseAmountString = formatCompactValue(
                    baseTokenAmount,
                    baseToken.decimals
                );
                const quoteAmountString = formatCompactValue(
                    quoteTokenAmount,
                    quoteToken.decimals
                );

                setBaseAmount(baseAmountString);
                setQuoteAmount(quoteAmountString);
                setBaseAmountBigInt(baseTokenAmount);
                setQuoteAmountBigInt(quoteTokenAmount);
                setIsInitialized(true);
            } catch (error) {
                console.error("Error initializing amounts from liquidity:", error);
                setIsInitialized(true); // Still mark as initialized to prevent retry
            }
        } else if (!isInitialized && liquidity === 0n) {
            // If liquidity is 0, just mark as initialized with default values
            setIsInitialized(true);
        }
    }, [
        liquidity,
        pool.currentTick,
        tickLower,
        tickUpper,
        baseToken,
        quoteToken,
        isInitialized,
        positionCalculation.isQuoteToken0,
    ]);


    // Handle base token amount change
    const handleBaseAmountChange = useCallback(
        (value: string, valueBigInt: bigint) => {
            setBaseAmount(value);
            setBaseAmountBigInt(valueBigInt);
            // Track which field was changed for matched mode
            setLastChangedField("base");
        },
        []
    );

    // Handle quote token amount change
    const handleQuoteAmountChange = useCallback(
        (value: string, valueBigInt: bigint) => {
            setQuoteAmount(value);
            setQuoteAmountBigInt(valueBigInt);
            // Track which field was changed for matched mode
            setLastChangedField("quote");
        },
        []
    );

    // Handle "Match Base" - calculate required quote amount from current base amount
    // Strategy: Use ALL the base amount entered, calculate liquidity from it, then find matching quote amount
    const handleMatchBase = useCallback(() => {
        if (baseAmountBigInt === 0n || pool.currentTick === null || !pool.sqrtPriceX96) {
            return;
        }

        try {
            const sqrtPriceCurrent = BigInt(pool.sqrtPriceX96);
            const sqrtPriceLower = BigInt(TickMath.getSqrtRatioAtTick(tickLower).toString());
            const sqrtPriceUpper = BigInt(TickMath.getSqrtRatioAtTick(tickUpper).toString());

            // Determine which token is which in the pool
            const token0Amount = positionCalculation.isQuoteToken0 ? 0n : baseAmountBigInt;
            const token1Amount = positionCalculation.isQuoteToken0 ? baseAmountBigInt : 0n;

            // Calculate initial liquidity from the base token amount (floor division)
            let calculatedLiquidity: bigint;

            if (pool.currentTick < tickLower) {
                // Below range - only token0 needed
                calculatedLiquidity = getLiquidityFromAmount0(sqrtPriceLower, sqrtPriceUpper, token0Amount, false);
            } else if (pool.currentTick >= tickUpper) {
                // Above range - only token1 needed
                calculatedLiquidity = getLiquidityFromAmount1(sqrtPriceLower, sqrtPriceUpper, token1Amount, false);
            } else {
                // In range - calculate from base token only
                if (positionCalculation.isQuoteToken0) {
                    // Base is token1, calculate L from token1
                    calculatedLiquidity = getLiquidityFromAmount1(sqrtPriceLower, sqrtPriceCurrent, token1Amount, false);
                } else {
                    // Base is token0, calculate L from token0
                    calculatedLiquidity = getLiquidityFromAmount0(sqrtPriceCurrent, sqrtPriceUpper, token0Amount, false);
                }
            }

            if (calculatedLiquidity === 0n) return;

            // Iteratively decrease liquidity until the base amount fits within the entered amount
            let finalLiquidity = calculatedLiquidity;
            let iterations = 0;
            const maxIterations = 1000;

            while (iterations < maxIterations) {
                const amounts = getTokenAmountsFromLiquidity(
                    finalLiquidity,
                    pool.currentTick,
                    tickLower,
                    tickUpper,
                    false
                );

                const calculatedBaseAmount = positionCalculation.isQuoteToken0 ? amounts.token1Amount : amounts.token0Amount;

                // Check if base amount fits within budget
                if (calculatedBaseAmount <= baseAmountBigInt) {
                    break; // Found optimal liquidity
                }

                // Decrease liquidity and try again
                finalLiquidity = finalLiquidity - 1n;
                iterations++;

                if (finalLiquidity === 0n) break;
            }

            // Get final token amounts with adjusted liquidity
            const { token0Amount: finalToken0, token1Amount: finalToken1 } = getTokenAmountsFromLiquidity(
                finalLiquidity,
                pool.currentTick,
                tickLower,
                tickUpper,
                false
            );

            // Extract quote amount
            const calculatedQuoteAmount = positionCalculation.isQuoteToken0 ? finalToken0 : finalToken1;
            const calculatedBaseAmount = positionCalculation.isQuoteToken0 ? finalToken1 : finalToken0;

            // Final verification: ensure base amount still within budget after all calculations
            if (calculatedBaseAmount > baseAmountBigInt && finalLiquidity > 0n) {
                // Still over budget, need to reduce further
                console.warn("Final verification failed, reducing liquidity further");
                finalLiquidity = finalLiquidity - 1n;
                const verifiedAmounts = getTokenAmountsFromLiquidity(
                    finalLiquidity,
                    pool.currentTick,
                    tickLower,
                    tickUpper,
                    false
                );
                const verifiedQuoteAmount = positionCalculation.isQuoteToken0 ? verifiedAmounts.token0Amount : verifiedAmounts.token1Amount;
                const quoteAmountString = formatCompactValue(verifiedQuoteAmount, quoteToken.decimals);
                setQuoteAmount(quoteAmountString);
                setQuoteAmountBigInt(verifiedQuoteAmount);
            } else {
                const quoteAmountString = formatCompactValue(calculatedQuoteAmount, quoteToken.decimals);
                setQuoteAmount(quoteAmountString);
                setQuoteAmountBigInt(calculatedQuoteAmount);
            }
        } catch (error) {
            console.error("Error calculating matching quote amount:", error);
        }
    }, [baseAmountBigInt, pool.currentTick, pool.sqrtPriceX96, tickLower, tickUpper, positionCalculation.isQuoteToken0, baseToken.decimals, quoteToken.decimals]);

    // Handle "Match Quote" - calculate required base amount from current quote amount
    // Strategy: Use ALL the quote amount entered, calculate liquidity from it, then find matching base amount
    const handleMatchQuote = useCallback(() => {
        if (quoteAmountBigInt === 0n || pool.currentTick === null || !pool.sqrtPriceX96) {
            return;
        }

        try {
            const sqrtPriceCurrent = BigInt(pool.sqrtPriceX96);
            const sqrtPriceLower = BigInt(TickMath.getSqrtRatioAtTick(tickLower).toString());
            const sqrtPriceUpper = BigInt(TickMath.getSqrtRatioAtTick(tickUpper).toString());

            // Determine which token is which in the pool
            const token0Amount = positionCalculation.isQuoteToken0 ? quoteAmountBigInt : 0n;
            const token1Amount = positionCalculation.isQuoteToken0 ? 0n : quoteAmountBigInt;

            // Calculate initial liquidity from the quote token amount (floor division)
            let calculatedLiquidity: bigint;

            if (pool.currentTick < tickLower) {
                // Below range - only token0 needed
                calculatedLiquidity = getLiquidityFromAmount0(sqrtPriceLower, sqrtPriceUpper, token0Amount, false);
            } else if (pool.currentTick >= tickUpper) {
                // Above range - only token1 needed
                calculatedLiquidity = getLiquidityFromAmount1(sqrtPriceLower, sqrtPriceUpper, token1Amount, false);
            } else {
                // In range - calculate from quote token only
                if (positionCalculation.isQuoteToken0) {
                    // Quote is token0, calculate L from token0
                    calculatedLiquidity = getLiquidityFromAmount0(sqrtPriceCurrent, sqrtPriceUpper, token0Amount, false);
                } else {
                    // Quote is token1, calculate L from token1
                    calculatedLiquidity = getLiquidityFromAmount1(sqrtPriceLower, sqrtPriceCurrent, token1Amount, false);
                }
            }

            if (calculatedLiquidity === 0n) return;

            // Iteratively decrease liquidity until the quote amount fits within the entered amount
            let finalLiquidity = calculatedLiquidity;
            let iterations = 0;
            const maxIterations = 100;

            while (iterations < maxIterations) {
                const amounts = getTokenAmountsFromLiquidity(
                    finalLiquidity,
                    pool.currentTick,
                    tickLower,
                    tickUpper,
                    false
                );

                const calculatedQuoteAmount = positionCalculation.isQuoteToken0 ? amounts.token0Amount : amounts.token1Amount;

                // Check if quote amount fits within budget
                if (calculatedQuoteAmount <= quoteAmountBigInt) {
                    break; // Found optimal liquidity
                }

                // Decrease liquidity and try again
                finalLiquidity = finalLiquidity - 1n;
                iterations++;

                if (finalLiquidity === 0n) break;
            }

            // Get final token amounts using the adjusted liquidity
            const { token0Amount: reqToken0, token1Amount: reqToken1 } = getTokenAmountsFromLiquidity(
                finalLiquidity,
                pool.currentTick,
                tickLower,
                tickUpper,
                false
            );

            // Extract base amount
            const calculatedBaseAmount = positionCalculation.isQuoteToken0 ? reqToken1 : reqToken0;
            const baseAmountString = formatCompactValue(calculatedBaseAmount, baseToken.decimals);
            setBaseAmount(baseAmountString);
            setBaseAmountBigInt(calculatedBaseAmount);
        } catch (error) {
            console.error("Error calculating matching base amount:", error);
        }
    }, [quoteAmountBigInt, pool.currentTick, pool.sqrtPriceX96, tickLower, tickUpper, positionCalculation.isQuoteToken0, baseToken.decimals, quoteToken.decimals]);

    // Auto-matching in "matched" mode
    useEffect(() => {
        if (mode !== "matched" || !isInitialized) return;
        if (lastChangedField !== "base") return; // Only match when user changed base

        // Use timeout to allow user typing to complete
        const timeoutId = setTimeout(() => {
            if (baseAmountBigInt > 0n) {
                handleMatchBase();
            }
        }, 500); // 500ms debounce

        return () => clearTimeout(timeoutId);
    }, [baseAmountBigInt, mode, isInitialized, lastChangedField]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (mode !== "matched" || !isInitialized) return;
        if (lastChangedField !== "quote") return; // Only match when user changed quote

        // Use timeout to allow user typing to complete
        const timeoutId = setTimeout(() => {
            if (quoteAmountBigInt > 0n) {
                handleMatchQuote();
            }
        }, 500); // 500ms debounce

        return () => clearTimeout(timeoutId);
    }, [quoteAmountBigInt, mode, isInitialized, lastChangedField]); // eslint-disable-line react-hooks/exhaustive-deps

    // Calculate liquidity from user input and emit to parent
    useEffect(() => {
        // Only calculate and emit changes after component is initialized
        // This prevents clearing liquidity during initial load from URL
        if (!isInitialized) return;

        const inputLiquidity = positionCalculation.liquidity;

        console.log('[PositionSizeConfig] Input values:', {
            baseAmountBigInt: baseAmountBigInt.toString(),
            quoteAmountBigInt: quoteAmountBigInt.toString(),
            calculatedLiquidity: inputLiquidity.toString(),
        });

        // Only emit change if the calculated liquidity differs from current prop
        // This prevents infinite loops when the component re-renders due to prop updates
        if (inputLiquidity !== liquidity) {
            onLiquidityChange(inputLiquidity);
        }
    }, [
        positionCalculation.liquidity,
        onLiquidityChange,
        liquidity,
        isInitialized,
    ]);

    // Mode change handler
    const handleModeChange = useCallback((newMode: InputMode) => {
        setMode(newMode);
        setLastChangedField(null); // Reset on mode change to prevent unwanted matching

        // Don't clear amounts - let the user keep their inputs
        // The liquidity calculation will handle single-token inputs automatically
    }, []);

    // Refresh pool data handler
    const handleRefreshPool = useCallback(async () => {
        if (!onRefreshPool || isRefreshing) return;

        setIsRefreshing(true);
        try {
            await onRefreshPool();
        } catch (error) {
            console.error("Error refreshing pool data:", error);
        } finally {
            setIsRefreshing(false);
        }
    }, [onRefreshPool, isRefreshing]);

    // Calculate resulting token amounts for display from liquidity prop
    const displayAmounts = useMemo(() => {
        if (liquidity === 0n || pool.currentTick === null) {
            return { baseDisplay: "0", quoteDisplay: "0" };
        }

        try {
            const { token0Amount, token1Amount } = getTokenAmountsFromLiquidity(
                liquidity,
                pool.currentTick,
                tickLower,
                tickUpper
            );

            const baseTokenAmount = positionCalculation.isQuoteToken0 ? token1Amount : token0Amount;
            const quoteTokenAmount = positionCalculation.isQuoteToken0
                ? token0Amount
                : token1Amount;

            return {
                baseDisplay: formatCompactValue(
                    baseTokenAmount,
                    baseToken.decimals
                ),
                quoteDisplay: formatCompactValue(
                    quoteTokenAmount,
                    quoteToken.decimals
                ),
            };
        } catch (error) {
            console.error("Error calculating display amounts:", error);
            return { baseDisplay: "0", quoteDisplay: "0" };
        }
    }, [
        liquidity,
        pool.currentTick,
        tickLower,
        tickUpper,
        baseToken,
        quoteToken,
        positionCalculation.isQuoteToken0,
    ]);

    return (
        <div className="space-y-3">
            {/* Header with Position Size display */}
            <div className="flex items-center justify-between text-sm">
                <span className="text-slate-300 font-medium">
                    {label}
                </span>
                <div className="flex items-center gap-2">
                    {onRefreshPool && (
                        <button
                            onClick={handleRefreshPool}
                            disabled={isRefreshing}
                            className="p-1 hover:bg-slate-700 rounded transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Refresh pool price"
                        >
                            <RefreshCw className={`w-4 h-4 text-slate-400 ${isRefreshing ? 'animate-spin' : ''}`} />
                        </button>
                    )}
                    <span className="text-white font-medium">
                        {displayAmounts.baseDisplay} {baseToken.symbol} +{" "}
                        {displayAmounts.quoteDisplay} {quoteToken.symbol}
                    </span>
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="p-1 hover:bg-slate-700 rounded transition-colors cursor-pointer"
                    >
                        {isExpanded ? (
                            <PencilOff className="w-4 h-4 text-slate-400" />
                        ) : (
                            <PencilLine className="w-4 h-4 text-slate-400" />
                        )}
                    </button>
                </div>
            </div>

            {/* Collapsible content */}
            {isExpanded && (
                <div className="space-y-3 border-t border-slate-700 pt-3">
                    {/* Mode selector buttons */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="text-slate-300 text-sm font-medium">{t("positionWizard.positionConfig.yourInvestment")}</span>
                            <div className="flex items-center gap-1">
                            <button
                                onClick={() => handleModeChange("base")}
                                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                                    mode === "base"
                                        ? "bg-blue-600 text-white"
                                        : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                                }`}
                            >
                                {baseToken.symbol}
                            </button>
                            <button
                                onClick={() => handleModeChange("quote")}
                                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                                    mode === "quote"
                                        ? "bg-blue-600 text-white"
                                        : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                                }`}
                            >
                                {quoteToken.symbol}
                            </button>
                            <button
                                onClick={() => handleModeChange("matched")}
                                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                                    mode === "matched"
                                        ? "bg-blue-600 text-white"
                                        : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                                }`}
                            >
                                Matched
                            </button>
                            <button
                                onClick={() => handleModeChange("independent")}
                                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                                    mode === "independent"
                                        ? "bg-blue-600 text-white"
                                        : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                                }`}
                            >
                                Independent
                            </button>
                            </div>
                        </div>

                        {/* Connect wallet link */}
                        {!isConnected && (
                            <button
                                onClick={() => openConnectModal?.()}
                                className="text-blue-400 hover:text-blue-300 text-xs font-medium transition-colors cursor-pointer"
                            >
                                Connect Wallet
                            </button>
                        )}
                    </div>

                    {/* Conditional token inputs */}
                    <div className="space-y-3">
                        {/* Base token input - show in base, matched, or independent mode */}
                        {(mode === "base" || mode === "matched" || mode === "independent") && (
                            <TokenAmountInput
                                token={baseToken}
                                value={baseAmount}
                                onChange={handleBaseAmountChange}
                                chain={chain}
                                placeholder="0.0"
                                showMaxButton={true}
                            />
                        )}

                        {/* Quote token input - show in quote, matched, or independent mode */}
                        {(mode === "quote" || mode === "matched" || mode === "independent") && (
                            <TokenAmountInput
                                token={quoteToken}
                                value={quoteAmount}
                                onChange={handleQuoteAmountChange}
                                chain={chain}
                                placeholder="0.0"
                                showMaxButton={true}
                            />
                        )}
                    </div>

                    {/* Help text */}
                    <div className="text-xs text-slate-400">
                        {mode === "quote" &&
                            `Enter ${quoteToken.symbol} amount. ${baseToken.symbol} will be calculated automatically.`}
                        {mode === "base" &&
                            `Enter ${baseToken.symbol} amount. ${quoteToken.symbol} will be calculated automatically.`}
                        {mode === "matched" &&
                            `Enter either amount. The other will auto-match for balanced positions.`}
                        {mode === "independent" &&
                            `Enter both amounts independently for asymmetric positions.`}
                    </div>
                </div>
            )}
        </div>
    );
}
