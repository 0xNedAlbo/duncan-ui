"use client";

import { Loader2, Check, Circle, ExternalLink } from "lucide-react";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import type { Address } from "viem";
import { useTranslations } from "@/i18n/client";
import type { SupportedChainsType } from "@/config/chains";
import { getChainConfig } from "@/config/chains";
import { formatCompactValue } from "@/lib/utils/fraction-format";
import type { UseTokenApprovalResult } from "@/hooks/useTokenApproval";
import type { UseMintPositionResult } from "@/hooks/useMintPosition";

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

interface TransactionStepsListProps {
    pool: PoolData;
    baseToken: string;
    quoteToken: string;
    requiredBaseAmount: bigint;
    requiredQuoteAmount: bigint;
    baseApproval: UseTokenApprovalResult;
    quoteApproval: UseTokenApprovalResult;
    mintPosition: UseMintPositionResult;
    canExecuteTransactions: boolean;
    isConnected: boolean;
    chain: SupportedChainsType;
    onApproval: (token: 'base' | 'quote') => void;
    onOpenPosition: () => void;
}

/**
 * Displays the transaction steps for opening a Uniswap V3 position
 *
 * Steps:
 * 1. Base token approval (if required amount > 0)
 * 2. Quote token approval (if required amount > 0)
 * 3. Open position (mint NFT)
 */
