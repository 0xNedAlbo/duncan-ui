"use client";

import { Plus, ChevronDown, Loader2 } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "@/i18n/client";
import { useImportNFT } from "@/hooks/api/usePositions";
import { handleApiError } from "@/lib/app/apiError";
import { usePositionStore } from "@/store/position-store";
import type { BasicPosition } from "@/services/positions/positionService";

interface CreatePositionDropdownProps {
    // eslint-disable-next-line no-unused-vars
    onImportSuccess?: (position: any) => void;
}

export function CreatePositionDropdown({
    onImportSuccess,
}: CreatePositionDropdownProps = {}) {
    const t = useTranslations();
    const { addPosition } = usePositionStore();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
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
    const importNFT = useImportNFT({
        onSuccess: (response) => {
            if (response.data?.position) {
                const importedPosition = response.data.position as unknown as BasicPosition;

                // Add the imported position to current list
                addPosition(importedPosition);

                console.log(`✓ Added imported position to store: ${importedPosition.pool.chain}/${importedPosition.nftId}`);

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
                    setIsDropdownOpen(false);
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
        <div className="relative">
            <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
            >
                <Plus className="w-5 h-5" />
                {t("dashboard.addPosition.button")}
                <ChevronDown
                    className={`w-4 h-4 transition-transform duration-200 ${
                        isDropdownOpen ? "rotate-180" : ""
                    }`}
                />
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-slate-800/90 backdrop-blur-md rounded-lg border border-slate-700/50 shadow-xl shadow-black/20 z-50">
                    <div className="py-2">
                        <button
                            onClick={() => {
                                setIsDropdownOpen(false);
                                // TODO: Open manual config modal
                            }}
                            className="w-full px-4 py-3 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 transition-colors"
                        >
                            <div className="text-left">
                                <div className="font-medium">
                                    {t("dashboard.addPosition.manual.title")}
                                </div>
                                <div className="text-xs text-slate-400">
                                    {t(
                                        "dashboard.addPosition.manual.description"
                                    )}
                                </div>
                            </div>
                        </button>

                        <button
                            onClick={() => {
                                setIsDropdownOpen(false);
                                // TODO: Open wallet import modal
                            }}
                            className="w-full px-4 py-3 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 transition-colors"
                        >
                            <div className="text-left">
                                <div className="font-medium">
                                    {t("dashboard.addPosition.wallet.title")}
                                </div>
                                <div className="text-xs text-slate-400">
                                    {t(
                                        "dashboard.addPosition.wallet.description"
                                    )}
                                </div>
                            </div>
                        </button>

                        <button
                            onClick={() => {
                                setShowNftForm(!showNftForm);
                            }}
                            className="w-full px-4 py-3 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 transition-colors"
                        >
                            <div className="text-left">
                                <div className="font-medium">
                                    {t("dashboard.addPosition.nft.title")}
                                </div>
                                <div className="text-xs text-slate-400">
                                    {t("dashboard.addPosition.nft.description")}
                                </div>
                            </div>
                        </button>

                        {/* NFT Import Form */}
                        {showNftForm && (
                            <div className="px-4 py-3 border-t border-slate-700/50">
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-300 mb-1">
                                            {t(
                                                "dashboard.addPosition.nft.blockchain"
                                            )}
                                        </label>
                                        <select
                                            value={selectedChain}
                                            onChange={(e) =>
                                                setSelectedChain(e.target.value)
                                            }
                                            className="w-full px-2 py-1.5 text-sm bg-slate-700 border border-slate-600 rounded text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                                        <label className="block text-xs font-medium text-slate-300 mb-1">
                                            {t(
                                                "dashboard.addPosition.nft.nftId"
                                            )}
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
                                            className="w-24 px-2 py-1.5 text-sm bg-slate-700 border border-slate-600 rounded text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
                                        />
                                    </div>

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
                                        className="w-full px-3 py-2 text-xs font-medium bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:text-slate-400 text-white rounded transition-colors flex items-center justify-center gap-2"
                                    >
                                        {importNFT.isPending && (
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                        )}
                                        {importNFT.isPending
                                            ? t(
                                                  "dashboard.addPosition.nft.importing"
                                              )
                                            : t(
                                                  "dashboard.addPosition.nft.import"
                                              )}
                                    </button>

                                    {/* Error Message */}
                                    {importError && (
                                        <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-400">
                                            {importError}
                                        </div>
                                    )}

                                    {/* Success Message */}
                                    {importSuccess && (
                                        <div className="px-3 py-2 bg-green-500/10 border border-green-500/20 rounded text-xs text-green-400">
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
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
