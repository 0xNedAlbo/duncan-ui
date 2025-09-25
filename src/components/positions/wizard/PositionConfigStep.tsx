"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Settings, AlertCircle, Loader2, ArrowLeft } from "lucide-react";
import type { SupportedChainsType } from "@/config/chains";
import { isValidChainSlug } from "@/config/chains";
import { usePool } from "@/hooks/api/usePool";
import { normalizeAddress } from "@/lib/utils/evm";
import { PositionSizeConfig } from "./PositionSizeConfig";

interface PositionConfigStepProps {
    // eslint-disable-next-line no-unused-vars
    onConfigSelect?: (isConfigured: boolean) => void;
}

export function PositionConfigStep(props: PositionConfigStepProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Get URL parameters and validate
    const chainParam = searchParams.get("chain") || "";
    const chain = chainParam as SupportedChainsType;
    const isValidChain = chainParam && isValidChainSlug(chainParam);

    const baseTokenParam = searchParams.get("baseToken");
    const quoteTokenParam = searchParams.get("quoteToken");
    const poolAddressParam = searchParams.get("poolAddress");
    const tickLowerParam = searchParams.get("tickLower");
    const tickUpperParam = searchParams.get("tickUpper");
    const liquidityParam = searchParams.get("liquidity");

    // Use pool hook to load and validate pool
    const {
        pool,
        isLoading: isPoolLoading,
        isError: isPoolError,
        error: poolError,
    } = usePool({
        chain: isValidChain ? chain : null,
        poolAddress: poolAddressParam,
        enabled: !!isValidChain && !!poolAddressParam,
    });

    // State for the core position parameters - initialize from URL or defaults
    const [tickLower, setTickLower] = useState<number>(
        tickLowerParam ? parseInt(tickLowerParam) : -60
    );
    const [tickUpper, setTickUpper] = useState<number>(
        tickUpperParam ? parseInt(tickUpperParam) : 60
    );
    const [liquidity, setLiquidity] = useState<string>(
        liquidityParam || "1000000000000000000"
    );

    // Sync local state with URL parameters when they change
    useEffect(() => {
        if (tickLowerParam !== null) {
            setTickLower(parseInt(tickLowerParam) || -60);
        }
        if (tickUpperParam !== null) {
            setTickUpper(parseInt(tickUpperParam) || 60);
        }
        if (liquidityParam !== null) {
            setLiquidity(liquidityParam || "1000000000000000000");
        }
    }, [tickLowerParam, tickUpperParam, liquidityParam]);

    // Handle navigation to previous steps if invalid parameters
    const goToChainSelection = useCallback(() => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("step", "1");
        params.delete("chain");
        params.delete("baseToken");
        params.delete("quoteToken");
        params.delete("poolAddress");
        params.delete("tickLower");
        params.delete("tickUpper");
        params.delete("liquidity");
        router.push(pathname + "?" + params.toString());
    }, [router, pathname, searchParams]);

    const goToTokenPairSelection = useCallback(() => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("step", "2");
        params.delete("baseToken");
        params.delete("quoteToken");
        params.delete("poolAddress");
        params.delete("tickLower");
        params.delete("tickUpper");
        params.delete("liquidity");
        router.push(pathname + "?" + params.toString());
    }, [router, pathname, searchParams]);

    const goToPoolSelection = useCallback(() => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("step", "3");
        params.delete("poolAddress");
        params.delete("tickLower");
        params.delete("tickUpper");
        params.delete("liquidity");
        router.push(pathname + "?" + params.toString());
    }, [router, pathname, searchParams]);

    // Update URL parameters when values change (but not during initial load)
    useEffect(() => {
        if (!isValidChain || !poolAddressParam) return;

        // Don't update URL if we're still loading from URL parameters
        const currentTickLower = tickLowerParam ? parseInt(tickLowerParam) : -60;
        const currentTickUpper = tickUpperParam ? parseInt(tickUpperParam) : 60;
        const currentLiquidity = liquidityParam || "1000000000000000000";

        // Only update URL if values have actually changed from what's in the URL
        if (
            tickLower !== currentTickLower ||
            tickUpper !== currentTickUpper ||
            liquidity !== currentLiquidity
        ) {
            const params = new URLSearchParams(searchParams.toString());
            params.set("tickLower", tickLower.toString());
            params.set("tickUpper", tickUpper.toString());
            params.set("liquidity", liquidity);
            router.replace(pathname + "?" + params.toString());
        }
    }, [tickLower, tickUpper, liquidity, isValidChain, poolAddressParam, tickLowerParam, tickUpperParam, liquidityParam, router, pathname, searchParams]);

    // Pool-token validation logic (order-agnostic) - memoized to prevent unnecessary recalculations
    const validation = useMemo(() => {
        // Check if pool is loaded successfully
        if (isPoolLoading) {
            return { isValid: false, hasValidPool: false, hasValidTokens: false, hasValidParams: false };
        }

        if (isPoolError || !pool) {
            return {
                isValid: false,
                hasValidPool: false,
                hasValidTokens: false,
                hasValidParams: false,
                error: poolError || "Pool could not be loaded"
            };
        }

        // Validate that both tokens exist in the pool (order-agnostic)
        if (!baseTokenParam || !quoteTokenParam) {
            return {
                isValid: false,
                hasValidPool: true,
                hasValidTokens: false,
                hasValidParams: false,
                error: "Base and quote tokens are required"
            };
        }

        const normalizedBaseToken = normalizeAddress(baseTokenParam);
        const normalizedQuoteToken = normalizeAddress(quoteTokenParam);
        const normalizedToken0 = normalizeAddress(pool.token0.address);
        const normalizedToken1 = normalizeAddress(pool.token1.address);

        const poolTokens = [normalizedToken0, normalizedToken1];
        const hasBaseToken = poolTokens.includes(normalizedBaseToken);
        const hasQuoteToken = poolTokens.includes(normalizedQuoteToken);
        const tokensValid = hasBaseToken && hasQuoteToken && normalizedBaseToken !== normalizedQuoteToken;

        if (!tokensValid) {
            return {
                isValid: false,
                hasValidPool: true,
                hasValidTokens: false,
                hasValidParams: false,
                error: "Selected tokens do not match the pool tokens"
            };
        }

        // Validate position parameters
        const liquidityBigInt = BigInt(liquidity || "0");
        const paramsValid = tickLower < tickUpper && liquidityBigInt > 0n;

        if (!paramsValid) {
            return {
                isValid: false,
                hasValidPool: true,
                hasValidTokens: true,
                hasValidParams: false,
                error: "Invalid position parameters: tick lower must be less than tick upper, and liquidity must be greater than 0"
            };
        }

        return {
            isValid: true,
            hasValidPool: true,
            hasValidTokens: true,
            hasValidParams: true
        };
    }, [
        isPoolLoading,
        isPoolError,
        pool,
        poolError,
        baseTokenParam,
        quoteTokenParam,
        tickLower,
        tickUpper,
        liquidity,
    ]);

    // Notify parent about configuration status
    useEffect(() => {
        props.onConfigSelect?.(validation.isValid);
    }, [validation.isValid, props]);


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
                                continue with position configuration.
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
                                continue with position configuration.
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

    if (!poolAddressParam) {
        return (
            <div className="space-y-6">
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                        <div>
                            <h5 className="text-red-400 font-medium">
                                Pool Selection Required
                            </h5>
                            <p className="text-red-200/80 text-sm mt-1">
                                Please select a pool to continue with position
                                configuration.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={goToPoolSelection}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Go to Pool Selection
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">

            {/* Loading State */}
            {isPoolLoading && (
                <div className="flex items-center justify-center py-12">
                    <div className="flex items-center gap-3 text-slate-400">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Loading pool data...</span>
                    </div>
                </div>
            )}

            {/* Pool Error */}
            {validation.error && !validation.hasValidPool && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                        <div>
                            <h5 className="text-red-400 font-medium">
                                Pool Loading Error
                            </h5>
                            <p className="text-red-200/80 text-sm mt-1">
                                {validation.error}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Token Validation Error */}
            {validation.error && validation.hasValidPool && !validation.hasValidTokens && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                        <div>
                            <h5 className="text-red-400 font-medium">
                                Token Validation Error
                            </h5>
                            <p className="text-red-200/80 text-sm mt-1">
                                {validation.error}
                            </p>
                        </div>
                    </div>
                </div>
            )}


            {/* Position Configuration Form */}
            {!isPoolLoading && validation.hasValidPool && validation.hasValidTokens && (
                <div className="max-w-md mx-auto">
                    <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-6">
                        <div className="flex items-center gap-2 mb-6">
                            <Settings className="w-5 h-5 text-blue-400" />
                            <h4 className="text-lg font-semibold text-white">
                                Position Parameters
                            </h4>
                        </div>

                        <div className="space-y-6">
                            {/* Price Range Configuration */}
                            <div className="space-y-4">
                                <h5 className="text-sm font-medium text-slate-300">Price Range</h5>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 mb-2">
                                            Lower Tick
                                        </label>
                                        <input
                                            type="number"
                                            value={tickLower}
                                            onChange={(e) => setTickLower(parseInt(e.target.value) || 0)}
                                            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="-60"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 mb-2">
                                            Upper Tick
                                        </label>
                                        <input
                                            type="number"
                                            value={tickUpper}
                                            onChange={(e) => setTickUpper(parseInt(e.target.value) || 0)}
                                            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="60"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Position Size Configuration */}
                            {pool && baseTokenParam && quoteTokenParam && (
                                <div>
                                    <PositionSizeConfig
                                        pool={pool}
                                        baseToken={{
                                            address: baseTokenParam,
                                            symbol: pool.token0.address.toLowerCase() === baseTokenParam.toLowerCase()
                                                ? pool.token0.symbol
                                                : pool.token1.symbol,
                                            decimals: pool.token0.address.toLowerCase() === baseTokenParam.toLowerCase()
                                                ? pool.token0.decimals
                                                : pool.token1.decimals,
                                            logoUrl: pool.token0.address.toLowerCase() === baseTokenParam.toLowerCase()
                                                ? pool.token0.logoUrl
                                                : pool.token1.logoUrl,
                                        }}
                                        quoteToken={{
                                            address: quoteTokenParam,
                                            symbol: pool.token0.address.toLowerCase() === quoteTokenParam.toLowerCase()
                                                ? pool.token0.symbol
                                                : pool.token1.symbol,
                                            decimals: pool.token0.address.toLowerCase() === quoteTokenParam.toLowerCase()
                                                ? pool.token0.decimals
                                                : pool.token1.decimals,
                                            logoUrl: pool.token0.address.toLowerCase() === quoteTokenParam.toLowerCase()
                                                ? pool.token0.logoUrl
                                                : pool.token1.logoUrl,
                                        }}
                                        tickLower={tickLower}
                                        tickUpper={tickUpper}
                                        onLiquidityChange={(newLiquidity) => {
                                            setLiquidity(newLiquidity.toString());
                                        }}
                                        chain={chain}
                                    />
                                </div>
                            )}

                            {/* Parameter validation error */}
                            {validation.error && validation.hasValidTokens && !validation.hasValidParams && (
                                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                                    <div className="flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                                        <p className="text-red-200/80 text-sm">
                                            {validation.error}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}