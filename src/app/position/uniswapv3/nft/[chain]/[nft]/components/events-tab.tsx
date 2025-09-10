"use client";

import { useTranslations } from "@/i18n/client";
import { usePositionEvents } from "@/hooks/api/usePositions";
import { EventsTable } from "./events-table";

interface EventsTabProps {
    chainSlug: string;
    nftId: string;
}

export function EventsTab({ chainSlug, nftId }: EventsTabProps) {
    const t = useTranslations();
    
    const { 
        data: eventsData, 
        isLoading, 
        error 
    } = usePositionEvents(chainSlug, nftId, {
        limit: 100, // Increased to show more events
        sortOrder: 'desc'
    });

    if (error) {
        return (
            <div className="space-y-6">
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-8 text-center">
                    <h2 className="text-xl font-semibold text-white mb-4">
                        {t("positionDetails.tabs.events")}
                    </h2>
                    <div className="text-red-400 mb-4">
                        Error loading events: {error.message}
                    </div>
                    <p className="text-slate-500 text-sm">
                        Chain: {chainSlug} | NFT ID: #{nftId}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header Info */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
                <h2 className="text-xl font-semibold text-white mb-2">
                    {t("positionDetails.tabs.events")}
                </h2>
                <p className="text-slate-400 text-sm mb-3">
                    {t("positionDetails.events.description")}
                </p>
                <div className="flex items-center justify-between text-sm text-slate-400">
                    <span>Chain: {chainSlug} | NFT ID: #{nftId}</span>
                    <span>{t("positionDetails.events.totalEvents")}: {eventsData?.pagination.total || 0}</span>
                </div>
            </div>

            {/* Events Table */}
            <EventsTable 
                events={eventsData?.events || []}
                isLoading={isLoading}
                chainSlug={chainSlug}
            />
        </div>
    );
}