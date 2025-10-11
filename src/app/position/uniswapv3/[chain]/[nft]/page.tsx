"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { redirect, notFound } from "next/navigation";
import { useTranslations } from "@/app-shared/i18n/client";
import { isValidChainSlug, getChainConfigBySlug } from "@/config/chains";
import { usePosition } from "@/app-shared/hooks/api/usePosition";
import { usePositionRefresh } from "@/app-shared/hooks/api/usePositionRefresh";
import { PositionHeader } from "./components/position-header";
import { PositionTabs } from "./components/position-tabs";
import { OverviewTab } from "./components/overview-tab";
import { EventsTab } from "./components/events-tab";
import { AprTab } from "./components/apr-tab";
import { TechnicalDetails } from "./components/technical-details";

export default function UniswapV3PositionPage() {
    const t = useTranslations();
    const { data: session, status } = useSession();
    const params = useParams();
    const searchParams = useSearchParams();

    const chainSlug = params.chain as string;
    const nftId = params.nft as string;
    const activeTab = searchParams.get("tab") || "overview";

    // TODO: Need to get userId from auth context once available
    const userId = "temp-user-id"; // Placeholder
    const protocol = "uniswapv3";

    // Get position data using ReactQuery
    const {
        data: position,
        isLoading,
        error,
    } = usePosition(userId, chainSlug, protocol, nftId, {
        enabled: Boolean(nftId && chainSlug),
    });

    // Refresh mutation
    const refreshMutation = usePositionRefresh();

    // Handle refresh
    const handleRefresh = async () => {
        if (!chainSlug || !nftId) return;

        try {
            await refreshMutation.mutateAsync({
                userId,
                chain: chainSlug,
                protocol,
                nftId,
            });
        } catch (error) {
            console.error("Failed to refresh position:", error);
        }
    };

    // Validate chain slug
    if (!isValidChainSlug(chainSlug)) {
        notFound();
    }

    // Validate NFT ID (should be numeric)
    if (!nftId || !/^\d+$/.test(nftId)) {
        notFound();
    }

    const chainConfig = getChainConfigBySlug(chainSlug);
    if (!chainConfig) {
        notFound();
    }

    // Redirect if not authenticated
    if (status === "loading") {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
                <div className="text-white">{t("common.loading")}</div>
            </div>
        );
    }

    if (!session) {
        redirect("/auth/signin");
    }

    // Show loading state while fetching position
    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
                <div className="text-white">{t("common.loading")}</div>
            </div>
        );
    }

    // Show error if position failed to load
    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-red-400 mb-2">{t("common.error")}</div>
                    <div className="text-slate-400 text-sm">{error.message}</div>
                </div>
            </div>
        );
    }

    // Show not found if position doesn't exist
    if (!position) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-slate-400">{t("positionDetails.header.positionNotFound")}</div>
                </div>
            </div>
        );
    }

    const renderTabContent = () => {
        if (!position) {
            return <div className="text-slate-400 text-center py-12">{t("common.loading")}</div>;
        }

        switch (activeTab) {
            case "overview":
                return (
                    <OverviewTab
                        position={position.basicData}
                        pnlBreakdown={position.pnlBreakdown}
                        chainSlug={chainSlug}
                        nftId={nftId}
                    />
                );
            case "ledger":
                return <EventsTab chainSlug={chainSlug} nftId={nftId} />;
            case "apr":
                return (
                    <AprTab
                        chainSlug={chainSlug}
                        nftId={nftId}
                        aprBreakdown={position.aprBreakdown || undefined}
                        pnlBreakdown={position.pnlBreakdown || undefined}
                        quoteToken={position.basicData?.token0IsQuote
                            ? position.basicData.pool.token0
                            : position.basicData.pool.token1}
                        token0={position.basicData?.pool.token0}
                        token1={position.basicData?.pool.token1}
                    />
                );
            case "technical":
                return (
                    <TechnicalDetails
                        position={position.basicData}
                        chainSlug={chainSlug}
                    />
                );
            default:
                return (
                    <OverviewTab
                        position={position.basicData}
                        pnlBreakdown={position.pnlBreakdown}
                        chainSlug={chainSlug}
                        nftId={nftId}
                    />
                );
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
            <div className="container mx-auto px-4 py-8">
                {/* Position Header */}
                {position && (
                    <PositionHeader
                        position={position.basicData}
                        chainSlug={chainSlug}
                        nftId={nftId}
                        chainConfig={chainConfig}
                        onRefresh={handleRefresh}
                        isRefreshing={refreshMutation.isPending}
                    />
                )}
                
                {/* Tab Navigation */}
                <PositionTabs activeTab={activeTab} chainSlug={chainSlug} nftId={nftId} />
                
                {/* Tab Content */}
                <div className="mt-8">
                    {renderTabContent()}
                </div>
            </div>
        </div>
    );
}