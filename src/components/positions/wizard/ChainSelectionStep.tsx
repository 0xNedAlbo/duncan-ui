"use client";

import { useTranslations } from "@/i18n/client";
import type { SupportedChainsType } from "@/config/chains";

interface ChainSelectionStepProps {
    selectedChain: SupportedChainsType | null;
    onChainSelect: (chain: SupportedChainsType) => void;
    onNext: () => void;
    onBack: () => void;
}

export function ChainSelectionStep({
    selectedChain,
    onChainSelect,
    // eslint-disable-next-line no-unused-vars
    onNext,
    // eslint-disable-next-line no-unused-vars
    onBack,
}: ChainSelectionStepProps) {
    const t = useTranslations();

    const chains: { id: SupportedChainsType; name: string; description: string }[] = [
        {
            id: "ethereum",
            name: "Ethereum",
            description: t("positionWizard.chainSelection.ethereum.description"),
        },
        {
            id: "arbitrum",
            name: "Arbitrum",
            description: t("positionWizard.chainSelection.arbitrum.description"),
        },
        {
            id: "base",
            name: "Base",
            description: t("positionWizard.chainSelection.base.description"),
        },
    ];

    return (
        <div className="space-y-6">
            <p className="text-slate-300">
                {t("positionWizard.chainSelection.description")}
            </p>

            <div className="grid gap-4">
                {chains.map((chain) => (
                    <button
                        key={chain.id}
                        onClick={() => onChainSelect(chain.id)}
                        className={`p-4 border-2 rounded-lg transition-all text-left ${
                            selectedChain === chain.id
                                ? "border-blue-500 bg-blue-500/10"
                                : "border-slate-700 hover:border-slate-600 bg-slate-800/50"
                        }`}
                    >
                        <h4 className="text-lg font-semibold text-white mb-1">
                            {chain.name}
                        </h4>
                        <p className="text-slate-300 text-sm">{chain.description}</p>
                    </button>
                ))}
            </div>

            <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
                <p className="text-slate-400 text-sm">
                    {t("positionWizard.chainSelection.note")}
                </p>
            </div>
        </div>
    );
}