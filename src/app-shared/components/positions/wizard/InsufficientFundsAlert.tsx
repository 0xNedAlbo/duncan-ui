"use client";

import { useState } from "react";
import { formatUnits } from "viem";
import type { SupportedChainsType } from "@/config/chains";
import { formatCompactValue } from "@/lib/utils/fraction-format";
import { CowSwapWidget } from "@/app-shared/components/common/CowSwapWidget";
import type { InsufficientFundsInfo } from "@/app-shared/hooks/positions/usePositionValidation";

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

interface InsufficientFundsAlertProps {
    insufficientFunds: InsufficientFundsInfo;
    pool: PoolData;
    baseToken: string;
    quoteToken: string;
    isConnected: boolean;
    chain: SupportedChainsType;
}

/**
 * Displays insufficient funds warning with embedded CowSwap widget
 */
export function InsufficientFundsAlert({
    insufficientFunds,
    pool,
    baseToken,
    quoteToken,
    isConnected,
    chain,
}: InsufficientFundsAlertProps) {
    const [showCowSwapWidget, setShowCowSwapWidget] = useState(false);
    const [cowSwapBuyToken, setCowSwapBuyToken] = useState<{
        address: string;
        symbol: string;
        decimals: number;
        amount: string;
    } | undefined>();

    const handleCowSwapClick = (tokenType: 'base' | 'quote') => {
        if (!pool) return;

        // Clear previous buy token state first
        setCowSwapBuyToken(undefined);

        // Use setTimeout to ensure state is cleared before setting new value
        setTimeout(() => {
            if (tokenType === 'base' && insufficientFunds.needsBase) {
                const baseTokenData =
                    pool.token0.address.toLowerCase() === baseToken?.toLowerCase()
                        ? pool.token0
                        : pool.token1;

                setCowSwapBuyToken({
                    address: baseTokenData.address,
                    symbol: baseTokenData.symbol,
                    decimals: baseTokenData.decimals,
                    amount: formatUnits(insufficientFunds.missingBase, baseTokenData.decimals),
                });
            } else if (tokenType === 'quote' && insufficientFunds.needsQuote) {
                const quoteTokenData =
                    pool.token0.address.toLowerCase() === quoteToken?.toLowerCase()
                        ? pool.token0
                        : pool.token1;

                setCowSwapBuyToken({
                    address: quoteTokenData.address,
                    symbol: quoteTokenData.symbol,
                    decimals: quoteTokenData.decimals,
                    amount: formatUnits(insufficientFunds.missingQuote, quoteTokenData.decimals),
                });
            }

            setShowCowSwapWidget(true);
        }, 10);
    };

    return (
        <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700/50 rounded-lg p-4">
            <div className="text-slate-200 text-sm mb-4">
                {/* Case 1: Only base token insufficient */}
                {insufficientFunds.needsBase && !insufficientFunds.needsQuote && (
                    <span>
                        You need to{' '}
                        <span className="font-bold">
                            buy{' '}
                            {formatCompactValue(
                                insufficientFunds.missingBase,
                                pool.token0.address.toLowerCase() === baseToken.toLowerCase()
                                    ? pool.token0.decimals
                                    : pool.token1.decimals
                            )}{' '}
                            {pool.token0.address.toLowerCase() === baseToken.toLowerCase()
                                ? pool.token0.symbol
                                : pool.token1.symbol}
                        </span>{' '}
                        <button
                            onClick={() => handleCowSwapClick('base')}
                            disabled={!isConnected}
                            className="text-amber-400 hover:text-amber-300 underline decoration-dashed decoration-amber-400 hover:decoration-amber-300 underline-offset-2 transition-colors disabled:text-slate-400 disabled:decoration-slate-400 cursor-pointer disabled:cursor-not-allowed"
                        >
                            (swap here)
                        </button>{' '}
                        to match your planned position size.
                    </span>
                )}

                {/* Case 2: Only quote token insufficient */}
                {!insufficientFunds.needsBase && insufficientFunds.needsQuote && (
                    <span>
                        You need to{' '}
                        <span className="font-bold">
                            buy{' '}
                            {formatCompactValue(
                                insufficientFunds.missingQuote,
                                pool.token0.address.toLowerCase() === quoteToken.toLowerCase()
                                    ? pool.token0.decimals
                                    : pool.token1.decimals
                            )}{' '}
                            {pool.token0.address.toLowerCase() === quoteToken.toLowerCase()
                                ? pool.token0.symbol
                                : pool.token1.symbol}
                        </span>{' '}
                        <button
                            onClick={() => handleCowSwapClick('quote')}
                            disabled={!isConnected}
                            className="text-amber-400 hover:text-amber-300 underline decoration-dashed decoration-amber-400 hover:decoration-amber-300 underline-offset-2 transition-colors disabled:text-slate-400 disabled:decoration-slate-400 cursor-pointer disabled:cursor-not-allowed"
                        >
                            (swap here)
                        </button>{' '}
                        to match your planned position size.
                    </span>
                )}

                {/* Case 3: Both tokens insufficient */}
                {insufficientFunds.needsBase && insufficientFunds.needsQuote && (
                    <span>
                        You need to buy{' '}
                        <span className="font-bold">
                            {formatCompactValue(
                                insufficientFunds.missingBase,
                                pool.token0.address.toLowerCase() === baseToken.toLowerCase()
                                    ? pool.token0.decimals
                                    : pool.token1.decimals
                            )}{' '}
                            {pool.token0.address.toLowerCase() === baseToken.toLowerCase()
                                ? pool.token0.symbol
                                : pool.token1.symbol}
                        </span>{' '}
                        <button
                            onClick={() => handleCowSwapClick('base')}
                            disabled={!isConnected}
                            className="text-amber-400 hover:text-amber-300 underline decoration-dashed decoration-amber-400 hover:decoration-amber-300 underline-offset-2 transition-colors disabled:text-slate-400 disabled:decoration-slate-400 cursor-pointer disabled:cursor-not-allowed"
                        >
                            (swap here)
                        </button>{' '}
                        and{' '}
                        <span className="font-bold">
                            {formatCompactValue(
                                insufficientFunds.missingQuote,
                                pool.token0.address.toLowerCase() === quoteToken.toLowerCase()
                                    ? pool.token0.decimals
                                    : pool.token1.decimals
                            )}{' '}
                            {pool.token0.address.toLowerCase() === quoteToken.toLowerCase()
                                ? pool.token0.symbol
                                : pool.token1.symbol}
                        </span>{' '}
                        <button
                            onClick={() => handleCowSwapClick('quote')}
                            disabled={!isConnected}
                            className="text-amber-400 hover:text-amber-300 underline decoration-dashed decoration-amber-400 hover:decoration-amber-300 underline-offset-2 transition-colors disabled:text-slate-400 disabled:decoration-slate-400 cursor-pointer disabled:cursor-not-allowed"
                        >
                            (swap here)
                        </button>{' '}
                        to match your planned position size.
                    </span>
                )}
            </div>

            {/* CowSwap Widget */}
            {showCowSwapWidget && cowSwapBuyToken && (
                <div className="mt-4 border-t border-slate-700/50 pt-4">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-semibold text-white">
                            Buy {cowSwapBuyToken.symbol}
                        </h4>
                        <button
                            onClick={() => setShowCowSwapWidget(false)}
                            className="text-slate-400 hover:text-white transition-colors"
                        >
                            ✕
                        </button>
                    </div>
                    <CowSwapWidget buyToken={cowSwapBuyToken} chain={chain} />
                </div>
            )}
        </div>
    );
}
