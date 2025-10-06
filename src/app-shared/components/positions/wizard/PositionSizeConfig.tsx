"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { PencilLine, PencilOff, RefreshCw } from "lucide-react";
import { useAccount } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useTranslations } from "@/i18n/client";
import { TokenAmountInput } from "@/app-shared/components/common/TokenAmountInput";
import type { PoolData } from "@/hooks/api/usePool";
import type { SupportedChainsType } from "@/config/chains";
import { usePositionSizeCalculation } from "@/hooks/usePositionSizeCalculation";
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
    initialMode?: "quote" | "base" | "custom";
    chain?: SupportedChainsType;
    onRefreshPool?: () => Promise<any>;
    label?: string; // Custom label for the header (default: "Position Size:")
}

type InputMode = "quote" | "base" | "custom";

export function PositionSizeConfig({
    pool,
    baseToken,
    quoteToken,
    tickLower,
    tickUpper,
    liquidity,
    onLiquidityChange,
    initialMode = "custom",
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
        },
        []
    );

    // Handle quote token amount change
    const handleQuoteAmountChange = useCallback(
        (value: string, valueBigInt: bigint) => {
            setQuoteAmount(value);
            setQuoteAmountBigInt(valueBigInt);
        },
        []
    );

    // Calculate liquidity from user input and emit to parent
    useEffect(() => {
        // Only calculate and emit changes after component is initialized
        // This prevents clearing liquidity during initial load from URL
        if (!isInitialized) return;

        const inputLiquidity = positionCalculation.liquidity;

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

        // Clear amounts when switching modes to avoid confusion
        if (newMode !== "custom") {
            if (newMode === "quote") {
                setBaseAmount("0");
                setBaseAmountBigInt(0n);
            } else if (newMode === "base") {
                setQuoteAmount("0");
                setQuoteAmountBigInt(0n);
            }
        }
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
                                onClick={() => handleModeChange("custom")}
                                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                                    mode === "custom"
                                        ? "bg-blue-600 text-white"
                                        : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                                }`}
                            >
                                {baseToken.symbol}+{quoteToken.symbol}
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
                        {/* Base token input - show in base mode or custom mode */}
                        {(mode === "base" || mode === "custom") && (
                            <TokenAmountInput
                                token={baseToken}
                                value={baseAmount}
                                onChange={handleBaseAmountChange}
                                chain={chain}
                                placeholder="0.0"
                                showMaxButton={true}
                            />
                        )}

                        {/* Quote token input - show in quote mode or custom mode */}
                        {(mode === "quote" || mode === "custom") && (
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
                            `Enter total ${quoteToken.symbol} amount. ${baseToken.symbol} amount will be calculated automatically.`}
                        {mode === "base" &&
                            `Enter total ${baseToken.symbol} amount. ${quoteToken.symbol} amount will be calculated automatically.`}
                        {mode === "custom" &&
                            `Enter both token amounts independently for asymmetric positions.`}
                    </div>
                </div>
            )}
        </div>
    );
}
