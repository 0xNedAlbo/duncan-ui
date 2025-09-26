"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, Loader2, ArrowLeft } from "lucide-react";
import type { SupportedChainsType } from "@/config/chains";
import { isValidChainSlug } from "@/config/chains";
import { usePool } from "@/hooks/api/usePool";
import { isValidAddress, normalizeAddress } from "@/lib/utils/evm";
import { PositionSizeConfig } from "./PositionSizeConfig";
import { TickMath } from "@uniswap/v3-sdk";
import { tickToPrice, priceToTick } from "@/lib/utils/uniswap-v3/price";

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
    const [lowerPrice, setLowerPrice] = useState<string>("");
    const [upperPrice, setUpperPrice] = useState<string>("");

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
                // Note: convertTickToPriceSimple will be available after pool loads
                setLowerPrice(""); // Will be updated when pool loads
            } else {
                setTickLower(undefined);
            }
        }
        const tickUpperParam = searchParams.get("tickUpper");
        if (tickUpperParam) {
            const newTickUpper = parseInt(tickUpperParam);
            if (!isNaN(newTickUpper)) {
                setTickUpper(newTickUpper);
                // Note: convertTickToPriceSimple will be available after pool loads
                setUpperPrice(""); // Will be updated when pool loads
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

    /**
     * Convert tick to human-readable price
     * @param tick The tick value to convert
     * @returns Price as a number (quote tokens per base token)
     * @example For WETH/USDC: tick -195340 → 3000.5 (meaning 3000.5 USDC per 1 WETH)
     */
    const convertTickToPriceSimple = useCallback(
        (tick: number): number => {
            if (!baseToken || !quoteToken || !pool) return 0;

            try {
                // Get the correct decimals from pool data
                const baseTokenDecimals = pool.token0.address.toLowerCase() === baseToken.toLowerCase()
                    ? pool.token0.decimals
                    : pool.token1.decimals;

                const quoteTokenDecimals = pool.token0.address.toLowerCase() === quoteToken.toLowerCase()
                    ? pool.token0.decimals
                    : pool.token1.decimals;

                // tickToPrice returns price in quote token decimals
                const priceBigInt = tickToPrice(
                    tick,
                    baseToken,
                    quoteToken,
                    baseTokenDecimals
                );

                // Convert to human readable number using quote token decimals
                const divisor = 10n ** BigInt(quoteTokenDecimals);
                return Number(priceBigInt) / Number(divisor);
            } catch (error) {
                console.error("Error converting tick to price:", error);
                return 0;
            }
        },
        [baseToken, quoteToken, pool]
    );

    // Sync price inputs with tick values when pool loads
    useEffect(() => {
        if (pool && tickLower !== undefined && !lowerPrice) {
            const price = convertTickToPriceSimple(tickLower);
            if (price > 0) {
                setLowerPrice(price.toString());
            }
        }
        if (pool && tickUpper !== undefined && !upperPrice) {
            const price = convertTickToPriceSimple(tickUpper);
            if (price > 0) {
                setUpperPrice(price.toString());
            }
        }
    }, [pool, tickLower, tickUpper, lowerPrice, upperPrice, convertTickToPriceSimple]);

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

    /**
     * Get current pool price for display
     * @returns Current price as a number (quote tokens per base token)
     * @example For WETH/USDC pool: 3000.5 (meaning 3000.5 USDC per 1 WETH)
     */
    const currentPrice = useMemo(() => {
        if (!pool?.currentTick || !baseToken || !quoteToken) return 0;

        try {
            // Get the correct decimals from pool data
            const baseTokenDecimals = pool.token0.address.toLowerCase() === baseToken.toLowerCase()
                ? pool.token0.decimals
                : pool.token1.decimals;

            const quoteTokenDecimals = pool.token0.address.toLowerCase() === quoteToken.toLowerCase()
                ? pool.token0.decimals
                : pool.token1.decimals;

            // tickToPrice returns price in quote token decimals
            const priceBigInt = tickToPrice(
                pool.currentTick,
                baseToken,
                quoteToken,
                baseTokenDecimals
            );

            // Convert to human readable number using quote token decimals
            const divisor = 10n ** BigInt(quoteTokenDecimals);
            return Number(priceBigInt) / Number(divisor);
        } catch (error) {
            console.error("Error getting current price:", error);
            return 0;
        }
    }, [pool?.currentTick, baseToken, quoteToken, pool]);

    /**
     * Convert human-readable price to tick value
     * @param price Price as a number (quote tokens per base token)
     * @returns Tick value snapped to valid tick spacing
     * @example For WETH/USDC: price 3000.5 → tick -195340 (3000.5 USDC per 1 WETH)
     */
    const convertPriceToTick = useCallback(
        (price: number): number => {
            if (!baseToken || !quoteToken || !pool?.tickSpacing || price <= 0) {
                return TickMath.MIN_TICK;
            }

            try {
                // Get the correct decimals from pool data
                const baseTokenDecimals = pool.token0.address.toLowerCase() === baseToken.toLowerCase()
                    ? pool.token0.decimals
                    : pool.token1.decimals;

                const quoteTokenDecimals = pool.token0.address.toLowerCase() === quoteToken.toLowerCase()
                    ? pool.token0.decimals
                    : pool.token1.decimals;

                // priceToTick expects price in quote token decimals as BigInt
                const multiplier = 10n ** BigInt(quoteTokenDecimals);
                const priceBigInt = BigInt(Math.floor(price * Number(multiplier)));

                return priceToTick(
                    priceBigInt,
                    pool.tickSpacing,
                    baseToken,
                    quoteToken,
                    baseTokenDecimals
                );
            } catch (error) {
                console.error("Error converting price to tick:", error);
                return TickMath.MIN_TICK;
            }
        },
        [baseToken, quoteToken, pool?.tickSpacing, pool]
    );

    /**
     * Convert tick to human-readable price (same as convertTickToPriceSimple but used in different contexts)
     * @param tick The tick value to convert
     * @returns Price as a number (quote tokens per base token)
     * @example For WETH/USDC: tick -195340 → 3000.5 (meaning 3000.5 USDC per 1 WETH)
     */
    const convertTickToPrice = useCallback(
        (tick: number): number => {
            if (!baseToken || !quoteToken || !pool) return 0;

            try {
                // Get the correct decimals from pool data
                const baseTokenDecimals = pool.token0.address.toLowerCase() === baseToken.toLowerCase()
                    ? pool.token0.decimals
                    : pool.token1.decimals;

                const quoteTokenDecimals = pool.token0.address.toLowerCase() === quoteToken.toLowerCase()
                    ? pool.token0.decimals
                    : pool.token1.decimals;

                // tickToPrice returns price in quote token decimals
                const priceBigInt = tickToPrice(
                    tick,
                    baseToken,
                    quoteToken,
                    baseTokenDecimals
                );

                // Convert to human readable number using quote token decimals
                const divisor = 10n ** BigInt(quoteTokenDecimals);
                return Number(priceBigInt) / Number(divisor);
            } catch (error) {
                console.error("Error converting tick to price:", error);
                return 0;
            }
        },
        [baseToken, quoteToken, pool]
    );

    function onLiquidityChange(newLiquidity: bigint) {
        const params = new URLSearchParams(searchParams.toString());
        params.set("liquidity", newLiquidity.toString());
        router.replace(pathname + "?" + params.toString());
    }

    // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
    function onTickLowerChange(newTickLower: number) {
        const params = new URLSearchParams(searchParams.toString());
        params.set("tickLower", newTickLower.toString());
        router.replace(pathname + "?" + params.toString());
    }

    // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
    function onTickUpperChange(newTickUpper: number) {
        const params = new URLSearchParams(searchParams.toString());
        params.set("tickUpper", newTickUpper.toString());
        router.replace(pathname + "?" + params.toString());
    }

    function onLowerPriceChange(newLowerPrice: string) {
        setLowerPrice(newLowerPrice);
        // Don't convert to tick immediately - let user finish typing
    }

    function onUpperPriceChange(newUpperPrice: string) {
        setUpperPrice(newUpperPrice);
        // Don't convert to tick immediately - let user finish typing
    }

    function onLowerPriceBlur() {
        const price = parseFloat(lowerPrice);
        if (!isNaN(price) && price > 0) {
            const tick = convertPriceToTick(price);
            onTickLowerChange(tick);
        }
    }

    function onUpperPriceBlur() {
        const price = parseFloat(upperPrice);
        if (!isNaN(price) && price > 0) {
            const tick = convertPriceToTick(price);
            onTickUpperChange(tick);
        }
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

                        {/* Price Range Configuration */}
                        <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
                            <h5 className="text-sm font-medium text-slate-300 mb-4">
                                Price Range
                            </h5>

                            {/* Current Price Display */}
                            {currentPrice > 0 && (
                                <div className="mb-4 p-3 bg-slate-700/50 rounded-lg">
                                    <p className="text-xs text-slate-400 mb-1">Current Price</p>
                                    <p className="text-white font-mono">{currentPrice.toFixed(6)}</p>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-2">
                                        Lower Price
                                    </label>
                                    <input
                                        type="number"
                                        value={lowerPrice}
                                        onChange={(e) => onLowerPriceChange(e.target.value)}
                                        onBlur={onLowerPriceBlur}
                                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="0.0"
                                        step="any"
                                    />
                                    {tickLower !== undefined && (
                                        <p className="text-xs text-slate-500 mt-1">Tick: {tickLower}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-2">
                                        Upper Price
                                    </label>
                                    <input
                                        type="number"
                                        value={upperPrice}
                                        onChange={(e) => onUpperPriceChange(e.target.value)}
                                        onBlur={onUpperPriceBlur}
                                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="0.0"
                                        step="any"
                                    />
                                    {tickUpper !== undefined && (
                                        <p className="text-xs text-slate-500 mt-1">Tick: {tickUpper}</p>
                                    )}
                                </div>
                            </div>
                        </div>

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
