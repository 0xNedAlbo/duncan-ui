"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { ChevronDown } from "lucide-react";
import { useAccount } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { TokenAmountInput, convertToBigInt, formatFromBigInt } from "@/components/common/TokenAmountInput";
import type { PoolData } from "@/hooks/api/usePool";
import type { SupportedChainsType } from "@/config/chains";
import { calculateLiquidityFromTokenAmounts } from "@/lib/uniswap/liquidityMath";

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
    // eslint-disable-next-line no-unused-vars
    onLiquidityChange: (liquidity: bigint) => void;
    initialMode?: 'quote' | 'base' | 'custom';
    chain?: SupportedChainsType;
}

type InputMode = 'quote' | 'base' | 'custom';

export function PositionSizeConfig({
    pool,
    baseToken,
    quoteToken,
    tickLower,
    tickUpper,
    onLiquidityChange,
    initialMode = 'quote',
    chain,
}: PositionSizeConfigProps) {
    const { isConnected } = useAccount();
    const { openConnectModal } = useConnectModal();
    const [mode, setMode] = useState<InputMode>(initialMode);
    const [baseAmount, setBaseAmount] = useState<string>("");
    const [quoteAmount, setQuoteAmount] = useState<string>("");
    const [baseAmountBigInt, setBaseAmountBigInt] = useState<bigint>(0n);
    const [quoteAmountBigInt, setQuoteAmountBigInt] = useState<bigint>(0n);

    // Calculate liquidity from token amounts using proper Uniswap V3 math
    const calculateLiquidity = useCallback((
        baseAmountBigInt: bigint,
        quoteAmountBigInt: bigint
    ): bigint => {
        if (!pool.currentPrice || (baseAmountBigInt === 0n && quoteAmountBigInt === 0n)) {
            return 0n;
        }

        // For Uniswap V3, token0 is the lower address token, token1 is the higher address token
        // We need to determine which is which and pass amounts in the correct order
        const token0IsBase = pool.token0.address.toLowerCase() < pool.token1.address.toLowerCase();

        const amount0 = token0IsBase ? baseAmountBigInt : quoteAmountBigInt;
        const amount1 = token0IsBase ? quoteAmountBigInt : baseAmountBigInt;

        return calculateLiquidityFromTokenAmounts(
            pool.currentPrice,
            tickLower,
            tickUpper,
            amount0,
            amount1
        );
    }, [pool.currentPrice, pool.token0.address, pool.token1.address, tickLower, tickUpper]);

    // Auto-calculate complementary amount based on mode
    const updateComplementaryAmount = useCallback((
        mode: InputMode,
        inputAmount: bigint,
        isBaseInput: boolean
    ) => {
        if (mode === 'custom') return; // Don't auto-calculate in custom mode

        // TODO: Implement proper price-based conversion
        // This is a simplified placeholder
        const currentPrice = parseFloat(pool.currentPrice || "1");

        if (isBaseInput && inputAmount > 0n) {
            // Calculate quote amount from base amount
            const baseAsFloat = parseFloat(formatFromBigInt(inputAmount, baseToken.decimals));
            const quoteValue = baseAsFloat * currentPrice;
            const quoteBigInt = convertToBigInt(quoteValue.toString(), quoteToken.decimals);
            setQuoteAmount(quoteValue.toString());
            setQuoteAmountBigInt(quoteBigInt);
        } else if (!isBaseInput && inputAmount > 0n) {
            // Calculate base amount from quote amount
            const quoteAsFloat = parseFloat(formatFromBigInt(inputAmount, quoteToken.decimals));
            const baseValue = quoteAsFloat / currentPrice;
            const baseBigInt = convertToBigInt(baseValue.toString(), baseToken.decimals);
            setBaseAmount(baseValue.toString());
            setBaseAmountBigInt(baseBigInt);
        }
    }, [mode, pool.currentPrice, baseToken.decimals, quoteToken.decimals]);

    // Handle base token amount change
    const handleBaseAmountChange = useCallback((value: string, valueBigInt: bigint) => {
        setBaseAmount(value);
        setBaseAmountBigInt(valueBigInt);
        updateComplementaryAmount(mode, valueBigInt, true);
    }, [mode, updateComplementaryAmount]);

    // Handle quote token amount change
    const handleQuoteAmountChange = useCallback((value: string, valueBigInt: bigint) => {
        setQuoteAmount(value);
        setQuoteAmountBigInt(valueBigInt);
        updateComplementaryAmount(mode, valueBigInt, false);
    }, [mode, updateComplementaryAmount]);

    // Calculate and emit liquidity when amounts change
    useEffect(() => {
        const liquidity = calculateLiquidity(baseAmountBigInt, quoteAmountBigInt);
        onLiquidityChange(liquidity);
    }, [baseAmountBigInt, quoteAmountBigInt, calculateLiquidity, onLiquidityChange]);

    // Mode change handler
    const handleModeChange = useCallback((newMode: InputMode) => {
        setMode(newMode);

        // Clear amounts when switching modes to avoid confusion
        if (newMode !== 'custom') {
            if (newMode === 'quote') {
                setBaseAmount("");
                setBaseAmountBigInt(0n);
            } else if (newMode === 'base') {
                setQuoteAmount("");
                setQuoteAmountBigInt(0n);
            }
        }
    }, []);

    // Formatted liquidity for display
    const formattedLiquidity = useMemo(() => {
        const liquidity = calculateLiquidity(baseAmountBigInt, quoteAmountBigInt);
        if (liquidity === 0n) return "0";

        // Format large numbers with suffixes
        const liquidityFloat = parseFloat(liquidity.toString());
        if (liquidityFloat >= 1e9) {
            return `${(liquidityFloat / 1e9).toFixed(2)}B`;
        } else if (liquidityFloat >= 1e6) {
            return `${(liquidityFloat / 1e6).toFixed(2)}M`;
        } else if (liquidityFloat >= 1e3) {
            return `${(liquidityFloat / 1e3).toFixed(2)}K`;
        }
        return liquidityFloat.toFixed(0);
    }, [baseAmountBigInt, quoteAmountBigInt, calculateLiquidity]);

    return (
        <div className="space-y-3">
            {/* Header with Position Size display */}
            <div className="flex items-center justify-between text-sm">
                <span className="text-slate-300 font-medium">Position Size:</span>
                <div className="flex items-center gap-2">
                    <span className="text-white font-medium">0 {baseToken.symbol} + 0 {quoteToken.symbol}</span>
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                </div>
            </div>

            {/* Mode selector buttons */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => handleModeChange('base')}
                        className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                            mode === 'base'
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                    >
                        {baseToken.symbol}
                    </button>
                    <button
                        onClick={() => handleModeChange('quote')}
                        className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                            mode === 'quote'
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                    >
                        {quoteToken.symbol}
                    </button>
                    <button
                        onClick={() => handleModeChange('custom')}
                        className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                            mode === 'custom'
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                    >
                        {baseToken.symbol}+{quoteToken.symbol}
                    </button>
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
                {(mode === 'base' || mode === 'custom') && (
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
                {(mode === 'quote' || mode === 'custom') && (
                    <TokenAmountInput
                        token={quoteToken}
                        value={quoteAmount}
                        onChange={handleQuoteAmountChange}
                        chain={chain}
                        placeholder="0.0"
                        showMaxButton={true}
                    />
                )}

                {/* Liquidity display */}
                <div className="text-right">
                    <div className="text-xs text-slate-400">Liquidity</div>
                    <div className="text-sm font-mono text-white">
                        {formattedLiquidity}
                    </div>
                </div>
            </div>

            {/* Help text */}
            <div className="text-xs text-slate-400">
                {mode === 'quote' && `Enter total ${quoteToken.symbol} amount. ${baseToken.symbol} amount will be calculated automatically.`}
                {mode === 'base' && `Enter total ${baseToken.symbol} amount. ${quoteToken.symbol} amount will be calculated automatically.`}
                {mode === 'custom' && `Enter both token amounts independently for asymmetric positions.`}
            </div>
        </div>
    );
}