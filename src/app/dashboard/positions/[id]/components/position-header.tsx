"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowLeft, RefreshCw, Copy, ExternalLink } from "lucide-react";
import { useTranslations } from "@/i18n/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface PositionHeaderProps {
    positionId: string;
}

export function PositionHeader({ positionId }: PositionHeaderProps) {
    const t = useTranslations();
    const router = useRouter();
    const [copied, setCopied] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // TODO: Fetch actual position data
    // For now using mock data for layout
    const mockPosition = {
        tokenPair: "WETH/USDC",
        chain: "ethereum",
        fee: 3000, // 0.30%
        nftId: "12345",
        status: "active",
        token0: {
            symbol: "WETH",
            logoUrl: "https://tokens.1inch.io/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2.png"
        },
        token1: {
            symbol: "USDC",
            logoUrl: "https://tokens.1inch.io/0xa0b86a33e6441df2a4a12e2d442c4f38c4c4b7c8.png"
        },
        lastUpdated: new Date()
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        // TODO: Implement refresh logic
        setTimeout(() => setIsRefreshing(false), 2000);
    };

    const copyPositionId = async () => {
        try {
            await navigator.clipboard.writeText(positionId);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy position ID:", err);
        }
    };

    const getChainExplorerUrl = (chain: string, nftId: string) => {
        const uniswapV3NFTAddresses = {
            ethereum: "0xc36442b4a4522e871399cd717abdd847ab11fe88",
            arbitrum: "0xc36442b4a4522e871399cd717abdd847ab11fe88",
            base: "0x03a520b32c04bf3beef7beb72e919cf822ed34f1",
        };

        const explorers = {
            ethereum: "https://etherscan.io",
            arbitrum: "https://arbiscan.io",
            base: "https://basescan.org",
        };

        const contractAddress = uniswapV3NFTAddresses[chain.toLowerCase() as keyof typeof uniswapV3NFTAddresses];
        const explorerUrl = explorers[chain.toLowerCase() as keyof typeof explorers];

        if (contractAddress && explorerUrl) {
            return `${explorerUrl}/token/${contractAddress}?a=${nftId}`;
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
                            <Image
                                src={mockPosition.token0.logoUrl}
                                alt={mockPosition.token0.symbol}
                                width={48}
                                height={48}
                                className="w-12 h-12 rounded-full border-3 border-slate-800 bg-slate-700 z-10"
                            />
                            <Image
                                src={mockPosition.token1.logoUrl}
                                alt={mockPosition.token1.symbol}
                                width={48}
                                height={48}
                                className="w-12 h-12 rounded-full border-3 border-slate-800 bg-slate-700"
                            />
                        </div>

                        {/* Position Info */}
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h1 className="text-2xl font-bold text-white">
                                    {mockPosition.tokenPair}
                                </h1>
                                <span className={`px-3 py-1 rounded-lg text-sm font-medium border ${getStatusColor(mockPosition.status)}`}>
                                    {t(`positionDetails.status.${mockPosition.status}`)}
                                </span>
                            </div>
                            
                            <div className="flex items-center gap-4 text-sm text-slate-400">
                                {/* Chain */}
                                <span className="px-2 py-1 rounded bg-slate-500/20 border border-slate-500/30 text-slate-300">
                                    {mockPosition.chain.charAt(0).toUpperCase() + mockPosition.chain.slice(1)}
                                </span>
                                
                                {/* Fee */}
                                <span>
                                    {t("positionDetails.header.fee")}: {(mockPosition.fee / 10000).toFixed(2)}%
                                </span>
                                
                                {/* NFT ID */}
                                {mockPosition.nftId && (
                                    <>
                                        <span>•</span>
                                        <div className="flex items-center gap-2">
                                            <span>{t("positionDetails.header.nftId")}: #{mockPosition.nftId}</span>
                                            <button
                                                onClick={copyPositionId}
                                                className="p-1 text-slate-400 hover:text-white transition-colors"
                                                title={t("positionDetails.header.copyId")}
                                            >
                                                <Copy className="w-3 h-3" />
                                            </button>
                                            {getChainExplorerUrl(mockPosition.chain, mockPosition.nftId) && (
                                                <a
                                                    href={getChainExplorerUrl(mockPosition.chain, mockPosition.nftId)!}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-1 text-slate-400 hover:text-white transition-colors"
                                                    title={t("positionDetails.header.viewOnExplorer")}
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
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Side - Actions */}
                    <div className="flex items-center gap-3">
                        {/* Last Updated */}
                        <div className="text-right text-sm text-slate-400">
                            <div>{t("positionDetails.header.lastUpdated")}</div>
                            <div>{mockPosition.lastUpdated.toLocaleString()}</div>
                        </div>

                        {/* Refresh Button */}
                        <button
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            className="p-3 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors disabled:opacity-50"
                            title={t("positionDetails.header.refresh")}
                        >
                            <RefreshCw className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}