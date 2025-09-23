"use client";

import { useTranslations } from "@/i18n/client";
import type { TokenPair, PoolOption } from "./types";

interface PoolSelectionStepProps {
    tokenPair: TokenPair;
    selectedPool: PoolOption | null;
    onPoolSelect: (pool: PoolOption) => void;
    onNext: () => void;
    onBack: () => void;
}

export function PoolSelectionStep({
    tokenPair,
    // eslint-disable-next-line no-unused-vars
    selectedPool,
    // eslint-disable-next-line no-unused-vars
    onPoolSelect,
    // eslint-disable-next-line no-unused-vars
    onNext,
    // eslint-disable-next-line no-unused-vars
    onBack,
}: PoolSelectionStepProps) {
    const t = useTranslations();

    // Mock pool data - in real implementation, this would come from API
    const mockPools: Omit<PoolOption, "pool">[] = [
        {
            fee: 500,
            feePercentage: "0.05%",
            tickSpacing: 10,
            liquidity: BigInt("1234567890123456789"),
            volume24h: BigInt("987654321012345678"),
            tvl: BigInt("456789012345678901"),
        },
        {
            fee: 3000,
            feePercentage: "0.3%",
            tickSpacing: 60,
            liquidity: BigInt("9876543210987654321"),
            volume24h: BigInt("123456789012345678"),
            tvl: BigInt("789012345678901234"),
        },
        {
            fee: 10000,
            feePercentage: "1.0%",
            tickSpacing: 200,
            liquidity: BigInt("555666777888999000"),
            volume24h: BigInt("111222333444555666"),
            tvl: BigInt("777888999000111222"),
        },
    ];

    const formatLargeNumber = (value: bigint): string => {
        const num = Number(value) / 1e18; // Convert from wei assuming 18 decimals
        if (num >= 1e9) return `$${(num / 1e9).toFixed(1)}B`;
        if (num >= 1e6) return `$${(num / 1e6).toFixed(1)}M`;
        if (num >= 1e3) return `$${(num / 1e3).toFixed(1)}K`;
        return `$${num.toFixed(2)}`;
    };

    return (
        <div className="space-y-6">
            <div className="text-center">
                <p className="text-slate-300 mb-4">
                    {t("positionWizard.poolSelection.description")}
                </p>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full text-sm text-purple-400">
                    {t("positionWizard.poolSelection.selectedPair")}:{" "}
                    <span className="font-semibold">
                        {tokenPair.baseToken.symbol}/{tokenPair.quoteToken.symbol}
                    </span>
                </div>
            </div>

            {/* Pool Options */}
            <div className="space-y-4">
                {mockPools.map((poolData, index) => (
                    <button
                        key={index}
                        onClick={() => {
                            // TODO: Create actual PoolOption with real pool data
                            console.log("Pool selection - to be implemented", poolData);
                        }}
                        className={`w-full p-4 border-2 rounded-lg transition-all text-left ${
                            selectedPool?.fee === poolData.fee
                                ? "border-blue-500 bg-blue-500/10"
                                : "border-slate-700 hover:border-slate-600 bg-slate-800/50"
                        }`}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <div className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm font-medium">
                                    {poolData.feePercentage}
                                </div>
                                <h4 className="text-lg font-semibold text-white">
                                    {t("positionWizard.poolSelection.feeTitle", {
                                        fee: poolData.feePercentage,
                                    })}
                                </h4>
                            </div>
                            {poolData.fee === 3000 && (
                                <div className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs font-medium">
                                    {t("positionWizard.poolSelection.recommended")}
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                                <p className="text-slate-400 mb-1">
                                    {t("positionWizard.poolSelection.liquidity")}
                                </p>
                                <p className="text-white font-medium">
                                    {formatLargeNumber(poolData.liquidity)}
                                </p>
                            </div>
                            <div>
                                <p className="text-slate-400 mb-1">
                                    {t("positionWizard.poolSelection.volume24h")}
                                </p>
                                <p className="text-white font-medium">
                                    {formatLargeNumber(poolData.volume24h!)}
                                </p>
                            </div>
                            <div>
                                <p className="text-slate-400 mb-1">
                                    {t("positionWizard.poolSelection.tvl")}
                                </p>
                                <p className="text-white font-medium">
                                    {formatLargeNumber(poolData.tvl!)}
                                </p>
                            </div>
                        </div>
                    </button>
                ))}
            </div>

            {/* Fee Tier Explanation */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
                <h4 className="text-white font-semibold mb-2">
                    {t("positionWizard.poolSelection.feeExplanation.title")}
                </h4>
                <div className="space-y-2 text-sm text-slate-300">
                    <p>
                        <span className="text-blue-400 font-medium">0.05%:</span>{" "}
                        {t("positionWizard.poolSelection.feeExplanation.low")}
                    </p>
                    <p>
                        <span className="text-green-400 font-medium">0.3%:</span>{" "}
                        {t("positionWizard.poolSelection.feeExplanation.medium")}
                    </p>
                    <p>
                        <span className="text-amber-400 font-medium">1.0%:</span>{" "}
                        {t("positionWizard.poolSelection.feeExplanation.high")}
                    </p>
                </div>
            </div>

            {/* Implementation Note */}
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                <p className="text-amber-200 text-sm">
                    {t("positionWizard.poolSelection.implementationNote")}
                </p>
            </div>
        </div>
    );
}