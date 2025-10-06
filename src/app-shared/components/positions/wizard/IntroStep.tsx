"use client";

import { Target, TrendingUp, Shield, BarChart3 } from "lucide-react";
import { useTranslations } from "@/i18n/client";

export function IntroStep() {
    const t = useTranslations();

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="text-center space-y-4">
                <h3 className="text-2xl font-bold text-white">
                    {t("positionWizard.openPosition.title")}
                </h3>
                <p className="text-slate-300 text-lg leading-relaxed">
                    {t("positionWizard.openPosition.subtitle")}
                </p>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-3">
                        <Target className="w-6 h-6 text-blue-400" />
                        <h4 className="font-semibold text-white">
                            {t("positionWizard.openPosition.features.planning.title")}
                        </h4>
                    </div>
                    <p className="text-slate-400 text-sm">
                        {t("positionWizard.openPosition.features.planning.description")}
                    </p>
                </div>

                <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-3">
                        <TrendingUp className="w-6 h-6 text-green-400" />
                        <h4 className="font-semibold text-white">
                            {t("positionWizard.openPosition.features.visualization.title")}
                        </h4>
                    </div>
                    <p className="text-slate-400 text-sm">
                        {t("positionWizard.openPosition.features.visualization.description")}
                    </p>
                </div>

                <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-3">
                        <Shield className="w-6 h-6 text-orange-400" />
                        <h4 className="font-semibold text-white">
                            {t("positionWizard.openPosition.features.risk.title")}
                        </h4>
                    </div>
                    <p className="text-slate-400 text-sm">
                        {t("positionWizard.openPosition.features.risk.description")}
                    </p>
                </div>
            </div>

            {/* Process Steps */}
            <div className="bg-slate-800/20 backdrop-blur-sm border border-slate-700/30 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-blue-400" />
                    {t("positionWizard.openPosition.process.title")}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                            1
                        </div>
                        <span className="text-slate-300 text-sm">
                            {t("positionWizard.openPosition.process.step1")}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                            2
                        </div>
                        <span className="text-slate-300 text-sm">
                            {t("positionWizard.openPosition.process.step2")}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                            3
                        </div>
                        <span className="text-slate-300 text-sm">
                            {t("positionWizard.openPosition.process.step3")}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                            4
                        </div>
                        <span className="text-slate-300 text-sm">
                            {t("positionWizard.openPosition.process.step4")}
                        </span>
                    </div>
                </div>
            </div>

            {/* Warning Notice */}
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
                <h5 className="text-orange-400 font-medium mb-2">
                    {t("positionWizard.openPosition.warning.title")}
                </h5>
                <p className="text-orange-200/80 text-sm">
                    {t("positionWizard.openPosition.warning.message")}
                </p>
            </div>
        </div>
    );
}