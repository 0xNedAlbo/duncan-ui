"use client";

import { usePositionStore } from "@/store/position-store";
import { SettingsModal } from "@/components/settings-modal";
import { useTranslations } from "@/i18n/client";

export default function Home() {
    const { selectedChain, currentPosition } = usePositionStore();
    const t = useTranslations();

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
                        {/* hasMounted && isConnected && <ConnectButton /> */}
                    </div>
                </header>

                {/* Status Info */}
                <div className="mt-8 p-4 bg-slate-800/30 border border-slate-700 rounded-lg backdrop-blur-sm">
                    <p className="text-sm text-slate-400">
                        {t("status.selectedChain")}: {selectedChain} |
                        {t("status.currentPosition")}:{" "}
                        {currentPosition
                            ? t("status.active")
                            : t("status.none")}{" "}
                        |{t("status.developmentMode")}
                    </p>
                </div>
            </div>
        </div>
    );
}
