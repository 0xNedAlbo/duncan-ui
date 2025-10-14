"use client";

import { Wand2, Wallet, FileText, ArrowRight, Loader2 } from "lucide-react";
import { useTranslations } from "@/app-shared/i18n/client";
import { useState } from "react";
import { useImportPositionByNftId } from "@/app-shared/hooks/api/useImportPositionByNftId";
import { handleApiError } from "@/app-shared/lib/api-client/apiError";
import { useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/types/api";
import type { BasicPosition } from "@/types/positions";

interface EmptyStateActionsProps {
    onWizardClick: () => void;
    onWalletImportClick: () => void;
    onImportSuccess?: (_position: any) => void;
}

export function EmptyStateActions({
    onWizardClick,
    onWalletImportClick,
    onImportSuccess,
}: EmptyStateActionsProps) {
    const t = useTranslations();
    const queryClient = useQueryClient();
    const [showNftForm, setShowNftForm] = useState(false);
    const [nftId, setNftId] = useState("");
    const [selectedChain, setSelectedChain] = useState("ethereum");
    const [importError, setImportError] = useState<string | null>(null);
    const [importSuccess, setImportSuccess] = useState<{
        chainName: string;
        nftId: string;
    } | null>(null);

    // Helper function to format chain name for display
    const formatChainName = (chain: string): string => {
        switch (chain.toLowerCase()) {
            case "ethereum":
                return "Ethereum";
            case "arbitrum":
                return "Arbitrum";
            case "base":
                return "Base";
            default:
                return chain.charAt(0).toUpperCase() + chain.slice(1);
        }
    };

    // Use the import NFT mutation hook
    const importNFT = useImportPositionByNftId({
        onSuccess: (response) => {
            if (response.data?.position) {
                const importedPosition = response.data
                    .position as unknown as BasicPosition;

                // Invalidate positions list to refresh the data
                queryClient.invalidateQueries({
                    queryKey: QUERY_KEYS.positions,
                });

                console.log(
                    `✓ Imported position: ${importedPosition.pool.chain}/${importedPosition.nftId}`
                );

                // Create simple display data for success message
                const displayData = {
                    chainName: formatChainName(selectedChain),
                    nftId: nftId.trim(),
                };
                setImportSuccess(displayData);
                setImportError(null);

                // Notify parent component
                onImportSuccess?.(response.data.position);

                // Reset form after 2 seconds
                setTimeout(() => {
                    setShowNftForm(false);
                    setNftId("");
                    setImportSuccess(null);
                }, 2000);
            }
        },
        onError: (error) => {
            const errorMessage = handleApiError(
                error,
                t("dashboard.addPosition.nft.importError")
            );
            setImportError(errorMessage);
            setImportSuccess(null);
        },
    });

    return (
        <div className="max-w-6xl mx-auto py-12">
            {/* Header */}
            <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-white mb-3">
                    {t("dashboard.emptyState.title")}
                </h2>
                <p className="text-lg text-slate-400">
                    {t("dashboard.emptyState.subtitle")}
                </p>
            </div>

            {/* Action Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Wizard Card */}
                <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700/50 rounded-xl p-6 hover:border-blue-500/50 transition-all hover:shadow-lg hover:shadow-blue-500/10">
                    <div className="flex flex-col h-full">
                        {/* Icon */}
                        <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center mb-4">
                            <Wand2 className="w-6 h-6 text-blue-400" />
                        </div>

                        {/* Content */}
                        <div className="flex-grow">
                            <h3 className="text-xl font-semibold text-white mb-2">
                                {t("dashboard.addPosition.wizard.title")}
                            </h3>
                            <p className="text-sm text-slate-400 mb-6">
                                {t("dashboard.addPosition.wizard.description")}
                            </p>
                        </div>

                        {/* Action Button */}
                        <button
                            onClick={onWizardClick}
                            className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
                        >
                            {t("dashboard.emptyState.wizard.button")}
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Wallet Import Card */}
                <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700/50 rounded-xl p-6 hover:border-blue-500/50 transition-all hover:shadow-lg hover:shadow-blue-500/10">
                    <div className="flex flex-col h-full">
                        {/* Icon */}
                        <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center mb-4">
                            <Wallet className="w-6 h-6 text-blue-400" />
                        </div>

                        {/* Content */}
                        <div className="flex-grow">
                            <h3 className="text-xl font-semibold text-white mb-2">
                                {t("dashboard.addPosition.wallet.title")}
                            </h3>
                            <p className="text-sm text-slate-400 mb-6">
                                {t("dashboard.addPosition.wallet.description")}
                            </p>
                        </div>

                        {/* Action Button */}
                        <button
                            onClick={onWalletImportClick}
                            className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
                        >
                            {t("dashboard.emptyState.wallet.button")}
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* NFT Import Card */}
                <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700/50 rounded-xl p-6 hover:border-blue-500/50 transition-all hover:shadow-lg hover:shadow-blue-500/10">
                    <div className="flex flex-col h-full">
                        {/* Icon */}
                        <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center mb-4">
                            <FileText className="w-6 h-6 text-blue-400" />
                        </div>

                        {/* Content */}
                        <div className="flex-grow">
                            <h3 className="text-xl font-semibold text-white mb-2">
                                {t("dashboard.addPosition.nft.title")}
                            </h3>
                            <p className="text-sm text-slate-400 mb-6">
                                {t("dashboard.addPosition.nft.description")}
                            </p>
                        </div>

                        {/* Action Button / Form */}
                        {!showNftForm ? (
                            <button
                                onClick={() => setShowNftForm(true)}
                                className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
                            >
                                {t("dashboard.emptyState.nft.button")}
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        ) : (
                            <div className="space-y-3 pt-2 border-t border-slate-700/50">
                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                                        {t("dashboard.addPosition.nft.blockchain")}
                                    </label>
                                    <select
                                        value={selectedChain}
                                        onChange={(e) =>
                                            setSelectedChain(e.target.value)
                                        }
                                        className="w-full px-3 py-2 text-sm bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="ethereum">
                                            Ethereum
                                        </option>
                                        <option value="arbitrum">
                                            Arbitrum
                                        </option>
                                        <option value="base">Base</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                                        {t("dashboard.addPosition.nft.nftId")}
                                    </label>
                                    <input
                                        type="text"
                                        value={nftId}
                                        onChange={(e) =>
                                            setNftId(e.target.value)
                                        }
                                        placeholder={t(
                                            "dashboard.addPosition.nft.placeholder"
                                        )}
                                        maxLength={8}
                                        className="w-full px-3 py-2 text-sm bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
                                    />
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            setShowNftForm(false);
                                            setNftId("");
                                            setImportError(null);
                                            setImportSuccess(null);
                                        }}
                                        className="flex-1 px-3 py-2 text-sm font-medium bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
                                    >
                                        {t("common.cancel")}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setImportError(null);
                                            setImportSuccess(null);

                                            importNFT.mutate({
                                                chain: selectedChain,
                                                nftId: nftId.trim(),
                                            });
                                        }}
                                        disabled={
                                            !nftId.trim() || importNFT.isPending
                                        }
                                        className="flex-1 px-3 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:text-slate-400 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                                    >
                                        {importNFT.isPending && (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        )}
                                        {importNFT.isPending
                                            ? t(
                                                  "dashboard.addPosition.nft.importing"
                                              )
                                            : t(
                                                  "dashboard.addPosition.nft.import"
                                              )}
                                    </button>
                                </div>

                                {/* Error Message */}
                                {importError && (
                                    <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
                                        {importError}
                                    </div>
                                )}

                                {/* Success Message */}
                                {importSuccess && (
                                    <div className="px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-lg text-xs text-green-400">
                                        <div className="font-medium">
                                            {t(
                                                "dashboard.addPosition.nft.importSuccess"
                                            )}
                                        </div>
                                        <div className="mt-1 text-slate-300">
                                            NFT {importSuccess.nftId} on{" "}
                                            {importSuccess.chainName}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
