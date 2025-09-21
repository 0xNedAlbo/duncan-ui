"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { redirect, notFound } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "@/i18n/client";
import { isValidChainSlug, getChainConfigBySlug } from "@/config/chains";
import { usePositionStore } from "@/store/position-store";
import { PositionHeader } from "./components/position-header";
import { PositionTabs } from "./components/position-tabs";
import { OverviewTab } from "./components/overview-tab";
import { EventsTab } from "./components/events-tab";
import { AprTab } from "./components/apr-tab";
import { TechnicalDetails } from "./components/technical-details";
import type { PositionWithDetails } from "@/store/position-store";

export default function UniswapV3PositionPage() {
    const t = useTranslations();
    const { data: session, status } = useSession();
    const params = useParams();
    const searchParams = useSearchParams();

    const chainSlug = params.chain as string;
    const nftId = params.nft as string;
    const activeTab = searchParams.get("tab") || "overview";

    // State for complete position data and loading
    const [position, setPosition] = useState<PositionWithDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Get store actions
    const loadPositionDetails = usePositionStore((state) => state.loadPositionDetails);
    const refreshPosition = usePositionStore((state) => state.refreshPosition);
    const isRefreshing = usePositionStore((state) => state.isRefreshing);

    // Load position details using unified approach
    useEffect(() => {
        const loadPosition = async () => {
            try {
                console.log(`[Page] Starting to load position details for ${chainSlug}/${nftId}`);
                setIsLoading(true);
                setError(null);

                const positionDetails = await loadPositionDetails(chainSlug, nftId);

                if (positionDetails) {
                    console.log(`[Page] Successfully loaded position details for ${chainSlug}/${nftId}`, positionDetails);
                    setPosition(positionDetails);
                } else {
                    console.log(`[Page] No position details returned for ${chainSlug}/${nftId}`);
                    setError("Position not found");
                }
            } catch (err) {
                console.error(`[Page] Failed to load position ${chainSlug}/${nftId}:`, err);
                setError("Failed to load position");
            } finally {
                setIsLoading(false);
            }
        };

        if (chainSlug && nftId) {
            console.log(`[Page] Effect triggered for ${chainSlug}/${nftId}`);
            loadPosition();
        }
    }, [chainSlug, nftId, loadPositionDetails]);

    // Handle refresh - update local state when store is updated
    const handleRefresh = async () => {
        if (!chainSlug || !nftId) return;

        try {
            await refreshPosition(chainSlug, nftId);
            // After successful refresh, reload position details to get updated data
            const updatedPosition = await loadPositionDetails(chainSlug, nftId);
            if (updatedPosition) {
                setPosition(updatedPosition);
            }
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
                    <div className="text-slate-400 text-sm">{error}</div>
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
                        curveData={position.curveData}
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
                        aprBreakdown={position.aprBreakdown}
                        pnlBreakdown={position.pnlBreakdown}
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
                        curveData={position.curveData}
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
                        isRefreshing={isRefreshing}
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