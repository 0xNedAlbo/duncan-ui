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
import { getTokenAmountsFromLiquidity } from "@/lib/utils/uniswap-v3/liquidity";
import { formatCompactValue } from "@/lib/utils/fraction-format";

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
    const [lastEditedField, setLastEditedField] = useState<"base" | "quote" | null>(null);

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
            setLastEditedField("base");
        },
        []
    );

    // Handle quote token amount change
    const handleQuoteAmountChange = useCallback(
        (value: string, valueBigInt: bigint) => {
            setQuoteAmount(value);
            setQuoteAmountBigInt(valueBigInt);
            setLastEditedField("quote");
        },
        []
    );


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
        baseAmountBigInt,
        quoteAmountBigInt,
        positionCalculation.liquidity,
        onLiquidityChange,
        liquidity,
        isInitialized,
    ]);

    // In matched mode, sync calculated amounts back to input fields
    useEffect(() => {
        if (!isInitialized || mode !== "matched") return;
        if (positionCalculation.liquidity === 0n) return;
        if (!lastEditedField) return; // Only sync when user has edited a field

        // Get the calculated token amounts from the hook
        const calculatedBaseAmount = positionCalculation.isQuoteToken0
            ? positionCalculation.token1Amount
            : positionCalculation.token0Amount;
        const calculatedQuoteAmount = positionCalculation.isQuoteToken0
            ? positionCalculation.token0Amount
            : positionCalculation.token1Amount;

        // Update quote field if user edited base (quote should reflect calculation)
        if (lastEditedField === "base" && calculatedQuoteAmount !== quoteAmountBigInt) {
            const quoteAmountString = formatCompactValue(calculatedQuoteAmount, quoteToken.decimals);
            setQuoteAmount(quoteAmountString);
            setQuoteAmountBigInt(calculatedQuoteAmount);
        }

        // Update base field if user edited quote (base should reflect calculation)
        if (lastEditedField === "quote" && calculatedBaseAmount !== baseAmountBigInt) {
            const baseAmountString = formatCompactValue(calculatedBaseAmount, baseToken.decimals);
            setBaseAmount(baseAmountString);
            setBaseAmountBigInt(calculatedBaseAmount);
        }
    }, [
        mode,
        isInitialized,
        positionCalculation.liquidity,
        positionCalculation.token0Amount,
        positionCalculation.token1Amount,
        positionCalculation.isQuoteToken0,
        baseToken.decimals,
        quoteToken.decimals,
        baseAmountBigInt,
        quoteAmountBigInt,
        lastEditedField,
    ]);

    // Mode change handler
    const handleModeChange = useCallback((newMode: InputMode) => {
        setMode(newMode);

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

    // Calculate resulting token amounts for display from calculated values
    const displayAmounts = useMemo(() => {
        if (positionCalculation.liquidity === 0n) {
            return { baseDisplay: "0", quoteDisplay: "0" };
        }

        // Use calculated amounts directly from the hook for immediate updates
        const baseTokenAmount = positionCalculation.isQuoteToken0
            ? positionCalculation.token1Amount
            : positionCalculation.token0Amount;
        const quoteTokenAmount = positionCalculation.isQuoteToken0
            ? positionCalculation.token0Amount
            : positionCalculation.token1Amount;

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
    }, [
        positionCalculation.liquidity,
        positionCalculation.token0Amount,
        positionCalculation.token1Amount,
        positionCalculation.isQuoteToken0,
        baseToken.decimals,
        quoteToken.decimals,
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