export function TransactionStepsList({
    pool,
    baseToken,
    quoteToken,
    requiredBaseAmount,
    requiredQuoteAmount,
    baseApproval,
    quoteApproval,
    mintPosition,
    canExecuteTransactions,
    isConnected,
    chain,
    onApproval,
    onOpenPosition,
}: TransactionStepsListProps) {
    const t = useTranslations();
    const { openConnectModal } = useConnectModal();

    // Get block explorer URL for transaction
    const getExplorerUrl = (txHash: Address | undefined) => {
        if (!txHash || !chain) return null;
        const config = getChainConfig(chain);
        return `${config.explorer}/tx/${txHash}`;
    };

    return (
        <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700/50 rounded-lg p-4">
            <h4 className="text-lg font-semibold text-white mb-4">
                {t("positionWizard.openPositionFinal.transactionSteps")}
            </h4>

            <div className={`space-y-4 ${!canExecuteTransactions ? 'opacity-50' : ''}`}>
                {/* Step 1: Base Token Approval - Only show if required amount > 0 */}
                {requiredBaseAmount > 0n && (
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
                                    amount: formatCompactValue(
                                        requiredBaseAmount,
                                        pool.token0.address.toLowerCase() === baseToken.toLowerCase()
                                            ? pool.token0.decimals
                                            : pool.token1.decimals
                                    ),
                                    symbol: pool.token0.address.toLowerCase() === baseToken.toLowerCase()
                                        ? pool.token0.symbol
                                        : pool.token1.symbol,
                                })}
                            </span>
                            {baseApproval.approvalTxHash && (
                                <a
                                    href={getExplorerUrl(baseApproval.approvalTxHash) || '#'}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-400 hover:text-blue-300 transition-colors"
                                    title="View transaction on block explorer"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                </a>
                            )}
                            {!baseApproval.isApproved && canExecuteTransactions && !baseApproval.isLoadingAllowance && (
                                <button
                                    onClick={() => onApproval('base')}
                                    disabled={baseApproval.isApproving || baseApproval.isWaitingForConfirmation}
                                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white text-sm rounded transition-colors flex items-center gap-2"
                                >
                                    {(baseApproval.isApproving || baseApproval.isWaitingForConfirmation) && (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                    )}
                                    {baseApproval.isWaitingForConfirmation
                                        ? 'Confirming...'
                                        : baseApproval.isApproving
                                        ? 'Approving...'
                                        : t("positionWizard.openPositionFinal.approve")}
                                </button>
                            )}
                        </div>
                        {baseApproval.approvalError && (
                            <div className="text-xs text-red-400 ml-8">
                                Error: {baseApproval.approvalError.message}
                            </div>
                        )}
                    </div>
                )}

                {/* Step 2: Quote Token Approval - Only show if required amount > 0 */}
                {requiredQuoteAmount > 0n && (
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
                                    amount: formatCompactValue(
                                        requiredQuoteAmount,
                                        pool.token0.address.toLowerCase() === quoteToken.toLowerCase()
                                            ? pool.token0.decimals
                                            : pool.token1.decimals
                                    ),
                                    symbol: pool.token0.address.toLowerCase() === quoteToken.toLowerCase()
                                        ? pool.token0.symbol
                                        : pool.token1.symbol,
                                })}
                            </span>
                            {quoteApproval.approvalTxHash && (
                                <a
                                    href={getExplorerUrl(quoteApproval.approvalTxHash) || '#'}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-400 hover:text-blue-300 transition-colors"
                                    title="View transaction on block explorer"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                </a>
                            )}
                            {!quoteApproval.isApproved && canExecuteTransactions && !quoteApproval.isLoadingAllowance && (
                                <button
                                    onClick={() => onApproval('quote')}
                                    disabled={quoteApproval.isApproving || quoteApproval.isWaitingForConfirmation}
                                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white text-sm rounded transition-colors flex items-center gap-2"
                                >
                                    {(quoteApproval.isApproving || quoteApproval.isWaitingForConfirmation) && (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                    )}
                                    {quoteApproval.isWaitingForConfirmation
                                        ? 'Confirming...'
                                        : quoteApproval.isApproving
                                        ? 'Approving...'
                                        : t("positionWizard.openPositionFinal.approve")}
                                </button>
                            )}
                        </div>
                        {quoteApproval.approvalError && (
                            <div className="text-xs text-red-400 ml-8">
                                Error: {quoteApproval.approvalError.message}
                            </div>
                        )}
                    </div>
                )}

                {/* Step 3: Open Position */}
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                        {mintPosition.isSuccess ? (
                            <Check className="w-5 h-5 text-green-500" />
                        ) : (
                            <Circle className="w-5 h-5 text-slate-400" />
                        )}
                        <span className="text-white flex-1">
                            {t("positionWizard.openPositionFinal.openPosition")}
                        </span>
                        {mintPosition.mintTxHash && (
                            <a
                                href={getExplorerUrl(mintPosition.mintTxHash) || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:text-blue-300 transition-colors"
                                title="View transaction on block explorer"
                            >
                                <ExternalLink className="w-4 h-4" />
                            </a>
                        )}
                        {!mintPosition.isSuccess &&
                            canExecuteTransactions &&
                            (requiredBaseAmount === 0n || baseApproval.isApproved) &&
                            (requiredQuoteAmount === 0n || quoteApproval.isApproved) && (
                                <button
                                    onClick={onOpenPosition}
                                    disabled={mintPosition.isMinting || mintPosition.isWaitingForConfirmation}
                                    className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-green-600/50 text-white text-sm rounded transition-colors flex items-center gap-2"
                                >
                                    {(mintPosition.isMinting || mintPosition.isWaitingForConfirmation) && (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                    )}
                                    {mintPosition.isWaitingForConfirmation
                                        ? 'Confirming...'
                                        : mintPosition.isMinting
                                        ? 'Minting...'
                                        : t("positionWizard.openPositionFinal.execute")}
                                </button>
                            )}
                    </div>
                    {mintPosition.isSuccess && mintPosition.tokenId && (
                        <div className="text-xs text-green-400 ml-8">
                            Position NFT #{mintPosition.tokenId.toString()} created successfully!
                        </div>
                    )}
                    {mintPosition.mintError && (
                        <div className="text-xs text-red-400 ml-8">
                            Error: {mintPosition.mintError.message}
                        </div>
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
    );
}
