"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "@/i18n/client";
import { BarChart3, Clock, Target, DollarSign, TrendingUp } from "lucide-react";

interface PositionTabsProps {
    activeTab: string;
    chainSlug: string;
    nftId: string;
}

const tabs = [
    {
        id: "overview",
        icon: BarChart3,
        translationKey: "overview",
    },
    {
        id: "events",
        icon: Clock,
        translationKey: "events",
    },
    {
        id: "range",
        icon: Target,
        translationKey: "range",
        comingSoon: true,
    },
    {
        id: "fees",
        icon: DollarSign,
        translationKey: "fees",
        comingSoon: true,
    },
    {
        id: "analytics",
        icon: TrendingUp,
        translationKey: "analytics",
        comingSoon: true,
    },
];

export function PositionTabs({ activeTab, chainSlug, nftId }: PositionTabsProps) {
    const t = useTranslations();
    const router = useRouter();
    const searchParams = useSearchParams();

    const handleTabChange = (tabId: string) => {
        const params = new URLSearchParams(searchParams);
        if (tabId === "overview") {
            params.delete("tab");
        } else {
            params.set("tab", tabId);
        }
        
        const queryString = params.toString();
        const url = `/position/uniswapv3/nft/${chainSlug}/${nftId}${queryString ? `?${queryString}` : ""}`;
        router.push(url);
    };

    return (
        <div className="border-b border-slate-700/50">
            <nav className="flex space-x-8">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    const isDisabled = tab.comingSoon;

                    return (
                        <button
                            key={tab.id}
                            onClick={() => !isDisabled && handleTabChange(tab.id)}
                            disabled={isDisabled}
                            className={`
                                relative flex items-center gap-2 py-4 px-1 text-sm font-medium transition-colors
                                ${isActive
                                    ? "text-white border-b-2 border-blue-500"
                                    : isDisabled
                                    ? "text-slate-500 cursor-not-allowed"
                                    : "text-slate-400 hover:text-slate-300"
                                }
                            `}
                        >
                            <Icon className="w-4 h-4" />
                            <span>{t(`positionDetails.tabs.${tab.translationKey}`)}</span>
                            
                            {tab.comingSoon && (
                                <span className="ml-1 px-1.5 py-0.5 text-xs bg-slate-600 text-slate-300 rounded">
                                    {t("common.comingSoon")}
                                </span>
                            )}

                            {/* Active tab indicator */}
                            {isActive && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full" />
                            )}
                        </button>
                    );
                })}
            </nav>
        </div>
    );
}