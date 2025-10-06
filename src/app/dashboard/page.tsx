"use client";

import { Suspense } from "react";
import { UserDropdown } from "@/app-shared/components/auth/user-dropdown";
import { SettingsModal } from "@/app-shared/components/settings-modal";
import { CreatePositionDropdown } from "@/app-shared/components/positions/create-position-dropdown";
import { PositionList } from "@/app-shared/components/positions/position-list";
import { useTranslations } from "@/app-shared/i18n/client";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

function DashboardContent() {
    const t = useTranslations();
    const router = useRouter();
    const searchParams = useSearchParams();

    // Check if modals should be open based on URL parameters
    const showImportModal = searchParams.get('import') === 'wallet';
    const showWizardModal = searchParams.get('wizard') === 'true';

    // Handle successful position import
    const handleImportSuccess = (/* _position: any */) => {
        // Position list will automatically refresh via ReactQuery cache invalidation
    };

    // Handle modal state changes and URL updates
    const handleImportModalClose = () => {
        const params = new URLSearchParams(searchParams);
        params.delete('import');
        const newUrl = params.toString() ? `?${params.toString()}` : '/dashboard';
        router.push(newUrl);
    };

    const handleImportModalOpen = () => {
        const params = new URLSearchParams(searchParams);
        params.set('import', 'wallet');
        router.push(`?${params.toString()}`);
    };

    // Handle wizard modal state changes and URL updates
    const handleWizardModalClose = () => {
        // Clear ALL wizard-related parameters
        router.push('/dashboard');
    };

    const handleWizardModalOpen = () => {
        // Start fresh with wizard parameter and step 0
        router.push('?wizard=true&step=0');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <header className="flex justify-between items-center mb-12">
                    <div>
                        <h1 className="text-4xl font-bold text-white mb-2">
                            {t("header.title")}
                        </h1>
                        <p className="text-lg text-slate-300">Dashboard</p>
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

                        <CreatePositionDropdown
                            onImportSuccess={handleImportSuccess}
                            showImportModal={showImportModal}
                            onImportModalOpen={handleImportModalOpen}
                            onImportModalClose={handleImportModalClose}
                            showWizardModal={showWizardModal}
                            onWizardModalOpen={handleWizardModalOpen}
                            onWizardModalClose={handleWizardModalClose}
                        />
                    </div>

                    {/* Position List */}
                    <PositionList />
                </div>
            </div>
        </div>
    );
}

export default function Dashboard() {
    const t = useTranslations();
    const { data: session, status } = useSession();
    const router = useRouter();

    // Handle authentication redirect
    useEffect(() => {
        if (
            status === "unauthenticated" ||
            (!session && status !== "loading")
        ) {
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
        <Suspense fallback={
            <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
                <div className="text-white">{t("common.loading")}</div>
            </div>
        }>
            <DashboardContent />
        </Suspense>
    );
}