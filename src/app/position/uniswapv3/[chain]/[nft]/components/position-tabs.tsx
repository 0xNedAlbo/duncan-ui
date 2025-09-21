"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "@/i18n/client";
import { BarChart3, Clock, TrendingUp, Settings } from "lucide-react";

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
        id: "ledger",
        icon: Clock,
        translationKey: "ledger",
    },
    {
        id: "apr",
        icon: TrendingUp,
        translationKey: "apr",
    },
    {
        id: "technical",
        icon: Settings,
        translationKey: "technical",
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
        const url = `/position/uniswapv3/${chainSlug}/${nftId}${queryString ? `?${queryString}` : ""}`;
        router.push(url);
    };

    return (
        <div className="border-b border-slate-700/50">
            <nav className="flex space-x-8">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;

                    return (
                        <button
                            key={tab.id}
                            onClick={() => handleTabChange(tab.id)}
                            className={`
                                relative flex items-center gap-2 py-4 px-1 text-sm font-medium transition-colors cursor-pointer
                                ${isActive
                                    ? "text-white border-b-2 border-blue-500"
                                    : "text-slate-400 hover:text-slate-300"
                                }
                            `}
                        >
                            <Icon className="w-4 h-4" />
                            <span>{(() => {
                                switch (tab.translationKey) {
                                    case "overview":
                                        return t("positionDetails.tabs.overview");
                                    case "ledger":
                                        return t("positionDetails.tabs.ledger");
                                    case "apr":
                                        return t("positionDetails.tabs.apr");
                                    case "technical":
                                        return t("positionDetails.tabs.technical");
                                    default:
                                        return tab.translationKey;
                                }
                            })()}</span>

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