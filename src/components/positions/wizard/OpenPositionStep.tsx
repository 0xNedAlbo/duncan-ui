"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, Loader2, ArrowLeft, Check, Circle, ExternalLink } from "lucide-react";
import { useAccount, useReadContract, useWatchContractEvent, useSwitchChain } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { erc20Abi, formatUnits, type Address } from "viem";
import { useTranslations } from "@/i18n/client";
import type { SupportedChainsType } from "@/config/chains";
import { isValidChainSlug, getChainConfig, getChainId } from "@/config/chains";
import { usePool } from "@/hooks/api/usePool";
import { isValidAddress, normalizeAddress } from "@/lib/utils/evm";
import { PositionSizeConfig } from "./PositionSizeConfig";
import { CowSwapWidget } from "@/components/common/CowSwapWidget";
import { formatCompactValue } from "@/lib/utils/fraction-format";
import { getTokenAmountsFromLiquidity } from "@/lib/utils/uniswap-v3/liquidity";
import { TickMath } from "@uniswap/v3-sdk";
import { useTokenApproval } from "@/hooks/useTokenApproval";

interface OpenPositionStepProps {
    // eslint-disable-next-line no-unused-vars
    onPositionCreated?: (isCreated: boolean) => void;
}

export function OpenPositionStep(props: OpenPositionStepProps) {
    const t = useTranslations();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { address: walletAddress, isConnected, chainId: connectedChainId } = useAccount();
    const { openConnectModal } = useConnectModal();
    const { switchChain, isPending: isSwitchingNetwork } = useSwitchChain();

    // URL parameter state
    const [liquidity, setLiquidity] = useState<bigint | undefined>(0n);
    const [tickLower, setTickLower] = useState<number>(NaN);
    const [tickUpper, setTickUpper] = useState<number>(NaN);
    const [chain, setChain] = useState<SupportedChainsType | undefined>();
    const [poolAddress, setPoolAddress] = useState<string | undefined>();
    const [baseToken, setBaseToken] = useState<string | undefined>();
    const [quoteToken, setQuoteToken] = useState<string | undefined>();

    // Position creation state
    const [positionStatus, setPositionStatus] = useState<'pending' | 'completed'>('pending');

    // CowSwap widget state
    const [showCowSwapWidget, setShowCowSwapWidget] = useState<boolean>(false);
    const [cowSwapBuyToken, setCowSwapBuyToken] = useState<{
        address: string;
        symbol: string;
        decimals: number;
        amount: string;
    } | undefined>();

    // Extract parameters from URL
    useEffect(() => {
        const chainParam = searchParams.get("chain") || "";
        const isValidChain = chainParam && isValidChainSlug(chainParam);
        setChain(isValidChain ? (chainParam as SupportedChainsType) : undefined);

        const tickLowerParam = parseInt(searchParams.get("tickLower") || "");
        setTickLower(tickLowerParam);

        const tickUpperParam = parseInt(searchParams.get("tickUpper") || "");
        setTickUpper(tickUpperParam);

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

    // Normalize wallet address for balance queries
    const normalizedWalletAddress = walletAddress ? normalizeAddress(walletAddress) : null;
    const normalizedBaseToken = baseToken ? normalizeAddress(baseToken) : null;
    const normalizedQuoteToken = quoteToken ? normalizeAddress(quoteToken) : null;

    // Check if wallet is connected to the wrong network
    const isWrongNetwork = isConnected && chain && connectedChainId !== getChainId(chain);
    const expectedChainName = chain ? getChainConfig(chain)?.shortName : undefined;

    // Fetch base token balance
    const {
        data: baseBalanceData,
        isLoading: baseBalanceLoading,
        refetch: refetchBaseBalance,
    } = useReadContract({
        address: normalizedBaseToken as `0x${string}`,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [normalizedWalletAddress as `0x${string}`],
        query: {
            enabled: isConnected && !!normalizedWalletAddress && !!normalizedBaseToken,
        },
        ...(chain && { chainId: getChainId(chain) }),
    });

    // Fetch quote token balance
    const {
        data: quoteBalanceData,
        isLoading: quoteBalanceLoading,
        refetch: refetchQuoteBalance,
    } = useReadContract({
        address: normalizedQuoteToken as `0x${string}`,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [normalizedWalletAddress as `0x${string}`],
        query: {
            enabled: isConnected && !!normalizedWalletAddress && !!normalizedQuoteToken,
        },
        ...(chain && { chainId: getChainId(chain) }),
    });

    // Subscribe to base token Transfer events to automatically update balance
    useWatchContractEvent({
        address: normalizedBaseToken as `0x${string}`,
        abi: erc20Abi,
        eventName: "Transfer",
        args: {
            from: normalizedWalletAddress as `0x${string}`,
        },
        onLogs: () => {
            refetchBaseBalance();
        },
        enabled: isConnected && !!normalizedWalletAddress && !!normalizedBaseToken,
        ...(chain && { chainId: getChainId(chain) }),
    });

    useWatchContractEvent({
        address: normalizedBaseToken as `0x${string}`,
        abi: erc20Abi,
        eventName: "Transfer",
        args: {
            to: normalizedWalletAddress as `0x${string}`,
        },
        onLogs: () => {
            refetchBaseBalance();
        },
        enabled: isConnected && !!normalizedWalletAddress && !!normalizedBaseToken,
        ...(chain && { chainId: getChainId(chain) }),
    });

    // Subscribe to quote token Transfer events to automatically update balance
    useWatchContractEvent({
        address: normalizedQuoteToken as `0x${string}`,
        abi: erc20Abi,
        eventName: "Transfer",
        args: {
            from: normalizedWalletAddress as `0x${string}`,
        },
        onLogs: () => {
            refetchQuoteBalance();
        },
        enabled: isConnected && !!normalizedWalletAddress && !!normalizedQuoteToken,
        ...(chain && { chainId: getChainId(chain) }),
    });

    useWatchContractEvent({
        address: normalizedQuoteToken as `0x${string}`,
        abi: erc20Abi,
        eventName: "Transfer",
        args: {
            to: normalizedWalletAddress as `0x${string}`,
        },
        onLogs: () => {
            refetchQuoteBalance();
        },
        enabled: isConnected && !!normalizedWalletAddress && !!normalizedQuoteToken,
        ...(chain && { chainId: getChainId(chain) }),
    });

    // Convert balance data to bigint values
    const baseBalance = baseBalanceData ? BigInt(baseBalanceData.toString()) : 0n;
    const quoteBalance = quoteBalanceData ? BigInt(quoteBalanceData.toString()) : 0n;

    // Calculate required token amounts from liquidity
    const requiredAmounts = useMemo(() => {
        if (!pool || !liquidity || liquidity === 0n || pool.currentTick === null || !baseToken || !quoteToken) {
            return { baseAmount: 0n, quoteAmount: 0n };
        }

        try {
            const { token0Amount, token1Amount } = getTokenAmountsFromLiquidity(
                liquidity,
                pool.currentTick,
                tickLower && !isNaN(tickLower) ? tickLower : TickMath.MIN_TICK,
                tickUpper && !isNaN(tickUpper) ? tickUpper : TickMath.MAX_TICK
            );

            // Determine which is base and which is quote
            const isQuoteToken0 = pool.token0.address.toLowerCase() === quoteToken.toLowerCase();
            const baseAmount = isQuoteToken0 ? token1Amount : token0Amount;
            const quoteAmount = isQuoteToken0 ? token0Amount : token1Amount;

            return { baseAmount, quoteAmount };
        } catch (error) {
            console.error("Error calculating required amounts from liquidity:", error);
            return { baseAmount: 0n, quoteAmount: 0n };
        }
    }, [pool, liquidity, tickLower, tickUpper, baseToken, quoteToken]);

    const requiredBaseAmount = requiredAmounts.baseAmount;
    const requiredQuoteAmount = requiredAmounts.quoteAmount;

    // Token approval hooks for base and quote tokens
    const baseApproval = useTokenApproval({
        tokenAddress: normalizedBaseToken as Address | null,
        ownerAddress: normalizedWalletAddress as Address | null,
        requiredAmount: requiredBaseAmount,
        chainId: chain ? getChainId(chain) : undefined,
        enabled: isConnected && !isWrongNetwork && !!normalizedBaseToken && !!normalizedWalletAddress && requiredBaseAmount > 0n,
    });

    const quoteApproval = useTokenApproval({
        tokenAddress: normalizedQuoteToken as Address | null,
        ownerAddress: normalizedWalletAddress as Address | null,
        requiredAmount: requiredQuoteAmount,
        chainId: chain ? getChainId(chain) : undefined,
        enabled: isConnected && !isWrongNetwork && !!normalizedQuoteToken && !!normalizedWalletAddress && requiredQuoteAmount > 0n,
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

    const goToPositionConfig = useCallback(() => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("step", "4");
        router.push(pathname + "?" + params.toString());
    }, [router, pathname, searchParams]);

    // Handle liquidity changes
    function onLiquidityChange(newLiquidity: bigint) {
        const params = new URLSearchParams(searchParams.toString());
        params.set("liquidity", newLiquidity.toString());
        router.replace(pathname + "?" + params.toString());
    }

    // Calculate insufficient funds
    const insufficientFunds = useMemo(() => {
        // Don't show insufficient funds info if not connected or still loading balances
        if (!isConnected || baseBalanceLoading || quoteBalanceLoading) return null;

        // Don't show if required amounts are not calculated yet
        if (requiredBaseAmount === 0n && requiredQuoteAmount === 0n) return null;

        const needsBase = baseBalance < requiredBaseAmount;
        const needsQuote = quoteBalance < requiredQuoteAmount;

        if (!needsBase && !needsQuote) return null;

        const missingBase = needsBase ? requiredBaseAmount - baseBalance : 0n;
        const missingQuote = needsQuote ? requiredQuoteAmount - quoteBalance : 0n;

        return {
            needsBase,
            needsQuote,
            missingBase,
            missingQuote
        };
    }, [isConnected, baseBalance, quoteBalance, requiredBaseAmount, requiredQuoteAmount, baseBalanceLoading, quoteBalanceLoading]);

    // Check if transaction steps should be enabled
    const canExecuteTransactions = useMemo(() => {
        // Must be connected
        if (!isConnected) return false;

        // Must be on correct network
        if (isWrongNetwork) return false;

        // Must have sufficient funds (no insufficient funds warning)
        if (insufficientFunds) return false;

        // Don't allow if still loading approval status
        if (baseApproval.isLoadingAllowance || quoteApproval.isLoadingAllowance) return false;

        return true;
    }, [isConnected, isWrongNetwork, insufficientFunds, baseApproval.isLoadingAllowance, quoteApproval.isLoadingAllowance]);

    // Pool-token validation logic
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

        // Validate that both tokens exist in the pool
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
            !isNaN(tickLower) &&
            !isNaN(tickUpper) &&
            tickLower < tickUpper &&
            liquidityBigInt > 0n;

        if (!paramsValid) {
            return {
                isValid: false,
                hasValidPool: true,
                hasValidTokens: true,
                hasValidParams: false,
                error: "Position parameters are incomplete or invalid",
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

    // Notify parent about position status
    useEffect(() => {
        props.onPositionCreated?.(positionStatus === 'completed');
    }, [positionStatus, props]);

    // Transaction handlers
    const handleCowSwapClick = (tokenType: 'base' | 'quote') => {
        if (!pool || !insufficientFunds) return;

        // Clear previous buy token state first
        setCowSwapBuyToken(undefined);

        // Use setTimeout to ensure state is cleared before setting new value
        setTimeout(() => {
            if (tokenType === 'base' && insufficientFunds.needsBase) {
                const baseTokenData = pool.token0.address.toLowerCase() === baseToken?.toLowerCase()
                    ? pool.token0
                    : pool.token1;

                setCowSwapBuyToken({
                    address: baseTokenData.address,
                    symbol: baseTokenData.symbol,
                    decimals: baseTokenData.decimals,
                    amount: formatUnits(insufficientFunds.missingBase, baseTokenData.decimals)
                });
            } else if (tokenType === 'quote' && insufficientFunds.needsQuote) {
                const quoteTokenData = pool.token0.address.toLowerCase() === quoteToken?.toLowerCase()
                    ? pool.token0
                    : pool.token1;

                setCowSwapBuyToken({
                    address: quoteTokenData.address,
                    symbol: quoteTokenData.symbol,
                    decimals: quoteTokenData.decimals,
                    amount: formatUnits(insufficientFunds.missingQuote, quoteTokenData.decimals)
                });
            }

            setShowCowSwapWidget(true);
        }, 10);
    };

    const handleApproval = (token: 'base' | 'quote') => {
        if (token === 'base') {
            baseApproval.approve();
        } else {
            quoteApproval.approve();
        }
    };

    const handleOpenPosition = () => {
        // TODO: Trigger open position transaction
        console.log('Open position');
    };

    // Get block explorer URL for transaction
    const getExplorerUrl = (txHash: Address | undefined) => {
        if (!txHash || !chain) return null;
        const config = getChainConfig(chain);
        return `${config.explorer}/tx/${txHash}`;
    };

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
                                Please select a valid blockchain network to continue.
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
                                Please select both base and quote tokens to continue.
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
                                Please select a pool to continue.
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

    if (!isPoolLoading && !validation.hasValidParams) {
        return (
            <div className="space-y-6">
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                        <div>
                            <h5 className="text-red-400 font-medium">
                                Position Configuration Required
                            </h5>
                            <p className="text-red-200/80 text-sm mt-1">
                                Please complete the position configuration to continue.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={goToPositionConfig}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Go to Position Configuration
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

            {/* Main Content */}
            {!isPoolLoading && validation.hasValidPool && validation.hasValidTokens && validation.hasValidParams && pool && baseToken && quoteToken && (
                <div className="space-y-6">
                    {/* Position Size Configuration */}
                    <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700/50 rounded-lg p-4">
                        <PositionSizeConfig
                            pool={pool}
                            baseToken={{
                                address: baseToken,
                                symbol: pool.token0.address.toLowerCase() === baseToken.toLowerCase()
                                    ? pool.token0.symbol
                                    : pool.token1.symbol,
                                decimals: pool.token0.address.toLowerCase() === baseToken.toLowerCase()
                                    ? pool.token0.decimals
                                    : pool.token1.decimals,
                                logoUrl: pool.token0.address.toLowerCase() === baseToken.toLowerCase()
                                    ? pool.token0.logoUrl
                                    : pool.token1.logoUrl,
                            }}
                            quoteToken={{
                                address: quoteToken,
                                symbol: pool.token0.address.toLowerCase() === quoteToken.toLowerCase()
                                    ? pool.token0.symbol
                                    : pool.token1.symbol,
                                decimals: pool.token0.address.toLowerCase() === quoteToken.toLowerCase()
                                    ? pool.token0.decimals
                                    : pool.token1.decimals,
                                logoUrl: pool.token0.address.toLowerCase() === quoteToken.toLowerCase()
                                    ? pool.token0.logoUrl
                                    : pool.token1.logoUrl,
                            }}
                            tickLower={tickLower && !isNaN(tickLower) ? tickLower : TickMath.MIN_TICK}
                            tickUpper={tickUpper && !isNaN(tickUpper) ? tickUpper : TickMath.MAX_TICK}
                            liquidity={liquidity || 0n}
                            onLiquidityChange={onLiquidityChange}
                            chain={chain}
                        />
                    </div>

                    {/* Wallet Balance Section */}
                    <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700/50 rounded-lg p-4">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-300 font-medium">
                                {t("positionWizard.openPositionFinal.walletBalance")}
                            </span>
                            <div className="flex items-center gap-2">
                                {isConnected ? (
                                    <>
                                        {isWrongNetwork ? (
                                            <div className="flex items-center gap-2">
                                                <AlertCircle className="w-4 h-4 text-amber-400" />
                                                <span className="text-amber-400 text-sm font-medium">
                                                    {t("positionWizard.openPositionFinal.wrongNetwork")}
                                                </span>
                                                <button
                                                    onClick={() => chain && switchChain({ chainId: getChainId(chain) })}
                                                    disabled={isSwitchingNetwork}
                                                    className="text-amber-400 hover:text-amber-300 disabled:text-amber-400/50 underline decoration-dashed underline-offset-2 text-sm font-medium transition-colors flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
                                                >
                                                    {isSwitchingNetwork ? (
                                                        <>
                                                            <Loader2 className="w-3 h-3 animate-spin" />
                                                            {t("positionWizard.openPositionFinal.switching")}
                                                        </>
                                                    ) : (
                                                        t("positionWizard.openPositionFinal.switchToNetwork", { chainName: expectedChainName })
                                                    )}
                                                </button>
                                            </div>
                                        ) : baseBalanceLoading || quoteBalanceLoading ? (
                                            <div className="flex items-center gap-2">
                                                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                                                <span className="text-slate-400 text-sm">Loading...</span>
                                            </div>
                                        ) : (
                                            <span className="text-white font-medium">
                                                {formatCompactValue(baseBalance, pool.token0.address.toLowerCase() === baseToken.toLowerCase() ? pool.token0.decimals : pool.token1.decimals)} {pool.token0.address.toLowerCase() === baseToken.toLowerCase() ? pool.token0.symbol : pool.token1.symbol} +{" "}
                                                {formatCompactValue(quoteBalance, pool.token0.address.toLowerCase() === quoteToken.toLowerCase() ? pool.token0.decimals : pool.token1.decimals)} {pool.token0.address.toLowerCase() === quoteToken.toLowerCase() ? pool.token0.symbol : pool.token1.symbol}
                                            </span>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <span className="text-slate-400 font-medium">-- {pool.token0.address.toLowerCase() === baseToken.toLowerCase() ? pool.token0.symbol : pool.token1.symbol} + -- {pool.token0.address.toLowerCase() === quoteToken.toLowerCase() ? pool.token0.symbol : pool.token1.symbol}</span>
                                        <button
                                            onClick={() => openConnectModal?.()}
                                            className="text-blue-400 hover:text-blue-300 text-xs font-medium transition-colors cursor-pointer ml-2"
                                        >
                                            {t("positionWizard.openPositionFinal.connectWallet")}
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Balance Loading State */}
                    {isConnected && (baseBalanceLoading || quoteBalanceLoading) && requiredBaseAmount > 0n && requiredQuoteAmount > 0n && (
                        <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700/50 rounded-lg p-4">
                            <div className="flex items-center gap-3">
                                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                                <span className="text-slate-400 text-sm">Checking wallet balances...</span>
                            </div>
                        </div>
                    )}

                    {/* Insufficient Funds Information */}
                    {insufficientFunds && (
                        <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700/50 rounded-lg p-4">
                            <div className="text-slate-200 text-sm mb-4">
                                {/* Case 1: Only base token insufficient */}
                                {insufficientFunds.needsBase && !insufficientFunds.needsQuote && (
                                    <span>
                                        You need to{" "}
                                        <span className="font-bold">
                                            buy {formatCompactValue(insufficientFunds.missingBase, pool.token0.address.toLowerCase() === baseToken.toLowerCase() ? pool.token0.decimals : pool.token1.decimals)} {pool.token0.address.toLowerCase() === baseToken.toLowerCase() ? pool.token0.symbol : pool.token1.symbol}
                                        </span>
                                        {" "}
                                        <button
                                            onClick={() => handleCowSwapClick('base')}
                                            disabled={!isConnected}
                                            className="text-amber-400 hover:text-amber-300 underline decoration-dashed decoration-amber-400 hover:decoration-amber-300 underline-offset-2 transition-colors disabled:text-slate-400 disabled:decoration-slate-400 cursor-pointer disabled:cursor-not-allowed"
                                        >
                                            (swap here)
                                        </button>
                                        {" "}to match your planned position size.
                                    </span>
                                )}

                                {/* Case 2: Only quote token insufficient */}
                                {!insufficientFunds.needsBase && insufficientFunds.needsQuote && (
                                    <span>
                                        You need to{" "}
                                        <span className="font-bold">
                                            buy {formatCompactValue(insufficientFunds.missingQuote, pool.token0.address.toLowerCase() === quoteToken.toLowerCase() ? pool.token0.decimals : pool.token1.decimals)} {pool.token0.address.toLowerCase() === quoteToken.toLowerCase() ? pool.token0.symbol : pool.token1.symbol}
                                        </span>
                                        {" "}
                                        <button
                                            onClick={() => handleCowSwapClick('quote')}
                                            disabled={!isConnected}
                                            className="text-amber-400 hover:text-amber-300 underline decoration-dashed decoration-amber-400 hover:decoration-amber-300 underline-offset-2 transition-colors disabled:text-slate-400 disabled:decoration-slate-400 cursor-pointer disabled:cursor-not-allowed"
                                        >
                                            (swap here)
                                        </button>
                                        {" "}to match your planned position size.
                                    </span>
                                )}

                                {/* Case 3: Both tokens insufficient */}
                                {insufficientFunds.needsBase && insufficientFunds.needsQuote && (
                                    <span>
                                        You need to buy{" "}
                                        <span className="font-bold">
                                            {formatCompactValue(insufficientFunds.missingBase, pool.token0.address.toLowerCase() === baseToken.toLowerCase() ? pool.token0.decimals : pool.token1.decimals)} {pool.token0.address.toLowerCase() === baseToken.toLowerCase() ? pool.token0.symbol : pool.token1.symbol}
                                        </span>
                                        {" "}
                                        <button
                                            onClick={() => handleCowSwapClick('base')}
                                            disabled={!isConnected}
                                            className="text-amber-400 hover:text-amber-300 underline decoration-dashed decoration-amber-400 hover:decoration-amber-300 underline-offset-2 transition-colors disabled:text-slate-400 disabled:decoration-slate-400 cursor-pointer disabled:cursor-not-allowed"
                                        >
                                            (swap here)
                                        </button>
                                        {" "}and{" "}
                                        <span className="font-bold">
                                            {formatCompactValue(insufficientFunds.missingQuote, pool.token0.address.toLowerCase() === quoteToken.toLowerCase() ? pool.token0.decimals : pool.token1.decimals)} {pool.token0.address.toLowerCase() === quoteToken.toLowerCase() ? pool.token0.symbol : pool.token1.symbol}
                                        </span>
                                        {" "}
                                        <button
                                            onClick={() => handleCowSwapClick('quote')}
                                            disabled={!isConnected}
                                            className="text-amber-400 hover:text-amber-300 underline decoration-dashed decoration-amber-400 hover:decoration-amber-300 underline-offset-2 transition-colors disabled:text-slate-400 disabled:decoration-slate-400 cursor-pointer disabled:cursor-not-allowed"
                                        >
                                            (swap here)
                                        </button>
                                        {" "}to match your planned position size.
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
                                    <CowSwapWidget
                                        buyToken={cowSwapBuyToken}
                                        chain={chain}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Transaction Steps */}
                    <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700/50 rounded-lg p-4">
                        <h4 className="text-lg font-semibold text-white mb-4">{t("positionWizard.openPositionFinal.transactionSteps")}</h4>

                        <div className={`space-y-4 ${!canExecuteTransactions ? 'opacity-50' : ''}`}>
                            {/* Step 1: Base Token Approval */}
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-3">
                                    {baseApproval.isLoadingAllowance ? (
                                        <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
                                    ) : baseApproval.isApproved ? (
                                        <Check className="w-5 h-5 text-green-500" />
                                    ) : (
                                        <Circle className="w-5 h-5 text-slate-400" />
                                    )}
                                    <span className="text-white flex-1">
                                        {t("positionWizard.openPositionFinal.approveToken", {
                                            amount: formatCompactValue(requiredBaseAmount, pool.token0.address.toLowerCase() === baseToken.toLowerCase() ? pool.token0.decimals : pool.token1.decimals),
                                            symbol: pool.token0.address.toLowerCase() === baseToken.toLowerCase() ? pool.token0.symbol : pool.token1.symbol
                                        })}
                                    </span>
                                    {!baseApproval.isApproved && canExecuteTransactions && !baseApproval.isLoadingAllowance && (
                                        <button
                                            onClick={() => handleApproval('base')}
                                            disabled={baseApproval.isApproving || baseApproval.isWaitingForConfirmation}
                                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white text-sm rounded transition-colors flex items-center gap-2"
                                        >
                                            {(baseApproval.isApproving || baseApproval.isWaitingForConfirmation) && (
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                            )}
                                            {baseApproval.isWaitingForConfirmation ? 'Confirming...' : baseApproval.isApproving ? 'Approving...' : t("positionWizard.openPositionFinal.approve")}
                                        </button>
                                    )}
                                </div>
                                {baseApproval.approvalTxHash && (
                                    <a
                                        href={getExplorerUrl(baseApproval.approvalTxHash) || '#'}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 ml-8"
                                    >
                                        View transaction <ExternalLink className="w-3 h-3" />
                                    </a>
                                )}
                                {baseApproval.approvalError && (
                                    <div className="text-xs text-red-400 ml-8">
                                        Error: {baseApproval.approvalError.message}
                                    </div>
                                )}
                            </div>

                            {/* Step 2: Quote Token Approval */}
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-3">
                                    {quoteApproval.isLoadingAllowance ? (
                                        <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
                                    ) : quoteApproval.isApproved ? (
                                        <Check className="w-5 h-5 text-green-500" />
                                    ) : (
                                        <Circle className="w-5 h-5 text-slate-400" />
                                    )}
                                    <span className="text-white flex-1">
                                        {t("positionWizard.openPositionFinal.approveToken", {
                                            amount: formatCompactValue(requiredQuoteAmount, pool.token0.address.toLowerCase() === quoteToken.toLowerCase() ? pool.token0.decimals : pool.token1.decimals),
                                            symbol: pool.token0.address.toLowerCase() === quoteToken.toLowerCase() ? pool.token0.symbol : pool.token1.symbol
                                        })}
                                    </span>
                                    {!quoteApproval.isApproved && canExecuteTransactions && !quoteApproval.isLoadingAllowance && (
                                        <button
                                            onClick={() => handleApproval('quote')}
                                            disabled={quoteApproval.isApproving || quoteApproval.isWaitingForConfirmation}
                                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white text-sm rounded transition-colors flex items-center gap-2"
                                        >
                                            {(quoteApproval.isApproving || quoteApproval.isWaitingForConfirmation) && (
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                            )}
                                            {quoteApproval.isWaitingForConfirmation ? 'Confirming...' : quoteApproval.isApproving ? 'Approving...' : t("positionWizard.openPositionFinal.approve")}
                                        </button>
                                    )}
                                </div>
                                {quoteApproval.approvalTxHash && (
                                    <a
                                        href={getExplorerUrl(quoteApproval.approvalTxHash) || '#'}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 ml-8"
                                    >
                                        View transaction <ExternalLink className="w-3 h-3" />
                                    </a>
                                )}
                                {quoteApproval.approvalError && (
                                    <div className="text-xs text-red-400 ml-8">
                                        Error: {quoteApproval.approvalError.message}
                                    </div>
                                )}
                            </div>

                            {/* Step 3: Open Position */}
                            <div className="flex items-center gap-3">
                                {positionStatus === 'completed' ? (
                                    <Check className="w-5 h-5 text-green-500" />
                                ) : (
                                    <Circle className="w-5 h-5 text-slate-400" />
                                )}
                                <span className="text-white flex-1">
                                    {t("positionWizard.openPositionFinal.openPosition")}
                                </span>
                                {positionStatus === 'pending' && canExecuteTransactions && baseApproval.isApproved && quoteApproval.isApproved && (
                                    <button
                                        onClick={handleOpenPosition}
                                        className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors"
                                    >
                                        {t("positionWizard.openPositionFinal.execute")}
                                    </button>
                                )}
                            </div>
                        </div>

                        {!isConnected && (
                            <div className="mt-4 text-center">
                                <button
                                    onClick={() => openConnectModal?.()}
                                    className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
                                >
                                    {t("positionWizard.openPositionFinal.connectToContinue")}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}