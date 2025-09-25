"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
    Loader2,
    AlertCircle,
    Zap,
    ExternalLink,
    ArrowLeft,
} from "lucide-react";
import { useTranslations } from "@/i18n/client";
import {
    usePoolDiscovery,
    getRecommendedPool,
    formatUSDValue,
    type PoolDiscoveryResult,
} from "@/hooks/api/usePoolDiscovery";
import type { SupportedChainsType } from "@/config/chains";
import { isValidChainSlug } from "@/config/chains";
import { getExplorerAddressUrl } from "@/lib/utils/evm";
import { formatFeePercentage } from "@/lib/contracts/uniswapV3Factory";

interface PoolSelectionStepProps {
    // eslint-disable-next-line no-unused-vars
    onPoolSelect?: (isPoolSelected: boolean) => void;
}

export function PoolSelectionStep(props: PoolSelectionStepProps) {
    const t = useTranslations();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Get URL parameters and validate
    const chainParam = searchParams.get("chain") || "";
    const chain = chainParam as SupportedChainsType;
    const isValidChain = chainParam && isValidChainSlug(chainParam);

    const baseTokenParam = searchParams.get("baseToken");
    const quoteTokenParam = searchParams.get("quoteToken");
    const selectedPoolParam = searchParams.get("poolAddress");

    // Handle navigation to previous steps if invalid parameters
    const goToChainSelection = useCallback(() => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("step", "1");
        params.delete("chain");
        params.delete("baseToken");
        params.delete("quoteToken");
        params.delete("poolAddress");
        router.push(pathname + "?" + params.toString());
    }, [router, pathname, searchParams]);

    const goToTokenPairSelection = useCallback(() => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("step", "2");
        params.delete("baseToken");
        params.delete("quoteToken");
        params.delete("poolAddress");
        router.push(pathname + "?" + params.toString());
    }, [router, pathname, searchParams]);

    // State for selected pool address
    const [selectedPoolAddress, setSelectedPoolAddress] = useState<
        string | null
    >(null);

    // Use pool discovery hook - only when we have valid chain and tokens
    const hasValidParams = Boolean(
        isValidChain && !!baseTokenParam && !!quoteTokenParam
    );
    const {
        data: pools,
        isLoading,
        isError,
        error,
    } = usePoolDiscovery({
        chain,
        tokenA: baseTokenParam,
        tokenB: quoteTokenParam,
        enabled: hasValidParams,
    });

    // Get recommended pool
    const recommendedPool = getRecommendedPool(pools || []);

    // Notify parent about pool selection state
    useEffect(() => {
        if (selectedPoolParam && pools) {
            // Check if the selected pool exists in the available pools
            const foundPool = pools.find(
                (p) => p.poolAddress === selectedPoolParam
            );
            if (foundPool) {
                setSelectedPoolAddress(selectedPoolParam);
                props.onPoolSelect?.(true);
            } else {
                setSelectedPoolAddress(null);
                props.onPoolSelect?.(false);
            }
        } else {
            setSelectedPoolAddress(null);
            props.onPoolSelect?.(false);
        }
    }, [selectedPoolParam, pools, props]);

    const handlePoolSelect = (poolResult: PoolDiscoveryResult) => {
        if (!poolResult.exists || !poolResult.pool) {
            return;
        }

        // Update URL parameter
        const params = new URLSearchParams(searchParams.toString());
        params.set("poolAddress", poolResult.poolAddress);
        router.push(pathname + "?" + params.toString());
    };

    // Show validation errors for missing parameters
    if (!isValidChain) {
        return (
            <div className="space-y-6">
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                        <div>
                            <h5 className="text-red-400 font-medium">
                                Invalid Chain Selected
                            </h5>
                            <p className="text-red-200/80 text-sm mt-1">
                                Please select a valid blockchain network to
                                continue with pool selection.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={goToChainSelection}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Go to Chain Selection
                    </button>
                </div>
            </div>
        );
    }

    if (!baseTokenParam || !quoteTokenParam) {
        return (
            <div className="space-y-6">
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                        <div>
                            <h5 className="text-red-400 font-medium">
                                Token Pair Required
                            </h5>
                            <p className="text-red-200/80 text-sm mt-1">
                                Please select both base and quote tokens to
                                continue with pool selection.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={goToTokenPairSelection}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Go to Token Pair Selection
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <p className="text-slate-300">
                {t("positionWizard.poolSelection.description")}
            </p>

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
                                {error ||
                                    t(
                                        "positionWizard.poolSelection.genericError"
                                    )}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* No Pools Available */}
            {!isLoading && !isError && (!pools || pools.length === 0) && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                        <div>
                            <h5 className="text-amber-400 font-medium">
                                {t("positionWizard.poolSelection.noPoolsTitle")}
                            </h5>
                            <p className="text-amber-200/80 text-sm mt-1">
                                {t(
                                    "positionWizard.poolSelection.noPoolsDescription"
                                )}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Pool Options */}
            {!isLoading && !isError && pools && pools.length > 0 && (
                <div className="space-y-4">
                    {pools.map((poolResult, index) => {
                        const isRecommended =
                            recommendedPool?.poolAddress ===
                            poolResult.poolAddress;
                        const isSelected =
                            selectedPoolAddress === poolResult.poolAddress;

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
                                                    {poolResult.pool?.token0
                                                        .logoUrl ? (
                                                        <img
                                                            src={
                                                                poolResult.pool
                                                                    .token0
                                                                    .logoUrl
                                                            }
                                                            alt={
                                                                poolResult.pool
                                                                    .token0
                                                                    .symbol
                                                            }
                                                            className="w-8 h-8 rounded-full border-2 border-slate-800 bg-slate-800"
                                                        />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-full border-2 border-slate-800 bg-slate-700 flex items-center justify-center text-sm font-bold text-slate-300">
                                                            {poolResult.pool?.token0.symbol.charAt(
                                                                0
                                                            ) || "?"}
                                                        </div>
                                                    )}
                                                </div>
                                                {/* Second token (quote token) - underneath horizontally */}
                                                <div className="relative -ml-3 z-0">
                                                    {poolResult.pool?.token1
                                                        .logoUrl ? (
                                                        <img
                                                            src={
                                                                poolResult.pool
                                                                    .token1
                                                                    .logoUrl
                                                            }
                                                            alt={
                                                                poolResult.pool
                                                                    .token1
                                                                    .symbol
                                                            }
                                                            className="w-8 h-8 rounded-full border-2 border-slate-800 bg-slate-800"
                                                        />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-full border-2 border-slate-800 bg-slate-700 flex items-center justify-center text-sm font-bold text-slate-300">
                                                            {poolResult.pool?.token1.symbol.charAt(
                                                                0
                                                            ) || "?"}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="ml-2">
                                                <h4 className="text-lg font-semibold text-white">
                                                    {poolResult.pool
                                                        ? `${poolResult.pool.token0.symbol}/${poolResult.pool.token1.symbol}`
                                                        : "Pool Loading..."}
                                                </h4>
                                                <div className="flex items-center gap-2">
                                                    <div className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs font-medium">
                                                        {formatFeePercentage(
                                                            poolResult.fee
                                                        )}
                                                    </div>
                                                    <span className="text-xs text-slate-400">
                                                        {t(
                                                            "positionWizard.poolSelection.feeTitle",
                                                            {
                                                                fee: formatFeePercentage(
                                                                    poolResult.fee
                                                                ),
                                                            }
                                                        )}
                                                    </span>
                                                    {poolResult.pool && (
                                                        <div className="flex items-center gap-1 ml-2">
                                                            <span className="text-xs text-slate-500 font-mono">
                                                                {poolResult.poolAddress.slice(
                                                                    0,
                                                                    6
                                                                )}
                                                                ...
                                                                {poolResult.poolAddress.slice(
                                                                    -4
                                                                )}
                                                            </span>
                                                            <span
                                                                onClick={(
                                                                    e
                                                                ) => {
                                                                    e.stopPropagation();
                                                                    window.open(
                                                                        getExplorerAddressUrl(
                                                                            poolResult.poolAddress,
                                                                            chain
                                                                        ),
                                                                        "_blank"
                                                                    );
                                                                }}
                                                                className="text-slate-400 hover:text-slate-200 transition-colors p-0.5 cursor-pointer inline-flex items-center justify-center"
                                                                title="View on blockchain explorer"
                                                                role="button"
                                                                tabIndex={0}
                                                                onKeyDown={(
                                                                    e
                                                                ) => {
                                                                    if (
                                                                        e.key ===
                                                                            "Enter" ||
                                                                        e.key ===
                                                                            " "
                                                                    ) {
                                                                        e.preventDefault();
                                                                        e.stopPropagation();
                                                                        window.open(
                                                                            getExplorerAddressUrl(
                                                                                poolResult.poolAddress,
                                                                                chain
                                                                            ),
                                                                            "_blank"
                                                                        );
                                                                    }
                                                                }}
                                                            >
                                                                <ExternalLink className="w-3 h-3" />
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    {isRecommended && (
                                        <div className="flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs font-medium">
                                            <Zap className="w-3 h-3" />
                                            {t(
                                                "positionWizard.poolSelection.recommended"
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-3 gap-4 text-sm">
                                    <div>
                                        <p className="text-slate-400 mb-1">
                                            {t(
                                                "positionWizard.poolSelection.tvl"
                                            )}
                                        </p>
                                        <p className="text-white font-medium">
                                            {poolResult.tvlUSD
                                                ? formatUSDValue(
                                                      poolResult.tvlUSD
                                                  )
                                                : "N/A"}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-slate-400 mb-1">
                                            Volume 24h
                                        </p>
                                        <p className="text-white font-medium">
                                            {poolResult.volumeUSD
                                                ? formatUSDValue(
                                                      poolResult.volumeUSD
                                                  )
                                                : "N/A"}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-slate-400 mb-1">
                                            Fees 24h
                                        </p>
                                        <p className="text-white font-medium">
                                            {poolResult.feesUSD
                                                ? formatUSDValue(
                                                      poolResult.feesUSD
                                                  )
                                                : "N/A"}
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
                        <span className="text-blue-400 font-medium">
                            0.05%:
                        </span>{" "}
                        {t("positionWizard.poolSelection.feeExplanation.low")}
                    </p>
                    <p>
                        <span className="text-green-400 font-medium">
                            0.3%:
                        </span>{" "}
                        {t(
                            "positionWizard.poolSelection.feeExplanation.medium"
                        )}
                    </p>
                    <p>
                        <span className="text-amber-400 font-medium">
                            1.0%:
                        </span>{" "}
                        {t("positionWizard.poolSelection.feeExplanation.high")}
                    </p>
                </div>
            </div>
        </div>
    );
}
