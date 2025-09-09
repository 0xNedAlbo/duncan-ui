"use client";

import { useTranslations } from "@/i18n/client";

interface EventsTabProps {
    chainSlug: string;
    nftId: string;
}

export function EventsTab({ chainSlug, nftId }: EventsTabProps) {
    const t = useTranslations();

    return (
        <div className="space-y-6">
            {/* Placeholder content for events tab */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-8 text-center">
                <h2 className="text-xl font-semibold text-white mb-4">
                    {t("positionDetails.tabs.events")}
                </h2>
                <p className="text-slate-400 mb-2">
                    {t("positionDetails.events.placeholder")}
                </p>
                <p className="text-slate-500 text-sm">
                    Chain: {chainSlug} | NFT ID: #{nftId}
                </p>
            </div>
        </div>
    );
}