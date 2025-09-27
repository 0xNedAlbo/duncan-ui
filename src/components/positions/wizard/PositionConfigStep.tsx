"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, Loader2, ArrowLeft } from "lucide-react";
import type { SupportedChainsType } from "@/config/chains";
import { isValidChainSlug } from "@/config/chains";
import { usePool } from "@/hooks/api/usePool";
import { isValidAddress, normalizeAddress } from "@/lib/utils/evm";
import { PositionSizeConfig } from "./PositionSizeConfig";
import { PositionAprPreview } from "./PositionAprPreview";
import { PositionRangeConfig } from "./PositionRangeConfig";
import { TickMath } from "@uniswap/v3-sdk";

interface PositionConfigStepProps {
    // eslint-disable-next-line no-unused-vars
    onConfigSelect?: (isConfigured: boolean) => void;
}

export function PositionConfigStep(props: PositionConfigStepProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Get URL parameters and validate

    const [liquidity, setLiquidity] = useState<bigint | undefined>(0n);
    const [tickLower, setTickLower] = useState<number | undefined>(
        TickMath.MIN_TICK
    );
    const [tickUpper, setTickUpper] = useState<number | undefined>(
        TickMath.MAX_TICK
    );
    const [chain, setChain] = useState<SupportedChainsType | undefined>();
    const [poolAddress, setPoolAddress] = useState<string | undefined>();
    const [baseToken, setBaseToken] = useState<string | undefined>();
    const [quoteToken, setQuoteToken] = useState<string | undefined>();

    useEffect(() => {
        const chainParam = searchParams.get("chain") || "";
        const isValidChain = chainParam && isValidChainSlug(chainParam);
        setChain(
            isValidChain ? (chainParam as SupportedChainsType) : undefined
        );
        const tickLowerParam = searchParams.get("tickLower");
        if (tickLowerParam) {
            const newTickLower = parseInt(tickLowerParam);
            if (!isNaN(newTickLower)) {
                setTickLower(newTickLower);
            } else {
                setTickLower(undefined);
            }
        }
        const tickUpperParam = searchParams.get("tickUpper");
        if (tickUpperParam) {
            const newTickUpper = parseInt(tickUpperParam);
            if (!isNaN(newTickUpper)) {
                setTickUpper(newTickUpper);
            } else {
                setTickUpper(undefined);
            }
        }
        const liquidityParam = searchParams.get("liquidity");
        if (liquidityParam) {
            try {
                setLiquidity(BigInt(liquidityParam));
            } catch {
                setLiquidity(undefined);
            }
        } else {
            setLiquidity(undefined);
        }
        const poolAddressParam = searchParams.get("poolAddress");
        if (poolAddressParam && isValidAddress(poolAddressParam)) {
            setPoolAddress(normalizeAddress(poolAddressParam));
        } else {
            setPoolAddress(undefined);
        }
        const baseTokenParam = searchParams.get("baseToken");
        if (baseTokenParam && isValidAddress(baseTokenParam)) {
            setBaseToken(normalizeAddress(baseTokenParam));
        } else {
            setBaseToken(undefined);
        }
        const quoteTokenParam = searchParams.get("quoteToken");
        if (quoteTokenParam && isValidAddress(quoteTokenParam)) {
            setQuoteToken(normalizeAddress(quoteTokenParam));
        } else {
            setQuoteToken(undefined);
        }
    }, [searchParams]);

    // Use pool hook to load and validate pool
    const {
        pool,
        isLoading: isPoolLoading,
        isError: isPoolError,
        error: poolError,
    } = usePool({
        chain,
        poolAddress,
        enabled: !!chain && !!poolAddress,
    });


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


    function onLiquidityChange(newLiquidity: bigint) {
        const params = new URLSearchParams(searchParams.toString());
        params.set("liquidity", newLiquidity.toString());
        router.replace(pathname + "?" + params.toString());
    }

    function onTickLowerChange(newTickLower: number) {
        const params = new URLSearchParams(searchParams.toString());
        params.set("tickLower", newTickLower.toString());
        router.replace(pathname + "?" + params.toString());
    }

    function onTickUpperChange(newTickUpper: number) {
        const params = new URLSearchParams(searchParams.toString());
        params.set("tickUpper", newTickUpper.toString());
        router.replace(pathname + "?" + params.toString());
    }


    // Pool-token validation logic (order-agnostic) - memoized to prevent unnecessary recalculations
    const validation = useMemo(() => {
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

        // Validate that both tokens exist in the pool (order-agnostic)
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
            tickLower < tickUpper &&
            liquidityBigInt > 0n;

        if (!paramsValid) {
            return {
                isValid: false,
                hasValidPool: true,
                hasValidTokens: true,
                hasValidParams: false,
                // No error message - this is expected when L=0 or invalid ticks
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

    // Notify parent about configuration status
    useEffect(() => {
        props.onConfigSelect?.(validation.isValid);
    }, [validation.isValid, props]);

    // Show validation errors for missing parameters
    if (!chain) {
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

    if (!baseToken || !quoteToken) {
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

    if (
        !poolAddress ||
        (!isPoolLoading && !validation.hasValidPool) ||
        (!isPoolLoading && !validation.hasValidTokens)
    ) {
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
            {validation.error &&
                validation.hasValidPool &&
                !validation.hasValidTokens && (
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
            {!isPoolLoading &&
                validation.hasValidPool &&
                validation.hasValidTokens && (
                    <div className="space-y-6">
                        {/* Position Size Configuration */}
                        {pool && baseToken && quoteToken && (
                            <div>
                                <PositionSizeConfig
                                    pool={pool}
                                    baseToken={{
                                        address: baseToken,
                                        symbol:
                                            pool.token0.address.toLowerCase() ===
                                            baseToken.toLowerCase()
                                                ? pool.token0.symbol
                                                : pool.token1.symbol,
                                        decimals:
                                            pool.token0.address.toLowerCase() ===
                                            baseToken.toLowerCase()
                                                ? pool.token0.decimals
                                                : pool.token1.decimals,
                                        logoUrl:
                                            pool.token0.address.toLowerCase() ===
                                            baseToken.toLowerCase()
                                                ? pool.token0.logoUrl
                                                : pool.token1.logoUrl,
                                    }}
                                    quoteToken={{
                                        address: quoteToken,
                                        symbol:
                                            pool.token0.address.toLowerCase() ===
                                            quoteToken.toLowerCase()
                                                ? pool.token0.symbol
                                                : pool.token1.symbol,
                                        decimals:
                                            pool.token0.address.toLowerCase() ===
                                            quoteToken.toLowerCase()
                                                ? pool.token0.decimals
                                                : pool.token1.decimals,
                                        logoUrl:
                                            pool.token0.address.toLowerCase() ===
                                            quoteToken.toLowerCase()
                                                ? pool.token0.logoUrl
                                                : pool.token1.logoUrl,
                                    }}
                                    tickLower={tickLower || TickMath.MIN_TICK}
                                    tickUpper={tickUpper || TickMath.MAX_TICK}
                                    liquidity={liquidity || 0n}
                                    onLiquidityChange={onLiquidityChange}
                                    chain={chain}
                                />
                            </div>
                        )}

                        {/* APR Preview */}
                        {pool && baseToken && quoteToken && (
                            <div>
                                <PositionAprPreview
                                    pool={pool}
                                    baseToken={{
                                        address: baseToken,
                                        symbol:
                                            pool.token0.address.toLowerCase() ===
                                            baseToken.toLowerCase()
                                                ? pool.token0.symbol
                                                : pool.token1.symbol,
                                        decimals:
                                            pool.token0.address.toLowerCase() ===
                                            baseToken.toLowerCase()
                                                ? pool.token0.decimals
                                                : pool.token1.decimals,
                                        logoUrl:
                                            pool.token0.address.toLowerCase() ===
                                            baseToken.toLowerCase()
                                                ? pool.token0.logoUrl
                                                : pool.token1.logoUrl,
                                    }}
                                    quoteToken={{
                                        address: quoteToken,
                                        symbol:
                                            pool.token0.address.toLowerCase() ===
                                            quoteToken.toLowerCase()
                                                ? pool.token0.symbol
                                                : pool.token1.symbol,
                                        decimals:
                                            pool.token0.address.toLowerCase() ===
                                            quoteToken.toLowerCase()
                                                ? pool.token0.decimals
                                                : pool.token1.decimals,
                                        logoUrl:
                                            pool.token0.address.toLowerCase() ===
                                            quoteToken.toLowerCase()
                                                ? pool.token0.logoUrl
                                                : pool.token1.logoUrl,
                                    }}
                                    liquidity={liquidity || 0n}
                                    tickLower={tickLower}
                                    tickUpper={tickUpper}
                                    chain={chain}
                                />
                            </div>
                        )}

                        {/* Price Range Configuration */}
                        {pool && baseToken && quoteToken && (
                            <div>
                                <PositionRangeConfig
                                    pool={pool}
                                    baseToken={{
                                        address: baseToken,
                                        symbol:
                                            pool.token0.address.toLowerCase() ===
                                            baseToken.toLowerCase()
                                                ? pool.token0.symbol
                                                : pool.token1.symbol,
                                        decimals:
                                            pool.token0.address.toLowerCase() ===
                                            baseToken.toLowerCase()
                                                ? pool.token0.decimals
                                                : pool.token1.decimals,
                                        logoUrl:
                                            pool.token0.address.toLowerCase() ===
                                            baseToken.toLowerCase()
                                                ? pool.token0.logoUrl
                                                : pool.token1.logoUrl,
                                    }}
                                    quoteToken={{
                                        address: quoteToken,
                                        symbol:
                                            pool.token0.address.toLowerCase() ===
                                            quoteToken.toLowerCase()
                                                ? pool.token0.symbol
                                                : pool.token1.symbol,
                                        decimals:
                                            pool.token0.address.toLowerCase() ===
                                            quoteToken.toLowerCase()
                                                ? pool.token0.decimals
                                                : pool.token1.decimals,
                                        logoUrl:
                                            pool.token0.address.toLowerCase() ===
                                            quoteToken.toLowerCase()
                                                ? pool.token0.logoUrl
                                                : pool.token1.logoUrl,
                                    }}
                                    tickLower={tickLower}
                                    tickUpper={tickUpper}
                                    onTickLowerChange={onTickLowerChange}
                                    onTickUpperChange={onTickUpperChange}
                                />
                            </div>
                        )}

                        {/* Parameter validation error */}
                        {validation.error &&
                            validation.hasValidTokens &&
                            !validation.hasValidParams && (
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
                )}
        </div>
    );
}
