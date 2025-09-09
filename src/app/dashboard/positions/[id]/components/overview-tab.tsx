"use client";

import { useTranslations } from "@/i18n/client";

interface OverviewTabProps {
    positionId: string;
}

export function OverviewTab({ positionId }: OverviewTabProps) {
    const t = useTranslations();

    return (
        <div className="space-y-6">
            {/* Placeholder content for overview tab */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-8 text-center">
                <h2 className="text-xl font-semibold text-white mb-4">
                    {t("positionDetails.tabs.overview")}
                </h2>
                <p className="text-slate-400">
                    {t("positionDetails.overview.placeholder")} - Position ID: {positionId}
                </p>
            </div>
        </div>
    );
}