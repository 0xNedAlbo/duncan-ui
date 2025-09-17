"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { redirect, notFound } from "next/navigation";
import { useTranslations } from "@/i18n/client";
import { isValidChainSlug, getChainConfigBySlug } from "@/config/chains";
import { usePosition } from "@/hooks/api/usePositions";
import { PositionHeader } from "./components/position-header";
import { PositionTabs } from "./components/position-tabs";
import { OverviewTab } from "./components/overview-tab";
import { EventsTab } from "./components/events-tab";

export default function UniswapV3PositionPage() {
    const t = useTranslations();
    const { data: session, status } = useSession();
    const params = useParams();
    const searchParams = useSearchParams();

    const chainSlug = params.chain as string;
    const nftId = params.nft as string;
    const activeTab = searchParams.get("tab") || "overview";

    // Fetch the specific position using the individual position API
    // This must be called at the top level, before any conditional returns
    const { data: position, isLoading: positionLoading, error: positionError } = usePosition(chainSlug, nftId);

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
    if (positionLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
                <div className="text-white">{t("common.loading")}</div>
            </div>
        );
    }

    // Show error if position failed to load
    if (positionError) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-red-400 mb-2">{t("common.error")}</div>
                    <div className="text-slate-400 text-sm">Failed to load position</div>
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
        switch (activeTab) {
            case "overview":
                return <OverviewTab position={position} chainSlug={chainSlug} nftId={nftId} />;
            case "events":
                return <EventsTab chainSlug={chainSlug} nftId={nftId} />;
            case "range":
                return <div className="text-slate-400 text-center py-12">{t("positionDetails.tabs.range")} - {t("common.comingSoon")}</div>;
            case "fees":
                return <div className="text-slate-400 text-center py-12">{t("positionDetails.tabs.fees")} - {t("common.comingSoon")}</div>;
            case "analytics":
                return <div className="text-slate-400 text-center py-12">{t("positionDetails.tabs.analytics")} - {t("common.comingSoon")}</div>;
            default:
                return <OverviewTab position={position} chainSlug={chainSlug} nftId={nftId} />;
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
            <div className="container mx-auto px-4 py-8">
                {/* Position Header */}
                <PositionHeader position={position} chainSlug={chainSlug} nftId={nftId} chainConfig={chainConfig} />
                
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