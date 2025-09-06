"use client";

import { UserDropdown } from "@/components/auth/user-dropdown";
import { SettingsModal } from "@/components/settings-modal";
import { CreatePositionDropdown } from "@/components/positions/create-position-dropdown";
import { useTranslations } from "@/i18n/client";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";

export default function Dashboard() {
    const t = useTranslations();
    const { data: session, status } = useSession();

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
                        
                        <CreatePositionDropdown />
                    </div>

                    {/* Empty State */}
                    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-8 text-center">
                        <div className="text-6xl mb-4">📊</div>
                        <h3 className="text-xl font-semibold text-white mb-2">
                            {t("dashboard.emptyState.title")}
                        </h3>
                        <p className="text-slate-400">
                            {t("dashboard.emptyState.description")}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}