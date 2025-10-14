"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, AlertCircle, Check } from "lucide-react";
import { useAccount } from "wagmi";
import type { Address } from "viem";
import { getChainId, type SupportedChainsType } from "@/config/chains";
import { normalizeAddress } from "@/lib/utils/evm";
import { getTokenAmountsFromLiquidity } from "@/lib/utils/uniswap-v3/liquidity";
import { useTokenApproval } from "@/app-shared/hooks/useTokenApproval";
import { useIncreaseLiquidity } from "@/app-shared/hooks/useIncreaseLiquidity";
import { usePool } from "@/app-shared/hooks/api/usePool";
import { useTokenBalance } from "@/app-shared/hooks/useTokenBalance";
import { usePositionValidation } from "@/app-shared/hooks/positions/usePositionValidation";
import { PositionSizeConfig } from "./wizard/PositionSizeConfig";
import { InsufficientFundsAlert } from "./wizard/InsufficientFundsAlert";
import { NetworkSwitchStep } from "./NetworkSwitchStep";
import { TransactionStep } from "./TransactionStep";
import type { BasicPosition } from "@/types/positions";
import { parseIncreaseLiquidityEvent } from "@/lib/utils/uniswap-v3/parse-liquidity-events";
import { NONFUNGIBLE_POSITION_MANAGER_ADDRESSES } from "@/lib/contracts/nonfungiblePositionManager";
import { useUpdatePositionWithEvents } from "@/app-shared/hooks/api/useUpdatePositionWithEvents";

interface IncreasePositionModalProps {
    isOpen: boolean;
    onClose: () => void;
    position: BasicPosition;
}

