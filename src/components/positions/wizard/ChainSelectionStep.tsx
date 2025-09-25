"use client";

import { useTranslations } from "@/i18n/client";
import { SupportedChainsType, SUPPORTED_CHAINS, getChainConfig } from "@/config/chains";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useMemo } from "react";

interface ChainSelectionStepProps {
    // eslint-disable-next-line no-unused-vars
    onChainSelect?: (isChainSelected: boolean) => void;
}

export function ChainSelectionStep(props: ChainSelectionStepProps) {
    const t = useTranslations();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [selectedChain, setSelectedChain] =
        useState<SupportedChainsType | null>(null);

    const chains: {
        id: SupportedChainsType;
        name: string;
        description: string;
    }[] = useMemo(() => {
        return SUPPORTED_CHAINS.map((chainKey) => {
            const config = getChainConfig(chainKey);
            return {
                id: chainKey as SupportedChainsType,
                name: config?.shortName || chainKey,
                description: t(
                    `positionWizard.chainSelection.${chainKey}.description` as any
                ),
            };
        });
    }, [t]);

    useEffect(() => {
        const chainParam = searchParams.get("chain") || "";
        if (!chainParam || !SUPPORTED_CHAINS.includes(chainParam)) {
            setSelectedChain(null);
            props.onChainSelect?.(false);
        } else {
            setSelectedChain(chainParam as SupportedChainsType);
            props.onChainSelect?.(true);
        }
    }, [props, searchParams]);

    function onChainSelected(chainId: SupportedChainsType) {
        if (!chainId) return;
        const params = new URLSearchParams(searchParams.toString());
        params.set("chain", chainId);
        router.push(pathname + "?" + params.toString());
    }

    return (
        <div className="space-y-6">
            <p className="text-slate-300">
                {t("positionWizard.chainSelection.description")}
            </p>

            <div className="grid gap-4">
                {chains.map((chain) => (
                    <button
                        key={chain.id}
                        onClick={() => onChainSelected(chain.id)}
                        className={`p-4 border-2 rounded-lg transition-all text-left ${
                            selectedChain === chain.id
                                ? "border-blue-500 bg-blue-500/10"
                                : "border-slate-700 hover:border-slate-600 bg-slate-800/50"
                        }`}
                    >
                        <h4 className="text-lg font-semibold text-white mb-1">
                            {chain.name}
                        </h4>
                        <p className="text-slate-300 text-sm">
                            {chain.description}
                        </p>
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
