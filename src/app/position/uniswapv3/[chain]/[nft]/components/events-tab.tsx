"use client";

import { useTranslations } from "@/app-shared/i18n/client";
import { usePositionLedger } from "@/app-shared/hooks/api/usePositionLedger";
import { usePosition } from "@/app-shared/hooks/api/usePosition";
import { PnLBreakdown } from "@/app-shared/components/positions/pnl-breakdown";
import { EventsTable } from "./events-table";

interface EventsTabProps {
    chainSlug: string;
    nftId: string;
}

export function EventsTab({ chainSlug, nftId }: EventsTabProps) {
    const t = useTranslations();

    // TODO: Need to get userId from auth context once available
    const userId = "temp-user-id"; // Placeholder
    const protocol = "uniswapv3";

    // Get position data using ReactQuery
    const {
        data: positionDetails,
        error: positionError,
    } = usePosition(userId, chainSlug, protocol, nftId, {
        enabled: Boolean(nftId && chainSlug),
    });

    const position = positionDetails?.basicData;
    const pnlData = positionDetails?.pnlBreakdown;

    const {
        data: eventsData,
        isLoading: eventsLoading,
        error: eventsError
    } = usePositionLedger(userId, chainSlug, protocol, nftId, {
        limit: 100,
        sortOrder: 'desc'
    });

    // Get quote token info for PnL breakdown
    const quoteToken = position?.token0IsQuote
        ? position?.pool.token0
        : position?.pool.token1;
    const quoteTokenDecimals = quoteToken?.decimals;

    if (eventsError || positionError) {
        return (
            <div className="space-y-6">
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-8 text-center">
                    <h2 className="text-xl font-semibold text-white mb-4">
                        {t("positionDetails.tabs.ledger")}
                    </h2>
                    <div className="text-red-400 mb-4">
                        Error loading data: {eventsError?.message || positionError?.message}
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