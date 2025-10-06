"use client";

import { useEffect, useMemo, useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";
import { useAccount } from "wagmi";
import type { Address } from "viem";
import { TickMath } from "@uniswap/v3-sdk";
import { usePool } from "@/app-shared/hooks/api/usePool";
import { getChainId } from "@/config/chains";
import { normalizeAddress } from "@/lib/utils/evm";
import { getTokenAmountsFromLiquidity } from "@/lib/utils/uniswap-v3/liquidity";
import { useTokenApproval } from "@/app-shared/hooks/useTokenApproval";
import { useMintPosition } from "@/app-shared/hooks/useMintPosition";
import { sortTokens } from "@/lib/utils/uniswap-v3/utils";
import { usePositionParams } from "@/app-shared/hooks/positions/usePositionParams";
import { usePositionNavigation } from "@/app-shared/hooks/positions/usePositionNavigation";
import { usePositionValidation } from "@/app-shared/hooks/positions/usePositionValidation";
import { useTokenBalance } from "@/app-shared/hooks/useTokenBalance";
import { PositionSizeConfig } from "./PositionSizeConfig";
import { TransactionStepsList } from "./TransactionStepsList";
import { WalletBalanceSection } from "./WalletBalanceSection";
import { InsufficientFundsAlert } from "./InsufficientFundsAlert";
import { ValidationErrorCard } from "./ValidationErrorCard";

interface CreatedPositionData {
    chain: string;
    nftId: bigint;
    pool: any;
    baseToken: string;
    quoteToken: string;
    tickLower: number;
    tickUpper: number;
    liquidity: string; // BigInt as string
}

interface OpenPositionStepProps {
    // eslint-disable-next-line no-unused-vars
    onPositionCreated?: (data: CreatedPositionData | null) => void;
}

export function OpenPositionStep(props: OpenPositionStepProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const {
        address: walletAddress,
        isConnected,
        chainId: connectedChainId,
    } = useAccount();

    // Extract URL parameters
    const {
        chain,
        poolAddress,
        baseToken,
        quoteToken,
        tickLower,
        tickUpper,
        liquidity,
    } = usePositionParams();

    // Navigation callbacks
    const {
        goToChainSelection,
        goToTokenPairSelection,
        goToPoolSelection,
        goToPositionConfig,
    } = usePositionNavigation();

    // Load pool data
    const {
        pool,
        isLoading: isPoolLoading,
        isError: isPoolError,
        error: poolError,
        refetch: refetchPool,
    } = usePool({
        chain,
        poolAddress,
        enabled: !!chain && !!poolAddress,
    });

    // Normalize addresses
    const normalizedWalletAddress = walletAddress
        ? normalizeAddress(walletAddress)
        : null;
    const normalizedBaseToken = baseToken ? normalizeAddress(baseToken) : null;
    const normalizedQuoteToken = quoteToken
        ? normalizeAddress(quoteToken)
        : null;

    // Check if wallet is connected to the wrong network
    const isWrongNetwork = !!(
        isConnected &&
        chain &&
        connectedChainId !== getChainId(chain)
    );

    // Fetch token balances using the reusable hook
    const baseBalanceHook = useTokenBalance({
        tokenAddress: normalizedBaseToken,
        walletAddress: normalizedWalletAddress,
        chainId: chain ? getChainId(chain) : undefined,
        enabled:
            isConnected && !!normalizedWalletAddress && !!normalizedBaseToken,
    });

    const quoteBalanceHook = useTokenBalance({
        tokenAddress: normalizedQuoteToken,
        walletAddress: normalizedWalletAddress,
        chainId: chain ? getChainId(chain) : undefined,
        enabled:
            isConnected && !!normalizedWalletAddress && !!normalizedQuoteToken,
    });

    // Calculate required token amounts from liquidity
    const requiredAmounts = useMemo(() => {
        if (
            !pool ||
            !liquidity ||
            liquidity === 0n ||
            pool.currentTick === null ||
            !baseToken ||
            !quoteToken
        ) {
            return { baseAmount: 0n, quoteAmount: 0n };
        }

        try {
            const { token0Amount, token1Amount } = getTokenAmountsFromLiquidity(
                liquidity,
                pool.currentTick,
                tickLower && !isNaN(tickLower) ? tickLower : TickMath.MIN_TICK,
                tickUpper && !isNaN(tickUpper) ? tickUpper : TickMath.MAX_TICK
            );

            const isQuoteToken0 =
                pool.token0.address.toLowerCase() === quoteToken.toLowerCase();
            const baseAmount = isQuoteToken0 ? token1Amount : token0Amount;
            const quoteAmount = isQuoteToken0 ? token0Amount : token1Amount;

            return { baseAmount, quoteAmount };
        } catch (error) {
            console.error(
                "Error calculating required amounts from liquidity:",
                error
            );
            return { baseAmount: 0n, quoteAmount: 0n };
        }
    }, [pool, liquidity, tickLower, tickUpper, baseToken, quoteToken]);

    const requiredBaseAmount = requiredAmounts.baseAmount;
    const requiredQuoteAmount = requiredAmounts.quoteAmount;

    // Token approval hooks
    const baseApproval = useTokenApproval({
        tokenAddress: normalizedBaseToken as Address | null,
        ownerAddress: normalizedWalletAddress as Address | null,
        requiredAmount: requiredBaseAmount,
        chainId: chain ? getChainId(chain) : undefined,
        enabled:
            isConnected &&
            !isWrongNetwork &&
            !!normalizedBaseToken &&
            !!normalizedWalletAddress &&
            requiredBaseAmount > 0n,
    });

    const quoteApproval = useTokenApproval({
        tokenAddress: normalizedQuoteToken as Address | null,
        ownerAddress: normalizedWalletAddress as Address | null,
        requiredAmount: requiredQuoteAmount,
        chainId: chain ? getChainId(chain) : undefined,
        enabled:
            isConnected &&
            !isWrongNetwork &&
            !!normalizedQuoteToken &&
            !!normalizedWalletAddress &&
            requiredQuoteAmount > 0n,
    });

    // Validation
    const { validation, insufficientFunds, canExecuteTransactions } =
        usePositionValidation({
            isPoolLoading,
            isPoolError,
            pool,
            baseToken,
            quoteToken,
            liquidity,
            tickLower,
            tickUpper,
            poolError,
            isConnected,
            isWrongNetwork,
            baseBalance: baseBalanceHook.balance,
            quoteBalance: quoteBalanceHook.balance,
            requiredBaseAmount,
            requiredQuoteAmount,
            baseBalanceLoading: baseBalanceHook.isLoading,
            quoteBalanceLoading: quoteBalanceHook.isLoading,
            baseApproval,
            quoteApproval,
        });

    // Prepare mint position parameters
    const mintPositionParams = useMemo(() => {
        if (
            !pool ||
            !baseToken ||
            !quoteToken ||
            !normalizedWalletAddress ||
            !chain
        ) {
            return null;
        }

        if (requiredBaseAmount === 0n && requiredQuoteAmount === 0n) {
            return null;
        }

        const { token0, token1 } = sortTokens(
            { address: pool.token0.address },
            { address: pool.token1.address }
        );

        const isQuoteToken0 =
            pool.token0.address.toLowerCase() === quoteToken.toLowerCase();
        const amount0Desired = isQuoteToken0
            ? requiredQuoteAmount
            : requiredBaseAmount;
        const amount1Desired = isQuoteToken0
            ? requiredBaseAmount
            : requiredQuoteAmount;

        return {
            token0: token0.address as Address,
            token1: token1.address as Address,
            fee: pool.fee,
            tickLower:
                tickLower && !isNaN(tickLower) ? tickLower : TickMath.MIN_TICK,
            tickUpper:
                tickUpper && !isNaN(tickUpper) ? tickUpper : TickMath.MAX_TICK,
            amount0Desired,
            amount1Desired,
            tickSpacing: pool.tickSpacing,
            recipient: normalizedWalletAddress as Address,
            chainId: getChainId(chain),
            slippageBps: 1000,
        };
    }, [
        pool,
        baseToken,
        quoteToken,
        normalizedWalletAddress,
        chain,
        requiredBaseAmount,
        requiredQuoteAmount,
        tickLower,
        tickUpper,
    ]);

    // Mint position hook
    const mintPosition = useMintPosition(mintPositionParams);

    // Handle liquidity changes
    const onLiquidityChange = useCallback(
        (newLiquidity: bigint) => {
            const params = new URLSearchParams(searchParams.toString());
            params.set("liquidity", newLiquidity.toString());
            router.replace(pathname + "?" + params.toString());
        },
        [router, pathname, searchParams]
    );

    // Transaction handlers
    const handleApproval = (token: "base" | "quote") => {
        if (token === "base") {
            baseApproval.approve();
        } else {
            quoteApproval.approve();
        }
    };

    const handleOpenPosition = () => {
        mintPosition.mint();
    };

    // Notify parent about position creation status
    useEffect(() => {
        if (
            mintPosition.isSuccess &&
            mintPosition.tokenId !== undefined &&
            chain &&
            pool &&
            baseToken &&
            quoteToken
        ) {
            props.onPositionCreated?.({
                chain,
                nftId: mintPosition.tokenId,
                pool,
                baseToken,
                quoteToken,
                tickLower:
                    tickLower && !isNaN(tickLower)
                        ? tickLower
                        : TickMath.MIN_TICK,
                tickUpper:
                    tickUpper && !isNaN(tickUpper)
                        ? tickUpper
                        : TickMath.MAX_TICK,
                liquidity: (liquidity || 0n).toString(),
            });
        } else if (!mintPosition.isSuccess) {
            props.onPositionCreated?.(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mintPosition.isSuccess, mintPosition.tokenId]);

    // Validation error states
    if (!chain) {
        return (
            <ValidationErrorCard type="chain" onNavigate={goToChainSelection} />
        );
    }

    if (!baseToken || !quoteToken) {
        return (
            <ValidationErrorCard
                type="tokens"
                onNavigate={goToTokenPairSelection}
            />
        );
    }

    if (
        !poolAddress ||
        (!isPoolLoading && !validation.hasValidPool) ||
        (!isPoolLoading && !validation.hasValidTokens)
    ) {
        return (
            <ValidationErrorCard type="pool" onNavigate={goToPoolSelection} />
        );
    }

    if (!isPoolLoading && !validation.hasValidParams) {
        return (
            <ValidationErrorCard
                type="params"
                onNavigate={goToPositionConfig}
            />
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
            {!isPoolLoading &&
                validation.hasValidPool &&
                validation.hasValidTokens &&
                validation.hasValidParams &&
                pool &&
                baseToken &&
                quoteToken && (
                    <div className="space-y-6">
                        {/* Position Size Configuration */}
                        <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700/50 rounded-lg p-4">
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
                                tickLower={
                                    tickLower && !isNaN(tickLower)
                                        ? tickLower
                                        : TickMath.MIN_TICK
                                }
                                tickUpper={
                                    tickUpper && !isNaN(tickUpper)
                                        ? tickUpper
                                        : TickMath.MAX_TICK
                                }
                                liquidity={liquidity || 0n}
                                onLiquidityChange={onLiquidityChange}
                                chain={chain}
                                onRefreshPool={refetchPool}
                            />
                        </div>

                        {/* Wallet Balance Section */}
                        <WalletBalanceSection
                            pool={pool}
                            baseToken={baseToken}
                            quoteToken={quoteToken}
                            baseBalance={baseBalanceHook.balance}
                            quoteBalance={quoteBalanceHook.balance}
                            baseBalanceLoading={baseBalanceHook.isLoading}
                            quoteBalanceLoading={quoteBalanceHook.isLoading}
                            isConnected={isConnected}
                            isWrongNetwork={isWrongNetwork}
                            chain={chain}
                        />

                        {/* Balance Loading State */}
                        {isConnected &&
                            (baseBalanceHook.isLoading ||
                                quoteBalanceHook.isLoading) &&
                            requiredBaseAmount > 0n &&
                            requiredQuoteAmount > 0n && (
                                <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700/50 rounded-lg p-4">
                                    <div className="flex items-center gap-3">
                                        <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                                        <span className="text-slate-400 text-sm">
                                            Checking wallet balances...
                                        </span>
                                    </div>
                                </div>
                            )}

                        {/* Insufficient Funds Information */}
                        {insufficientFunds && (
                            <InsufficientFundsAlert
                                insufficientFunds={insufficientFunds}
                                pool={pool}
                                baseToken={baseToken}
                                quoteToken={quoteToken}
                                isConnected={isConnected}
                                chain={chain}
                            />
                        )}

                        {/* Transaction Steps */}
                        <TransactionStepsList
                            pool={pool}
                            baseToken={baseToken}
                            quoteToken={quoteToken}
                            requiredBaseAmount={requiredBaseAmount}
                            requiredQuoteAmount={requiredQuoteAmount}
                            baseApproval={baseApproval}
                            quoteApproval={quoteApproval}
                            mintPosition={mintPosition}
                            canExecuteTransactions={canExecuteTransactions}
                            isConnected={isConnected}
                            chain={chain}
                            onApproval={handleApproval}
                            onOpenPosition={handleOpenPosition}
                        />
                    </div>
                )}
        </div>
    );
}
