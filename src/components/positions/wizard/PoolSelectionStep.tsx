"use client";

import { useTranslations } from "@/i18n/client";
import { Loader2, AlertCircle, Zap, ExternalLink } from "lucide-react";
import type { TokenPair, PoolOption } from "./types";
import { usePoolDiscovery, getRecommendedPool, formatPoolLiquidity, type PoolDiscoveryResult } from "@/hooks/api/usePoolDiscovery";
import type { SupportedChainsType } from "@/config/chains";
import { getExplorerAddressUrl } from "@/lib/utils/evm";

interface PoolSelectionStepProps {
    chain: SupportedChainsType;
    tokenPair: TokenPair;
    selectedPool: PoolOption | null;
    onPoolSelect: (pool: PoolOption) => void;
    onNext: () => void;
    onBack: () => void;
}

export function PoolSelectionStep({
    chain,
    tokenPair,
    selectedPool,
    onPoolSelect,
}: PoolSelectionStepProps) {
    const t = useTranslations();

    // Use pool discovery hook
    const {
        pools,
        availablePools,
        isLoading,
        isError,
        error,
    } = usePoolDiscovery({
        chain,
        tokenA: tokenPair.baseToken.address,
        tokenB: tokenPair.quoteToken.address,
    });

    // Get recommended pool
    const recommendedPool = getRecommendedPool(pools);

    // Convert PoolDiscoveryResult to PoolOption for selection
    const convertToPoolOption = (poolResult: PoolDiscoveryResult): PoolOption | null => {
        if (!poolResult.exists || !poolResult.pool) {
            return null;
        }

        return {
            pool: {
                chain: poolResult.pool.chain,
                poolAddress: poolResult.pool.poolAddress,
                protocol: poolResult.pool.protocol,
                token0Address: poolResult.pool.token0.address,
                token1Address: poolResult.pool.token1.address,
                fee: poolResult.pool.fee,
                tickSpacing: poolResult.pool.tickSpacing,
                currentTick: null,
                currentPrice: "0",
                sqrtPriceX96: "0",
                feeGrowthGlobal0X128: "0",
                feeGrowthGlobal1X128: "0",
                createdAt: new Date(),
                updatedAt: new Date(),
                token0: {
                    ...poolResult.pool.token0,
                    source: 'database',
                    chain: poolResult.pool.chain,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    logoUrl: null,
                    marketCap: null,
                    coinGeckoId: null,
                    lastEnrichedAt: null,
                    verified: true,
                },
                token1: {
                    ...poolResult.pool.token1,
                    source: 'database',
                    chain: poolResult.pool.chain,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    logoUrl: null,
                    marketCap: null,
                    coinGeckoId: null,
                    lastEnrichedAt: null,
                    verified: true,
                },
            },
            fee: poolResult.fee,
            feePercentage: poolResult.feePercentage,
            tickSpacing: poolResult.tickSpacing,
            liquidity: BigInt(poolResult.liquidity),
        };
    };

    const handlePoolSelect = (poolResult: PoolDiscoveryResult) => {
        const poolOption = convertToPoolOption(poolResult);
        if (poolOption) {
            onPoolSelect(poolOption);
        }
    };

    return (
        <div className="space-y-6">

            {/* Loading State */}
            {isLoading && (
                <div className="flex items-center justify-center py-12">
                    <div className="flex items-center gap-3 text-slate-400">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>{t("positionWizard.poolSelection.loading")}</span>
                    </div>
                </div>
            )}

            {/* Error State */}
            {isError && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                        <div>
                            <h5 className="text-red-400 font-medium">
                                {t("positionWizard.poolSelection.error")}
                            </h5>
                            <p className="text-red-200/80 text-sm mt-1">
                                {error || t("positionWizard.poolSelection.genericError")}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* No Pools Available */}
            {!isLoading && !isError && availablePools.length === 0 && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                        <div>
                            <h5 className="text-amber-400 font-medium">
                                {t("positionWizard.poolSelection.noPoolsTitle")}
                            </h5>
                            <p className="text-amber-200/80 text-sm mt-1">
                                {t("positionWizard.poolSelection.noPoolsDescription")}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Pool Options */}
            {!isLoading && !isError && availablePools.length > 0 && (
                <div className="space-y-4">
                    {availablePools.map((poolResult, index) => {
                        const isRecommended = recommendedPool?.poolAddress === poolResult.poolAddress;
                        const isSelected = selectedPool?.fee === poolResult.fee;

                        return (
                            <button
                                key={`${poolResult.poolAddress}-${index}`}
                                onClick={() => handlePoolSelect(poolResult)}
                                className={`w-full p-4 border-2 rounded-lg transition-all text-left ${
                                    isSelected
                                        ? "border-blue-500 bg-blue-500/10"
                                        : "border-slate-700 hover:border-slate-600 bg-slate-800/50"
                                }`}
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        {/* Token Pair with Logos */}
                                        <div className="flex items-center gap-1">
                                            <div className="relative flex items-center">
                                                {/* First token (base token) - on top */}
                                                <div className="relative z-10">
                                                    {poolResult.pool?.token0.logoUrl ? (
                                                        <img
                                                            src={poolResult.pool.token0.logoUrl}
                                                            alt={poolResult.pool.token0.symbol}
                                                            className="w-8 h-8 rounded-full border-2 border-slate-800 bg-slate-800"
                                                        />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-full border-2 border-slate-800 bg-slate-700 flex items-center justify-center text-sm font-bold text-slate-300">
                                                            {poolResult.pool?.token0.symbol.charAt(0) || '?'}
                                                        </div>
                                                    )}
                                                </div>
                                                {/* Second token (quote token) - underneath horizontally */}
                                                <div className="relative -ml-3 z-0">
                                                    {poolResult.pool?.token1.logoUrl ? (
                                                        <img
                                                            src={poolResult.pool.token1.logoUrl}
                                                            alt={poolResult.pool.token1.symbol}
                                                            className="w-8 h-8 rounded-full border-2 border-slate-800 bg-slate-800"
                                                        />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-full border-2 border-slate-800 bg-slate-700 flex items-center justify-center text-sm font-bold text-slate-300">
                                                            {poolResult.pool?.token1.symbol.charAt(0) || '?'}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="ml-2">
                                                <h4 className="text-lg font-semibold text-white">
                                                    {poolResult.pool ?
                                                        `${poolResult.pool.token0.symbol}/${poolResult.pool.token1.symbol}` :
                                                        `${tokenPair.baseToken.symbol}/${tokenPair.quoteToken.symbol}`
                                                    }
                                                </h4>
                                                <div className="flex items-center gap-2">
                                                    <div className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs font-medium">
                                                        {poolResult.feePercentage}
                                                    </div>
                                                    <span className="text-xs text-slate-400">
                                                        {t("positionWizard.poolSelection.feeTitle", {
                                                            fee: poolResult.feePercentage,
                                                        })}
                                                    </span>
                                                    {poolResult.pool && (
                                                        <div className="flex items-center gap-1 ml-2">
                                                            <span className="text-xs text-slate-500 font-mono">
                                                                {poolResult.poolAddress.slice(0, 6)}...{poolResult.poolAddress.slice(-4)}
                                                            </span>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    window.open(getExplorerAddressUrl(poolResult.poolAddress, chain), '_blank');
                                                                }}
                                                                className="text-slate-400 hover:text-slate-200 transition-colors p-0.5"
                                                                title="View on blockchain explorer"
                                                            >
                                                                <ExternalLink className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    {isRecommended && (
                                        <div className="flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs font-medium">
                                            <Zap className="w-3 h-3" />
                                            {t("positionWizard.poolSelection.recommended")}
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 gap-4 text-sm">
                                    <div>
                                        <p className="text-slate-400 mb-1">
                                            {t("positionWizard.poolSelection.liquidity")}
                                        </p>
                                        <p className="text-white font-medium">
                                            {formatPoolLiquidity(poolResult.liquidity)}
                                        </p>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Fee Tier Explanation */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
                <h4 className="text-white font-semibold mb-2">
                    {t("positionWizard.poolSelection.feeExplanation.title")}
                </h4>
                <div className="space-y-2 text-sm text-slate-300">
                    <p>
                        <span className="text-blue-400 font-medium">0.05%:</span>{" "}
                        {t("positionWizard.poolSelection.feeExplanation.low")}
                    </p>
                    <p>
                        <span className="text-green-400 font-medium">0.3%:</span>{" "}
                        {t("positionWizard.poolSelection.feeExplanation.medium")}
                    </p>
                    <p>
                        <span className="text-amber-400 font-medium">1.0%:</span>{" "}
                        {t("positionWizard.poolSelection.feeExplanation.high")}
                    </p>
                </div>
            </div>

            {/* All Fee Tiers Display */}
            {!isLoading && !isError && pools.length > 0 && (
                <div className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-4">
                    <h4 className="text-white font-semibold mb-3">
                        {t("positionWizard.poolSelection.allFeeTiers")}
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                        {pools.map((poolResult) => (
                            <div
                                key={poolResult.fee}
                                className={`p-2 rounded border text-center ${
                                    poolResult.exists
                                        ? "border-green-500/30 bg-green-500/10 text-green-400"
                                        : "border-slate-600 bg-slate-800/50 text-slate-400"
                                }`}
                            >
                                <div className="font-medium">{poolResult.feePercentage}</div>
                                <div className="text-xs mt-1">
                                    {poolResult.exists
                                        ? t("positionWizard.poolSelection.available")
                                        : t("positionWizard.poolSelection.notAvailable")
                                    }
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}