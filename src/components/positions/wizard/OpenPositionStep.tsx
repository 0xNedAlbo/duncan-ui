"use client";

import { Target, TrendingUp, Shield, ArrowRight } from "lucide-react";
import { useTranslations } from "@/i18n/client";

interface OpenPositionStepProps {
    onNext: () => void;
}

export function OpenPositionStep({ onNext }: OpenPositionStepProps) {
    const t = useTranslations();

    const features = [
        {
            icon: Target,
            title: t("positionWizard.openPosition.features.planning.title"),
            description: t("positionWizard.openPosition.features.planning.description"),
            color: "text-blue-400",
            bgColor: "bg-blue-500/10",
        },
        {
            icon: TrendingUp,
            title: t("positionWizard.openPosition.features.visualization.title"),
            description: t("positionWizard.openPosition.features.visualization.description"),
            color: "text-green-400",
            bgColor: "bg-green-500/10",
        },
        {
            icon: Shield,
            title: t("positionWizard.openPosition.features.risk.title"),
            description: t("positionWizard.openPosition.features.risk.description"),
            color: "text-amber-400",
            bgColor: "bg-amber-500/10",
        },
    ];

    return (
        <div className="space-y-8">
            {/* Hero Section */}
            <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <Target className="w-8 h-8 text-white" />
                </div>

                <h3 className="text-2xl font-bold text-white">
                    {t("positionWizard.openPosition.title")}
                </h3>

                <p className="text-lg text-slate-300 max-w-2xl mx-auto">
                    {t("positionWizard.openPosition.subtitle")}
                </p>
            </div>

            {/* Process Overview */}
            <div className="bg-slate-800/30 border border-slate-700/30 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-white mb-4">
                    {t("positionWizard.openPosition.process.title")}
                </h4>

                <div className="grid md:grid-cols-4 gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-sm font-bold text-white">
                            1
                        </div>
                        <span className="text-slate-300 text-sm">
                            {t("positionWizard.openPosition.process.step1")}
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-sm font-bold text-white">
                            2
                        </div>
                        <span className="text-slate-300 text-sm">
                            {t("positionWizard.openPosition.process.step2")}
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-sm font-bold text-white">
                            3
                        </div>
                        <span className="text-slate-300 text-sm">
                            {t("positionWizard.openPosition.process.step3")}
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-sm font-bold text-white">
                            4
                        </div>
                        <span className="text-slate-300 text-sm">
                            {t("positionWizard.openPosition.process.step4")}
                        </span>
                    </div>
                </div>
            </div>

            {/* Features Grid */}
            <div className="grid md:grid-cols-3 gap-6">
                {features.map((feature, index) => {
                    const Icon = feature.icon;
                    return (
                        <div
                            key={index}
                            className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-lg p-6 space-y-4"
                        >
                            <div
                                className={`w-12 h-12 ${feature.bgColor} rounded-lg flex items-center justify-center`}
                            >
                                <Icon className={`w-6 h-6 ${feature.color}`} />
                            </div>

                            <h4 className="text-lg font-semibold text-white">
                                {feature.title}
                            </h4>

                            <p className="text-slate-300">
                                {feature.description}
                            </p>
                        </div>
                    );
                })}
            </div>

            {/* Get Started Button */}
            <div className="flex justify-center pt-4">
                <button
                    onClick={onNext}
                    className="flex items-center gap-3 px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105"
                >
                    {t("positionWizard.openPosition.getStarted")}
                    <ArrowRight className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}