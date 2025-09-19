"use client";

import { UserDropdown } from "@/components/auth/user-dropdown";
import { SettingsModal } from "@/components/settings-modal";
import { useTranslations } from "@/i18n/client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";

export default function Home() {
    const t = useTranslations();
    const { /* data: session,  */ status } = useSession();
    const router = useRouter();

    // Redirect authenticated users to dashboard
    useEffect(() => {
        if (status === "authenticated") {
            router.push("/dashboard");
        }
    }, [status, router]);

    // Show loading while checking authentication
    if (status === "loading") {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
                <div className="text-white">{t("common.loading")}</div>
            </div>
        );
    }

    // Landing page for unauthenticated users
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
                            {t("header.subtitle")}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <SettingsModal />
                        <UserDropdown />
                    </div>
                </header>

                {/* Main Content - Landing Page */}
                <div className="max-w-4xl mx-auto">
                    {/* Hero Section */}
                    <div className="text-center mb-16">
                        <div className="text-8xl mb-8">📈</div>
                        <h2 className="text-3xl font-bold text-white mb-6">
                            {t("homepage.hero.title")}
                        </h2>
                        <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
                            {t("homepage.hero.description")}
                        </p>

                        <div className="flex gap-4 justify-center">
                            <Link
                                href="/auth/signup"
                                className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors"
                            >
                                {t("homepage.hero.getStarted")}
                            </Link>
                            <Link
                                href="/auth/signin"
                                className="px-8 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
                            >
                                {t("homepage.hero.signIn")}
                            </Link>
                        </div>
                    </div>

                    {/* Features */}
                    <div className="grid md:grid-cols-3 gap-8 mb-16">
                        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
                            <div className="text-4xl mb-4">🎯</div>
                            <h3 className="text-xl font-semibold text-white mb-2">
                                {t("homepage.features.riskPlanning.title")}
                            </h3>
                            <p className="text-slate-400">
                                {t(
                                    "homepage.features.riskPlanning.description"
                                )}
                            </p>
                        </div>

                        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
                            <div className="text-4xl mb-4">📊</div>
                            <h3 className="text-xl font-semibold text-white mb-2">
                                {t("homepage.features.interactiveCharts.title")}
                            </h3>
                            <p className="text-slate-400">
                                {t(
                                    "homepage.features.interactiveCharts.description"
                                )}
                            </p>
                        </div>

                        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
                            <div className="text-4xl mb-4">🔗</div>
                            <h3 className="text-xl font-semibold text-white mb-2">
                                {t("homepage.features.multiChain.title")}
                            </h3>
                            <p className="text-slate-400">
                                {t("homepage.features.multiChain.description")}
                            </p>
                        </div>
                    </div>

                    {/* Call to Action */}
                    <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-xl border border-blue-500/20 p-8 text-center">
                        <h3 className="text-2xl font-bold text-white mb-4">
                            {t("homepage.cta.title")}
                        </h3>
                        <p className="text-slate-300 mb-6">
                            {t("homepage.cta.description")}
                        </p>
                        <Link
                            href="/auth/signup"
                            className="inline-block px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors"
                        >
                            {t("homepage.cta.createAccount")}
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
