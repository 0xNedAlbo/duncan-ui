"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowLeft, RefreshCw, Copy, ExternalLink } from "lucide-react";
import { useTranslations } from "@/i18n/client";
import Link from "next/link";
import type { ChainConfig } from "@/config/chains";
import type { BasicPosition } from "@/services/positions/positionService";
interface PositionHeaderProps {
    position: BasicPosition;
    chainSlug: string;
    nftId: string;
    chainConfig: ChainConfig;
    onRefresh: () => Promise<void>;
    isRefreshing: boolean;
}

// Helper function to get token data from PositionWithPnL structure
function getTokenData(token: any) {
    if (!token) return null;

    return {
        symbol: token.symbol,
        name: token.name,
        logoUrl: token.logoUrl,
        address: token.address || token.id,
        decimals: token.decimals,
    };
}

export function PositionHeader({
    position,
    chainSlug,
    nftId,
    chainConfig,
    onRefresh,
    isRefreshing,
}: PositionHeaderProps) {
    const t = useTranslations();
    const [copied, setCopied] = useState(false);

    const copyNftId = async () => {
        try {
            await navigator.clipboard.writeText(nftId);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy NFT ID:", err);
        }
    };

    const getChainExplorerUrl = (nftId: string) => {
        const uniswapV3NFTAddresses = {
            ethereum: "0xc36442b4a4522e871399cd717abdd847ab11fe88",
            arbitrum: "0xc36442b4a4522e871399cd717abdd847ab11fe88",
            base: "0x03a520b32c04bf3beef7beb72e919cf822ed34f1",
        };

        const contractAddress =
            uniswapV3NFTAddresses[
                chainSlug as keyof typeof uniswapV3NFTAddresses
            ];

        if (contractAddress) {
            return `${chainConfig.explorer}/token/${contractAddress}?a=${nftId}`;
        }
        return null;
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "active":
                return "text-green-400 bg-green-500/10 border-green-500/20";
            case "closed":
                return "text-slate-400 bg-slate-500/10 border-slate-500/20";
            case "liquidated":
                return "text-red-400 bg-red-500/10 border-red-500/20";
            default:
                return "text-slate-400 bg-slate-500/10 border-slate-500/20";
        }
    };

    return (
        <div className="mb-8">
            {/* Back Navigation */}
            <div className="mb-6">
                <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    {t("positionDetails.header.backToDashboard")}
                </Link>
            </div>

            {/* Main Header */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 px-8 py-6">
                <div className="flex items-start justify-between">
                    {/* Left Side - Token Info */}
                    <div className="flex items-center gap-6">
                        {/* Token Logos */}
                        <div className="flex items-center -space-x-3">
                            {(() => {
                                const token0 = getTokenData(
                                    position.pool?.token0
                                );
                                const token1 = getTokenData(
                                    position.pool?.token1
                                );

                                return (
                                    <>
                                        <Image
                                            src={
                                                token0?.logoUrl ||
                                                "/images/tokens/default.png"
                                            }
                                            alt={token0?.symbol || "Token 0"}
                                            width={48}
                                            height={48}
                                            className="w-12 h-12 rounded-full border-3 border-slate-800 bg-slate-700 z-10"
                                        />
                                        <Image
                                            src={
                                                token1?.logoUrl ||
                                                "/images/tokens/default.png"
                                            }
                                            alt={token1?.symbol || "Token 1"}
                                            width={48}
                                            height={48}
                                            className="w-12 h-12 rounded-full border-3 border-slate-800 bg-slate-700"
                                        />
                                    </>
                                );
                            })()}
                        </div>

                        {/* Position Info */}
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h1 className="text-2xl font-bold text-white">
                                    {position.pool?.token0?.symbol || "Token0"}/
                                    {position.pool?.token1?.symbol || "Token1"}
                                </h1>
                                <span
                                    className={`px-3 py-1 rounded-lg text-sm font-medium border ${getStatusColor(
                                        position.status || "active"
                                    )}`}
                                >
                                    {(() => {
                                        const status =
                                            position.status || "active";
                                        switch (status) {
                                            case "active":
                                                return t(
                                                    "positionDetails.status.active"
                                                );
                                            case "closed":
                                                return t(
                                                    "positionDetails.status.closed"
                                                );
                                            case "archived":
                                                return t(
                                                    "positionDetails.status.archived"
                                                );
                                            case "liquidated":
                                                return t(
                                                    "positionDetails.status.liquidated"
                                                );
                                            default:
                                                return t(
                                                    "positionDetails.status.active"
                                                );
                                        }
                                    })()}
                                </span>
                            </div>

                            <div className="flex items-center gap-4 text-sm text-slate-400">
                                {/* Chain */}
                                <span className="px-2 py-1 rounded bg-slate-500/20 border border-slate-500/30 text-slate-300">
                                    {chainConfig.shortName}
                                </span>

                                {/* Fee */}
                                <span>
                                    {t("positionDetails.header.fee")}:{" "}
                                    {position.pool?.fee
                                        ? (position.pool.fee / 10000).toFixed(2)
                                        : "0.00"}
                                    %
                                </span>

                                {/* NFT ID */}
                                <span>•</span>
                                <div className="flex items-center gap-2">
                                    <span>
                                        {t("positionDetails.header.nftId")}: #
                                        {nftId}
                                    </span>
                                    <button
                                        onClick={copyNftId}
                                        className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                                        title={t(
                                            "positionDetails.header.copyId"
                                        )}
                                    >
                                        <Copy className="w-3 h-3" />
                                    </button>
                                    {getChainExplorerUrl(nftId) && (
                                        <a
                                            href={getChainExplorerUrl(nftId)!}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                                            title={t(
                                                "positionDetails.header.viewOnExplorer"
                                            )}
                                        >
                                            <ExternalLink className="w-3 h-3" />
                                        </a>
                                    )}
                                    {copied && (
                                        <div className="absolute mt-8 bg-green-600 text-white text-xs px-2 py-1 rounded shadow-lg z-20">
                                            {t("common.copied")}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Side - Actions */}
                    <div className="flex items-center gap-3">
                        {/* Last Updated */}
                        <div className="text-right text-sm text-slate-400">
                            <div>{t("positionDetails.header.lastUpdated")}</div>
                            <div>
                                {position.updatedAt
                                    ? new Date(
                                          position.updatedAt
                                      ).toLocaleString()
                                    : "-"}
                            </div>
                        </div>

                        {/* Refresh Button */}
                        <button
                            onClick={onRefresh}
                            disabled={isRefreshing}
                            className="p-3 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                            title={t("positionDetails.header.refresh")}
                        >
                            <RefreshCw
                                className={`w-5 h-5 ${
                                    isRefreshing ? "animate-spin" : ""
                                }`}
                            />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
