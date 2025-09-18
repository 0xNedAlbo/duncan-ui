"use client";

import { useTranslations } from "@/i18n/client";
import { usePositionEvents, usePosition } from "@/hooks/api/usePositions";
import { usePositionPnL } from "@/hooks/api/usePositionPnL";
import { PnLBreakdown } from "@/components/positions/pnl-breakdown";
import { EventsTable } from "./events-table";

interface EventsTabProps {
    chainSlug: string;
    nftId: string;
}

export function EventsTab({ chainSlug, nftId }: EventsTabProps) {
    const t = useTranslations();

    // Fetch position data for PnL breakdown
    const { data: position } = usePosition(chainSlug, nftId);

    // Fetch PnL data
    const {
        data: pnlData,
        isLoading: pnlLoading,
        error: pnlError,
    } = usePositionPnL(chainSlug, nftId);

    const {
        data: eventsData,
        isLoading: eventsLoading,
        error: eventsError
    } = usePositionEvents(chainSlug, nftId, {
        limit: 100, // Increased to show more events
        sortOrder: 'desc'
    });

    // Get quote token info for PnL breakdown
    const quoteToken = position?.token0IsQuote
        ? position.pool.token0
        : position.pool.token1;
    const quoteTokenDecimals = quoteToken?.decimals;

    if (eventsError) {
        return (
            <div className="space-y-6">
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-8 text-center">
                    <h2 className="text-xl font-semibold text-white mb-4">
                        {t("positionDetails.tabs.ledger")}
                    </h2>
                    <div className="text-red-400 mb-4">
                        Error loading events: {eventsError.message}
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
            {/* PnL Breakdown */}
            {pnlData && quoteToken && quoteTokenDecimals && (
                <PnLBreakdown
                    pnlData={pnlData}
                    quoteToken={quoteToken}
                    quoteTokenDecimals={quoteTokenDecimals}
                />
            )}

            {/* Events Table */}
            <EventsTable
                events={eventsData?.events || []}
                isLoading={eventsLoading}
                chainSlug={chainSlug}
                quoteToken={quoteToken}
                token0={position?.pool.token0}
                token1={position?.pool.token1}
            />
        </div>
    );
}