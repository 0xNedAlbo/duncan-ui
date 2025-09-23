"use client";

import { useState } from "react";
import { Settings, TrendingUp } from "lucide-react";
import { useTranslations } from "@/i18n/client";
import type { PoolWithTokens } from "@/services/pools/poolService";
import type { PositionConfig } from "./types";

interface PositionConfigStepProps {
    pool: PoolWithTokens;
    config: PositionConfig | null;
    onConfigChange: (config: PositionConfig) => void;
    onCreatePosition: () => void;
    onBack: () => void;
}

export function PositionConfigStep({
    pool,
    // eslint-disable-next-line no-unused-vars
    config,
    onConfigChange,
    // eslint-disable-next-line no-unused-vars
    onCreatePosition,
    // eslint-disable-next-line no-unused-vars
    onBack,
}: PositionConfigStepProps) {
    const t = useTranslations();
    const [lowerPrice, setLowerPrice] = useState("1500");
    const [upperPrice, setUpperPrice] = useState("2500");
    const [liquidityAmount, setLiquidityAmount] = useState("1000");

    // Mock current price - in real implementation, this would come from pool data
    const currentPrice = 2000;

    const handleConfigUpdate = () => {
        // TODO: Implement actual position configuration
        const mockConfig: PositionConfig = {
            lowerPrice: BigInt(Math.floor(parseFloat(lowerPrice) * 1e6)),
            upperPrice: BigInt(Math.floor(parseFloat(upperPrice) * 1e6)),
            liquidityAmount: BigInt(Math.floor(parseFloat(liquidityAmount) * 1e18)),
            baseTokenAmount: BigInt("500000000000000000"), // Mock 0.5 ETH
            quoteTokenAmount: BigInt("1000000000"), // Mock 1000 USDC
            expectedFees: BigInt("50000000"), // Mock 50 USDC
        };
        onConfigChange(mockConfig);
    };

    return (
        <div className="space-y-6">
            <div className="text-center">
                <p className="text-slate-300 mb-4">
                    {t("positionWizard.positionConfig.description")}
                </p>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full text-sm text-green-400">
                    {t("positionWizard.positionConfig.selectedPool")}:{" "}
                    <span className="font-semibold">
                        {pool.token0.symbol}/{pool.token1.symbol} ({pool.fee / 10000}%)
                    </span>
                </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
                {/* Configuration Controls */}
                <div className="space-y-6">
                    <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Settings className="w-5 h-5 text-blue-400" />
                            <h4 className="text-lg font-semibold text-white">
                                {t("positionWizard.positionConfig.priceRange")}
                            </h4>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    {t("positionWizard.positionConfig.lowerPrice")}
                                </label>
                                <input
                                    type="number"
                                    value={lowerPrice}
                                    onChange={(e) => {
                                        setLowerPrice(e.target.value);
                                        handleConfigUpdate();
                                    }}
                                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="1500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    {t("positionWizard.positionConfig.upperPrice")}
                                </label>
                                <input
                                    type="number"
                                    value={upperPrice}
                                    onChange={(e) => {
                                        setUpperPrice(e.target.value);
                                        handleConfigUpdate();
                                    }}
                                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="2500"
                                />
                            </div>

                            <div className="flex items-center justify-center py-2">
                                <div className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm">
                                    {t("positionWizard.positionConfig.currentPrice")}: ${currentPrice}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    {t("positionWizard.positionConfig.liquidityAmount")} (USD)
                                </label>
                                <input
                                    type="number"
                                    value={liquidityAmount}
                                    onChange={(e) => {
                                        setLiquidityAmount(e.target.value);
                                        handleConfigUpdate();
                                    }}
                                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="1000"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Position Summary */}
                    <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-6">
                        <h4 className="text-lg font-semibold text-white mb-4">
                            {t("positionWizard.positionConfig.positionSummary")}
                        </h4>

                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-slate-400">
                                    {t("positionWizard.positionConfig.summary.baseToken")}:
                                </span>
                                <span className="text-white">~0.5 {pool.token0.symbol}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">
                                    {t("positionWizard.positionConfig.summary.quoteToken")}:
                                </span>
                                <span className="text-white">~1,000 {pool.token1.symbol}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">
                                    {t("positionWizard.positionConfig.summary.expectedFees")}:
                                </span>
                                <span className="text-green-400">~$50 / month</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">
                                    {t("positionWizard.positionConfig.summary.priceRange")}:
                                </span>
                                <span className="text-white">${lowerPrice} - ${upperPrice}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Enhanced PnL Curve Preview */}
                <div className="space-y-6">
                    <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <TrendingUp className="w-5 h-5 text-green-400" />
                            <h4 className="text-lg font-semibold text-white">
                                {t("positionWizard.positionConfig.pnlPreview")}
                            </h4>
                        </div>

                        {/* Mock PnL Curve Placeholder */}
                        <div className="h-64 bg-slate-700/50 rounded-lg flex items-center justify-center border-2 border-dashed border-slate-600">
                            <div className="text-center">
                                <TrendingUp className="w-12 h-12 text-slate-500 mx-auto mb-2" />
                                <p className="text-slate-400">
                                    {t("positionWizard.positionConfig.pnlPlaceholder")}
                                </p>
                                <p className="text-slate-500 text-sm mt-1">
                                    {t("positionWizard.positionConfig.enhancedCurveNote")}
                                </p>
                            </div>
                        </div>

                        {/* Risk Metrics */}
                        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                            <div className="bg-slate-700/50 rounded-lg p-3">
                                <p className="text-slate-400 mb-1">
                                    {t("positionWizard.positionConfig.metrics.maxLoss")}
                                </p>
                                <p className="text-red-400 font-medium">-15.2%</p>
                            </div>
                            <div className="bg-slate-700/50 rounded-lg p-3">
                                <p className="text-slate-400 mb-1">
                                    {t("positionWizard.positionConfig.metrics.expectedAPR")}
                                </p>
                                <p className="text-green-400 font-medium">12.4%</p>
                            </div>
                        </div>
                    </div>

                    {/* Risk Warning */}
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                        <h5 className="text-amber-400 font-medium mb-2">
                            {t("positionWizard.positionConfig.riskWarning.title")}
                        </h5>
                        <p className="text-amber-200/80 text-sm">
                            {t("positionWizard.positionConfig.riskWarning.message")}
                        </p>
                    </div>
                </div>
            </div>

            {/* Implementation Note */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <p className="text-blue-200 text-sm">
                    {t("positionWizard.positionConfig.implementationNote")}
                </p>
            </div>
        </div>
    );
}