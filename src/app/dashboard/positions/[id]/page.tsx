"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { useTranslations } from "@/i18n/client";
import { PositionHeader } from "./components/position-header";
import { PositionTabs } from "./components/position-tabs";
import { OverviewTab } from "./components/overview-tab";
import { EventsTab } from "./components/events-tab";

export default function PositionDetailsPage() {
    const t = useTranslations();
    const { data: session, status } = useSession();
    const params = useParams();
    const searchParams = useSearchParams();
    
    const positionId = params.id as string;
    const activeTab = searchParams.get("tab") || "overview";

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

    const renderTabContent = () => {
        switch (activeTab) {
            case "overview":
                return <OverviewTab positionId={positionId} />;
            case "events":
                return <EventsTab positionId={positionId} />;
            case "range":
                return <div className="text-slate-400 text-center py-12">{t("positionDetails.tabs.range")} - {t("common.comingSoon")}</div>;
            case "fees":
                return <div className="text-slate-400 text-center py-12">{t("positionDetails.tabs.fees")} - {t("common.comingSoon")}</div>;
            case "analytics":
                return <div className="text-slate-400 text-center py-12">{t("positionDetails.tabs.analytics")} - {t("common.comingSoon")}</div>;
            default:
                return <OverviewTab positionId={positionId} />;
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
            <div className="container mx-auto px-4 py-8">
                {/* Position Header */}
                <PositionHeader positionId={positionId} />
                
                {/* Tab Navigation */}
                <PositionTabs activeTab={activeTab} positionId={positionId} />
                
                {/* Tab Content */}
                <div className="mt-8">
                    {renderTabContent()}
                </div>
            </div>
        </div>
    );
}