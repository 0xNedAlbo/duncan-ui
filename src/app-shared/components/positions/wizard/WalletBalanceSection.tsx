"use client";

import { AlertCircle, Loader2 } from "lucide-react";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useSwitchChain } from "wagmi";
import { useTranslations } from "@/app-shared/i18n/client";
import type { SupportedChainsType } from "@/config/chains";
import { getChainConfig, getChainId } from "@/config/chains";
import { formatCompactValue } from "@/lib/utils/fraction-format";

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

interface WalletBalanceSectionProps {
    pool: PoolData;
    baseToken: string;
    quoteToken: string;
    baseBalance: bigint;
    quoteBalance: bigint;
    baseBalanceLoading: boolean;
    quoteBalanceLoading: boolean;
    isConnected: boolean;
    isWrongNetwork: boolean;
    chain: SupportedChainsType;
}

/**
 * Displays wallet balance information and network switching UI
 */
export function WalletBalanceSection({
    pool,
    baseToken,
    quoteToken,
    baseBalance,
    quoteBalance,
    baseBalanceLoading,
    quoteBalanceLoading,
    isConnected,
    isWrongNetwork,
    chain,
}: WalletBalanceSectionProps) {
    const t = useTranslations();
    const { openConnectModal } = useConnectModal();
    const { switchChain, isPending: isSwitchingNetwork } = useSwitchChain();

    const expectedChainName = getChainConfig(chain)?.shortName;

    return (
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
                                        onClick={() => switchChain({ chainId: getChainId(chain) })}
                                        disabled={isSwitchingNetwork}
                                        className="text-amber-400 hover:text-amber-300 disabled:text-amber-400/50 underline decoration-dashed underline-offset-2 text-sm font-medium transition-colors flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
                                    >
                                        {isSwitchingNetwork ? (
                                            <>
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                                {t("positionWizard.openPositionFinal.switching")}
                                            </>
                                        ) : (
                                            t("positionWizard.openPositionFinal.switchToNetwork", {
                                                chainName: expectedChainName || '',
                                            })
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
                                    {formatCompactValue(
                                        baseBalance,
                                        pool.token0.address.toLowerCase() === baseToken.toLowerCase()
                                            ? pool.token0.decimals
                                            : pool.token1.decimals
                                    )}{' '}
                                    {pool.token0.address.toLowerCase() === baseToken.toLowerCase()
                                        ? pool.token0.symbol
                                        : pool.token1.symbol}{' '}
                                    +{' '}
                                    {formatCompactValue(
                                        quoteBalance,
                                        pool.token0.address.toLowerCase() === quoteToken.toLowerCase()
                                            ? pool.token0.decimals
                                            : pool.token1.decimals
                                    )}{' '}
                                    {pool.token0.address.toLowerCase() === quoteToken.toLowerCase()
                                        ? pool.token0.symbol
                                        : pool.token1.symbol}
                                </span>
                            )}
                        </>
                    ) : (
                        <>
                            <span className="text-slate-400 font-medium">
                                --{' '}
                                {pool.token0.address.toLowerCase() === baseToken.toLowerCase()
                                    ? pool.token0.symbol
                                    : pool.token1.symbol}{' '}
                                + --{' '}
                                {pool.token0.address.toLowerCase() === quoteToken.toLowerCase()
                                    ? pool.token0.symbol
                                    : pool.token1.symbol}
                            </span>
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
    );
}
