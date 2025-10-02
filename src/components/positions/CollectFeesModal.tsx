"use client";

import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, AlertCircle, Check } from "lucide-react";
import { useAccount } from "wagmi";
import type { Address } from "viem";
import { useQueryClient } from "@tanstack/react-query";
import { getChainId, SupportedChainsType } from "@/config/chains";
import { normalizeAddress } from "@/lib/utils/evm";
import { useCollectFees } from "@/hooks/useCollectFees";
import { formatCompactValue } from "@/lib/utils/fraction-format";
import { useTranslations } from "@/i18n/client";
import type { BasicPosition } from "@/services/positions/positionService";
import type { UnclaimedFeeAmounts } from "@/app/api/positions/uniswapv3/[chain]/[nft]/details/route";

interface CollectFeesModalProps {
    isOpen: boolean;
    onClose: () => void;
    position: BasicPosition;
    unclaimedFeesQuoteValue: bigint;
    unclaimedFeesAmounts: UnclaimedFeeAmounts | null;
}

export function CollectFeesModal({
    isOpen,
    onClose,
    position,
    unclaimedFeesQuoteValue,
    unclaimedFeesAmounts,
}: CollectFeesModalProps) {
    const t = useTranslations();
    const [mounted, setMounted] = useState(false);
    const queryClient = useQueryClient();

    const {
        address: walletAddress,
        isConnected,
        chainId: connectedChainId,
    } = useAccount();

    // Ensure component is mounted on client side for portal
    useEffect(() => {
        setMounted(true);
    }, []);

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

    // Check if wallet is connected to the wrong network
    const isWrongNetwork = !!(
        isConnected &&
        position.pool.chain &&
        connectedChainId !== getChainId(position.pool.chain as SupportedChainsType)
    );

    // Token info for display
    const baseToken = {
        address: baseTokenAddress,
        symbol: position.token0IsQuote
            ? position.pool.token1.symbol
            : position.pool.token0.symbol,
        decimals: position.token0IsQuote
            ? position.pool.token1.decimals
            : position.pool.token0.decimals,
    };

    const quoteToken = {
        address: quoteTokenAddress,
        symbol: position.token0IsQuote
            ? position.pool.token0.symbol
            : position.pool.token1.symbol,
        decimals: position.token0IsQuote
            ? position.pool.token0.decimals
            : position.pool.token1.decimals,
    };

    // Get fee amounts from API data (pure fees excluding uncollected principal)
    const baseTokenAmount = unclaimedFeesAmounts
        ? BigInt(unclaimedFeesAmounts.baseTokenAmount)
        : 0n;
    const quoteTokenAmount = unclaimedFeesAmounts
        ? BigInt(unclaimedFeesAmounts.quoteTokenAmount)
        : 0n;
    const token0Amount = unclaimedFeesAmounts
        ? BigInt(unclaimedFeesAmounts.token0Amount)
        : 0n;
    const token1Amount = unclaimedFeesAmounts
        ? BigInt(unclaimedFeesAmounts.token1Amount)
        : 0n;

    // Prepare collect fees parameters
    const collectParams = useMemo(() => {
        if (
            !position.nftId ||
            !normalizedWalletAddress ||
            !position.pool.chain ||
            (token0Amount === 0n && token1Amount === 0n)
        ) {
            return null;
        }

        // Use max uint128 to collect all available fees
        const MAX_UINT128 = (1n << 128n) - 1n;

        return {
            tokenId: BigInt(position.nftId),
            recipient: normalizedWalletAddress as Address,
            amount0Max: MAX_UINT128,
            amount1Max: MAX_UINT128,
            chainId: getChainId(position.pool.chain as SupportedChainsType),
        };
    }, [position.nftId, position.pool.chain, normalizedWalletAddress, token0Amount, token1Amount]);

    // Collect fees hook
    const collectFees = useCollectFees(collectParams);

    // Handle collect execution
    const handleCollect = () => {
        collectFees.collect();
    };

    // Handle successful collection - invalidate position cache
    useEffect(() => {
        if (collectFees.isSuccess) {
            // Invalidate position cache to refresh data
            queryClient.invalidateQueries({
                queryKey: [
                    "position",
                    undefined,
                    position.pool.chain,
                    "uniswapv3",
                    position.nftId,
                ],
            });

            // Also invalidate positions list
            queryClient.invalidateQueries({
                queryKey: ["positions", "list"],
            });

            // Close modal after short delay
            setTimeout(() => {
                onClose();
            }, 2000);
        }
    }, [collectFees.isSuccess, position.pool.chain, position.nftId, queryClient, onClose]);

    // Validation
    const canCollect =
        isConnected &&
        !isWrongNetwork &&
        (token0Amount > 0n || token1Amount > 0n);

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
                <div className="bg-slate-800/95 backdrop-blur-md border border-slate-700/50 rounded-xl shadow-2xl shadow-black/40 w-full max-w-2xl max-h-[90vh] overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
                        <div>
                            <h2 className="text-2xl font-bold text-white">
                                {t("dashboard.positions.collectFees.title")}
                            </h2>
                            <p className="text-sm text-slate-400 mt-1">
                                {t("dashboard.positions.collectFees.description")} from {baseToken.symbol}/{quoteToken.symbol}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            disabled={
                                collectFees.isCollecting ||
                                collectFees.isWaitingForConfirmation
                            }
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

                        {/* Fee Preview Section - Matching PositionSizeConfig header layout */}
                        <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700/50 rounded-lg p-4">
                            <div className="space-y-3">
                                {/* Header with token amounts */}
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-300 font-medium">
                                        {t("dashboard.positions.collectFees.preview")}
                                    </span>
                                    <span className="text-white font-medium">
                                        {formatCompactValue(baseTokenAmount, baseToken.decimals)} {baseToken.symbol} +{" "}
                                        {formatCompactValue(quoteTokenAmount, quoteToken.decimals)} {quoteToken.symbol}
                                    </span>
                                </div>

                                {/* Total value in quote token */}
                                <div className="flex items-center justify-between text-sm pt-2 border-t border-slate-700/50">
                                    <span className="text-slate-300 font-medium">
                                        {t("dashboard.positions.collectFees.totalValue")}
                                    </span>
                                    <span className="text-amber-400 font-semibold text-lg">
                                        {formatCompactValue(unclaimedFeesQuoteValue, quoteToken.decimals)} {quoteToken.symbol}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Transaction Step */}
                        <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700/50 rounded-lg p-4">
                            <h3 className="text-lg font-semibold text-white mb-4">
                                Transaction
                            </h3>
                            <div className="space-y-3">
                                <TransactionStep
                                    title={t("dashboard.positions.collectFees.execute")}
                                    description="Collect all accumulated fees to your wallet"
                                    isLoading={
                                        collectFees.isCollecting ||
                                        collectFees.isWaitingForConfirmation
                                    }
                                    isComplete={collectFees.isSuccess}
                                    isDisabled={!canCollect}
                                    onExecute={handleCollect}
                                />
                            </div>

                            {/* Error Display */}
                            {collectFees.collectError && (
                                <div className="mt-4 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                                        <div>
                                            <h5 className="text-red-400 font-medium">
                                                {t("dashboard.positions.collectFees.error")}
                                            </h5>
                                            <p className="text-red-200/80 text-sm mt-1">
                                                {collectFees.collectError.message}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Success Message */}
                            {collectFees.isSuccess && (
                                <div className="mt-4 px-4 py-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                                        <div>
                                            <h5 className="text-green-400 font-medium">
                                                {t("dashboard.positions.collectFees.success")}
                                            </h5>
                                            <p className="text-green-200/80 text-sm mt-1">
                                                Your fees have been transferred. Closing modal...
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );

    return createPortal(modalContent, document.body);
}

interface TransactionStepProps {
    title: string;
    description: string;
    isLoading: boolean;
    isComplete: boolean;
    isDisabled: boolean;
    onExecute: () => void;
}

function TransactionStep({
    title,
    description,
    isLoading,
    isComplete,
    isDisabled,
    onExecute,
}: TransactionStepProps) {
    return (
        <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
            <div className="flex items-center gap-3">
                {isComplete ? (
                    <div className="w-8 h-8 rounded-full bg-green-500/20 border border-green-500/50 flex items-center justify-center">
                        <Check className="w-4 h-4 text-green-400" />
                    </div>
                ) : (
                    <div className="w-8 h-8 rounded-full bg-slate-600/50 border border-slate-500/50 flex items-center justify-center">
                        {isLoading ? (
                            <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                        ) : (
                            <span className="text-slate-400 text-sm">•</span>
                        )}
                    </div>
                )}
                <div>
                    <p className="text-white font-medium text-sm">{title}</p>
                    <p className="text-slate-400 text-xs">{description}</p>
                </div>
            </div>
            {!isComplete && (
                <button
                    onClick={onExecute}
                    disabled={isDisabled || isLoading}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:text-slate-400 text-white text-sm rounded-lg transition-colors"
                >
                    {isLoading ? "Processing..." : "Execute"}
                </button>
            )}
        </div>
    );
}
