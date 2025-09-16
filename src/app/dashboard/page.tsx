"use client";

import { useState } from "react";
import { UserDropdown } from "@/components/auth/user-dropdown";
import { SettingsModal } from "@/components/settings-modal";
import { CreatePositionDropdown } from "@/components/positions/create-position-dropdown";
import { PositionList } from "@/components/positions/position-list";
import { useTranslations } from "@/i18n/client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Dashboard() {
    const t = useTranslations();
    const { data: session, status } = useSession();
    const router = useRouter();
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Handle successful position import
    const handleImportSuccess = (_position: any) => {
        // Trigger refresh of position list
        setRefreshTrigger(prev => prev + 1);
    };

    // Handle authentication redirect
    useEffect(() => {
        if (status === "unauthenticated" || (!session && status !== "loading")) {
            router.push("/auth/signin");
        }
    }, [status, session, router]);

    // Show loading state
    if (status === "loading") {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
                <div className="text-white">{t("common.loading")}</div>
            </div>
        );
    }

    // Don't render anything while redirecting
    if (status === "unauthenticated" || !session) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <header className="flex justify-between items-center mb-12">
                    <div>
                        <h1 className="text-4xl font-bold text-white mb-2">
                            {t("header.title")}
                        </h1>
                        <p className="text-lg text-slate-300">
                            Dashboard
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <SettingsModal />
                        <UserDropdown />
                    </div>
                </header>

                {/* Main Content */}
                <div className="space-y-8">
                    {/* Add Position Button */}
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-2">
                                {t("dashboard.title")}
                            </h2>
                            <p className="text-slate-300">
                                {t("dashboard.subtitle")}
                            </p>
                        </div>
                        
                        <CreatePositionDropdown onImportSuccess={handleImportSuccess} />
                    </div>

                    {/* Position List */}
                    <PositionList refreshTrigger={refreshTrigger} />
                </div>
            </div>
        </div>
    );
}