export function IncreasePositionModal({
    isOpen,
    onClose,
    position,
}: IncreasePositionModalProps) {
    const [mounted, setMounted] = useState(false);
    const [liquidity, setLiquidity] = useState<bigint>(0n);
    const updateMutation = useUpdatePositionWithEvents();

    const {
        address: walletAddress,
        isConnected,
        chainId: connectedChainId,
    } = useAccount();

    // Ensure component is mounted on client side for portal
    useEffect(() => {
        setMounted(true);
    }, []);

    // Load pool data to get current price
    const {
        pool,
        isLoading: isPoolLoading,
        refetch: refetchPool,
    } = usePool({
        chain: position.pool.chain as SupportedChainsType,
        poolAddress: position.pool.poolAddress,
        enabled: isOpen && !!position.pool.poolAddress,
    });

    // Normalize addresses
    const normalizedWalletAddress = walletAddress
        ? normalizeAddress(walletAddress)
        : null;
    const baseTokenAddress = position.token0IsQuote
        ? position.pool.token1.address
        : position.pool.token0.address;
    const quoteTokenAddress = position.token0IsQuote
        ? position.pool.token0.address
        : position.pool.token1.address;
    const normalizedBaseToken = normalizeAddress(baseTokenAddress);
    const normalizedQuoteToken = normalizeAddress(quoteTokenAddress);

    // Check if wallet is connected to the wrong network
    const isWrongNetwork = !!(
        isConnected &&
        position.pool.chain &&
        connectedChainId !== getChainId(position.pool.chain as SupportedChainsType)
    );

    // Token info for components
    const baseToken = {
        address: baseTokenAddress,
        symbol: position.token0IsQuote
            ? position.pool.token1.symbol
            : position.pool.token0.symbol,
        decimals: position.token0IsQuote
            ? position.pool.token1.decimals
            : position.pool.token0.decimals,
        logoUrl: position.token0IsQuote
            ? position.pool.token1.logoUrl
            : position.pool.token0.logoUrl,
    };

    const quoteToken = {
        address: quoteTokenAddress,
        symbol: position.token0IsQuote
            ? position.pool.token0.symbol
            : position.pool.token1.symbol,
        decimals: position.token0IsQuote
            ? position.pool.token0.decimals
            : position.pool.token1.decimals,
        logoUrl: position.token0IsQuote
            ? position.pool.token0.logoUrl
            : position.pool.token1.logoUrl,
    };

    // Fetch token balances
    const baseBalanceHook = useTokenBalance({
        tokenAddress: normalizedBaseToken,
        walletAddress: normalizedWalletAddress,
        chainId: position.pool.chain ? getChainId(position.pool.chain as SupportedChainsType) : undefined,
        enabled: isConnected && !!normalizedWalletAddress && isOpen,
    });

    const quoteBalanceHook = useTokenBalance({
        tokenAddress: normalizedQuoteToken,
        walletAddress: normalizedWalletAddress,
        chainId: position.pool.chain ? getChainId(position.pool.chain as SupportedChainsType) : undefined,
        enabled: isConnected && !!normalizedWalletAddress && isOpen,
    });

    // Calculate required token amounts from liquidity
    const requiredAmounts = useMemo(() => {
        if (
            !pool ||
            !liquidity ||
            liquidity === 0n ||
            pool.currentTick === null
        ) {
            return { baseAmount: 0n, quoteAmount: 0n };
        }

        try {
            const { token0Amount, token1Amount } = getTokenAmountsFromLiquidity(
                liquidity,
                BigInt(pool.sqrtPriceX96),
                position.tickLower,
                position.tickUpper
            );

            const isQuoteToken0 =
                pool.token0.address.toLowerCase() === quoteTokenAddress.toLowerCase();
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
    }, [pool, liquidity, position.tickLower, position.tickUpper, quoteTokenAddress]);

    const requiredBaseAmount = requiredAmounts.baseAmount;
    const requiredQuoteAmount = requiredAmounts.quoteAmount;

    // Token approval hooks
    const baseApproval = useTokenApproval({
        tokenAddress: normalizedBaseToken as Address | null,
        ownerAddress: normalizedWalletAddress as Address | null,
        requiredAmount: requiredBaseAmount,
        chainId: position.pool.chain ? getChainId(position.pool.chain as SupportedChainsType) : undefined,
        enabled:
            isConnected &&
            !isWrongNetwork &&
            !!normalizedBaseToken &&
            !!normalizedWalletAddress &&
            requiredBaseAmount > 0n &&
            isOpen,
    });

    const quoteApproval = useTokenApproval({
        tokenAddress: normalizedQuoteToken as Address | null,
        ownerAddress: normalizedWalletAddress as Address | null,
        requiredAmount: requiredQuoteAmount,
        chainId: position.pool.chain ? getChainId(position.pool.chain as SupportedChainsType) : undefined,
        enabled:
            isConnected &&
            !isWrongNetwork &&
            !!normalizedQuoteToken &&
            !!normalizedWalletAddress &&
            requiredQuoteAmount > 0n &&
            isOpen,
    });

    // Validation
    const { validation, insufficientFunds, canExecuteTransactions } =
        usePositionValidation({
            isPoolLoading,
            isPoolError: false,
            pool,
            baseToken: baseTokenAddress,
            quoteToken: quoteTokenAddress,
            liquidity,
            tickLower: position.tickLower,
            tickUpper: position.tickUpper,
            poolError: undefined,
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

    // Prepare increase liquidity parameters
    const increaseParams = useMemo(() => {
        if (
            !pool ||
            !position.nftId ||
            !normalizedWalletAddress ||
            !position.pool.chain
        ) {
            return null;
        }

        if (requiredBaseAmount === 0n && requiredQuoteAmount === 0n) {
            return null;
        }


        const isQuoteToken0 =
            pool.token0.address.toLowerCase() === quoteTokenAddress.toLowerCase();
        const amount0Desired = isQuoteToken0
            ? requiredQuoteAmount
            : requiredBaseAmount;
        const amount1Desired = isQuoteToken0
            ? requiredBaseAmount
            : requiredQuoteAmount;

        return {
            tokenId: BigInt(position.nftId),
            amount0Desired,
            amount1Desired,
            chainId: getChainId(position.pool.chain as SupportedChainsType),
            slippageBps: 1000,
        };
    }, [
        pool,
        position.nftId,
        position.pool.chain,
        normalizedWalletAddress,
        requiredBaseAmount,
        requiredQuoteAmount,
        quoteTokenAddress,
    ]);

    // Increase liquidity hook
    const increaseLiquidity = useIncreaseLiquidity(increaseParams);

    // Reset mutation state when modal opens
    useEffect(() => {
        if (isOpen) {
            updateMutation.reset();
            increaseLiquidity.reset();
        }
    }, [isOpen, updateMutation, increaseLiquidity]);

    // Handle liquidity changes
    const onLiquidityChange = useCallback((newLiquidity: bigint) => {
        setLiquidity(newLiquidity);
    }, []);

    // Transaction handlers
    const handleApproval = (token: "base" | "quote") => {
        if (token === "base") {
            baseApproval.approve();
        } else {
            quoteApproval.approve();
        }
    };

    const handleIncreasePosition = () => {
        increaseLiquidity.increase();
    };

    // Handle successful increase - seed event and update position
    useEffect(() => {
        if (increaseLiquidity.isSuccess && increaseLiquidity.receipt && !updateMutation.isPending && !updateMutation.isSuccess) {
            const chainId = getChainId(position.pool.chain as SupportedChainsType);
            const nftManagerAddress = NONFUNGIBLE_POSITION_MANAGER_ADDRESSES[chainId];

            if (!nftManagerAddress) {
                console.error('NFT Manager address not found for chain');
                // Still close modal even if we can't seed event
                setTimeout(() => onClose(), 2000);
                return;
            }

            const parsed = parseIncreaseLiquidityEvent(
                increaseLiquidity.receipt,
                nftManagerAddress
            );

            if (parsed) {
                // Calculate new total liquidity: current + delta
                const currentLiquidity = BigInt(position.liquidity);
                const liquidityDelta = BigInt(parsed.liquidity || "0");
                const newTotalLiquidity = currentLiquidity + liquidityDelta;

                updateMutation.mutate({
                    chain: position.pool.chain,
                    nftId: position.nftId || "",
                    poolAddress: position.pool.poolAddress,
                    tickLower: position.tickLower,
                    tickUpper: position.tickUpper,
                    liquidity: newTotalLiquidity.toString(),
                    token0IsQuote: position.token0IsQuote,
                    owner: position.owner,
                    events: [parsed]
                });
            }

            // Close modal after update completes
            setTimeout(() => onClose(), 2000);
        }
    }, [increaseLiquidity.isSuccess, increaseLiquidity.receipt, position.pool.chain, position.nftId, position.liquidity, position.tickLower, position.tickUpper, position.token0IsQuote, position.owner, position.pool.poolAddress, onClose, updateMutation]);

    // Determine transaction steps
    const needsBaseApproval = requiredBaseAmount > 0n && !baseApproval.isApproved;
    const needsQuoteApproval = requiredQuoteAmount > 0n && !quoteApproval.isApproved;

    if (!isOpen || !mounted) return null;

    const modalContent = (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
                <div className="bg-slate-800/95 backdrop-blur-md border border-slate-700/50 rounded-xl shadow-2xl shadow-black/40 w-full max-w-3xl max-h-[90vh] overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
                        <div>
                            <h2 className="text-2xl font-bold text-white">
                                Increase Position
                            </h2>
                            <p className="text-sm text-slate-400 mt-1">
                                Add more capital to your {baseToken.symbol}/{quoteToken.symbol} position
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            disabled={increaseLiquidity.isIncreasing || increaseLiquidity.isWaitingForConfirmation}
                            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)] space-y-6">
                        {/* Position Info */}
                        <div className="bg-slate-700/30 rounded-lg p-4 space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-400">NFT ID:</span>
                                <span className="text-sm text-white font-mono">#{position.nftId}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-400">Token Pair:</span>
                                <span className="text-sm text-white">
                                    {baseToken.symbol}/{quoteToken.symbol}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-400">Chain:</span>
                                <span className="text-sm text-white capitalize">{position.pool.chain}</span>
                            </div>
                        </div>

                        {/* Loading State */}
                        {isPoolLoading && (
                            <div className="flex items-center justify-center py-12">
                                <div className="flex items-center gap-3 text-slate-400">
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>Loading pool data...</span>
                                </div>
                            </div>
                        )}

                        {/* Position Size Configuration */}
                        {!isPoolLoading && pool && (
                            <>
                                <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700/50 rounded-lg p-4">
                                    <PositionSizeConfig
                                        pool={pool}
                                        baseToken={baseToken}
                                        quoteToken={quoteToken}
                                        tickLower={position.tickLower}
                                        tickUpper={position.tickUpper}
                                        liquidity={liquidity}
                                        onLiquidityChange={onLiquidityChange}
                                        chain={position.pool.chain as SupportedChainsType}
                                        onRefreshPool={refetchPool}
                                        label="Increase position by:"
                                    />
                                </div>

                                {/* Insufficient Funds Information */}
                                {insufficientFunds && (
                                    <InsufficientFundsAlert
                                        insufficientFunds={insufficientFunds}
                                        pool={pool}
                                        baseToken={baseTokenAddress}
                                        quoteToken={quoteTokenAddress}
                                        isConnected={isConnected}
                                        chain={position.pool.chain as SupportedChainsType}
                                    />
                                )}

                                {/* Transaction Steps */}
                                {validation.hasValidParams && liquidity > 0n && (
                                    <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700/50 rounded-lg p-4">
                                        <h3 className="text-lg font-semibold text-white mb-4">
                                            Transaction Steps
                                        </h3>
                                        <div className="space-y-3">
                                            {/* Network Switch Step */}
                                            <NetworkSwitchStep
                                                chain={position.pool.chain as SupportedChainsType}
                                                isWrongNetwork={isWrongNetwork}
                                            />

                                            {/* Base Token Approval */}
                                            {needsBaseApproval && (
                                                <TransactionStep
                                                    title={`Approve ${baseToken.symbol}`}
                                                    description={`Allow the contract to spend your ${baseToken.symbol}`}
                                                    isLoading={baseApproval.isApproving}
                                                    isComplete={baseApproval.isApproved}
                                                    isDisabled={!canExecuteTransactions}
                                                    onExecute={() => handleApproval("base")}
                                                />
                                            )}

                                            {/* Quote Token Approval */}
                                            {needsQuoteApproval && (
                                                <TransactionStep
                                                    title={`Approve ${quoteToken.symbol}`}
                                                    description={`Allow the contract to spend your ${quoteToken.symbol}`}
                                                    isLoading={quoteApproval.isApproving}
                                                    isComplete={quoteApproval.isApproved}
                                                    isDisabled={!canExecuteTransactions || (needsBaseApproval && !baseApproval.isApproved)}
                                                    onExecute={() => handleApproval("quote")}
                                                />
                                            )}

                                            {/* Increase Liquidity */}
                                            <TransactionStep
                                                title="Increase Position"
                                                description="Add liquidity to your position"
                                                isLoading={increaseLiquidity.isIncreasing || increaseLiquidity.isWaitingForConfirmation}
                                                isComplete={increaseLiquidity.isSuccess}
                                                isDisabled={
                                                    !canExecuteTransactions ||
                                                    (needsBaseApproval && !baseApproval.isApproved) ||
                                                    (needsQuoteApproval && !quoteApproval.isApproved)
                                                }
                                                onExecute={handleIncreasePosition}
                                            />
                                        </div>

                                        {/* Error Display */}
                                        {increaseLiquidity.increaseError && (
                                            <div className="mt-4 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                                                    <div>
                                                        <h5 className="text-red-400 font-medium">
                                                            Transaction Error
                                                        </h5>
                                                        <p className="text-red-200/80 text-sm mt-1">
                                                            {increaseLiquidity.increaseError.message}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Success Message */}
                                        {increaseLiquidity.isSuccess && (
                                            <div className="mt-4 px-4 py-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                                                    <div>
                                                        <h5 className="text-green-400 font-medium">
                                                            Position Increased Successfully!
                                                        </h5>
                                                        <p className="text-green-200/80 text-sm mt-1">
                                                            Your position has been updated. Closing modal...
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </>
    );

    return createPortal(modalContent, document.body);
}
