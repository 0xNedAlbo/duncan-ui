"use client";

import { useState, useEffect } from "react";
import { X, Wallet, Search, Circle, CheckCircle, Loader2, ExternalLink } from "lucide-react";
import { useAccount } from "wagmi";
import { useTranslations } from "@/app-shared/i18n/client";
import { useDiscoverPositions, useImportDiscoveredPositions } from "@/hooks/api/useDiscoverPositions";
import { handleApiError } from "@/lib/app/apiError";
import { normalizeAddress, isValidAddress } from "@/lib/utils/evm";
import { formatCompactValue } from "@/lib/utils/fraction-format";
import { calculatePositionValueAtPrice } from "@/lib/utils/uniswap-v3/position";
import type { BasicPosition } from "@/services/positions/positionService";
import type { SupportedChainsType } from "@/config/chains";

interface ImportWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  // eslint-disable-next-line no-unused-vars
  onImportSuccess?: (positions: BasicPosition[]) => void;
}

export function ImportWalletModal({
  isOpen,
  onClose,
  onImportSuccess,
}: ImportWalletModalProps) {
  const t = useTranslations();
  const { address: connectedAddress } = useAccount();
  const [address, setAddress] = useState("");
  const [selectedChain, setSelectedChain] = useState<SupportedChainsType>("ethereum");
  const [limit, setLimit] = useState(10);
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);
  const [discoveredPositions, setDiscoveredPositions] = useState<BasicPosition[]>([]);
  const [discoveryStats, setDiscoveryStats] = useState<{
    totalNFTs: number;
    existingPositions: number;
    newPositionsFound: number;
  } | null>(null);
  const [hasSuccessfulImport, setHasSuccessfulImport] = useState(false);

  // Discovery mutation
  const discoverPositions = useDiscoverPositions({
    onSuccess: (response) => {
      if (response.data) {
        setDiscoveredPositions(response.data.positions);
        setDiscoveryStats({
          totalNFTs: response.data.totalNFTs,
          existingPositions: response.data.existingPositions,
          newPositionsFound: response.data.newPositionsFound,
        });
        setSelectedPosition(null); // Clear previous selection
      }
    },
    onError: (error) => {
      const errorMessage = handleApiError(error, t("dashboard.addPosition.wallet.discoveryError"));
      console.error("Position discovery failed:", errorMessage);
    },
  });

  // Import mutation
  const importPositions = useImportDiscoveredPositions({
    onSuccess: (result) => {
      const { imported, failed } = result;

      if (imported.length > 0) {
        setHasSuccessfulImport(true);
        onImportSuccess?.(imported);

        // Show success message and close modal after delay
        setTimeout(() => {
          onClose();
          // Reset state
          setAddress("");
          setDiscoveredPositions([]);
          setDiscoveryStats(null);
          setSelectedPosition(null);
          setHasSuccessfulImport(false);
        }, 2000);
      }

      if (failed.length > 0) {
        console.warn("Some positions failed to import:", failed);
      }
    },
    onError: (error) => {
      const errorMessage = handleApiError(error, t("dashboard.addPosition.wallet.importError"));
      console.error("Position import failed:", errorMessage);
    },
  });

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setAddress("");
      setDiscoveredPositions([]);
      setDiscoveryStats(null);
      setSelectedPosition(null);
      setHasSuccessfulImport(false);
    }
  }, [isOpen]);

  // Handle address validation
  const normalizedAddress = address ? normalizeAddress(address) : "";
  const isAddressValid = address === "" || isValidAddress(address);
  const canDiscover = isAddressValid && address.length > 0;

  // Handle position selection
  const selectPosition = (nftId: string) => {
    if (selectedPosition === nftId) {
      setSelectedPosition(null); // Deselect if already selected
    } else {
      setSelectedPosition(nftId); // Select new position
    }
  };

  // Handle form submission
  const handleDiscover = () => {
    if (!canDiscover) return;

    discoverPositions.mutate({
      address: normalizedAddress,
      chain: selectedChain,
      limit,
    });
  };

  const handleImport = () => {
    const positionToImport = discoveredPositions.find(
      p => p.nftId && p.nftId === selectedPosition
    );

    if (!positionToImport) return;

    importPositions.mutate({
      positions: [positionToImport],
      chain: selectedChain,
    });
  };


  // Calculate current position value
  const calculateCurrentValue = (position: BasicPosition): bigint => {
    if (!position.pool.currentPrice) {
      return 0n;
    }

    try {
      return calculatePositionValueAtPrice(
        BigInt(position.liquidity),
        position.tickLower,
        position.tickUpper,
        BigInt(position.pool.currentPrice),
        position.pool.token0.address,
        position.pool.token1.address,
        position.pool.token0.decimals,
        position.pool.tickSpacing
      );
    } catch (error) {
      console.warn("Failed to calculate position value:", error);
      return 0n;
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-slate-800/90 backdrop-blur-md border border-slate-700/50 rounded-xl shadow-xl shadow-black/20 w-full max-w-2xl max-h-[90vh] overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
            <h2 className="text-xl font-semibold text-white flex items-center gap-3">
              <Wallet className="w-5 h-5 text-blue-400" />
              {t("dashboard.addPosition.wallet.title")}
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-140px)]">

            {/* Address Input Section */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  {t("dashboard.addPosition.wallet.addressLabel")}
                </label>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder={t("dashboard.addPosition.wallet.addressPlaceholder")}
                    className={`w-full px-3 py-2 bg-slate-700 border rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400 ${
                      !isAddressValid ? "border-red-500" : "border-slate-600"
                    }`}
                  />
                  {connectedAddress && (
                    <button
                      onClick={() => setAddress(connectedAddress)}
                      className="text-sm text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
                    >
                      <Wallet className="w-3 h-3" />
                      {t("dashboard.addPosition.wallet.useConnectedWallet")}
                    </button>
                  )}
                </div>
                {!isAddressValid && address.length > 0 && (
                  <p className="text-sm text-red-400 mt-1">
                    {t("dashboard.addPosition.wallet.invalidAddress")}
                  </p>
                )}
              </div>

              {/* Chain and Limit Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    {t("dashboard.addPosition.wallet.chain")}
                  </label>
                  <select
                    value={selectedChain}
                    onChange={(e) => setSelectedChain(e.target.value as SupportedChainsType)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ethereum">Ethereum</option>
                    <option value="arbitrum">Arbitrum</option>
                    <option value="base">Base</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    {t("dashboard.addPosition.wallet.limit")}
                  </label>
                  <select
                    value={limit}
                    onChange={(e) => setLimit(parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                      <option key={num} value={num}>{num}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Discover Button */}
              <button
                onClick={handleDiscover}
                disabled={!canDiscover || discoverPositions.isPending}
                className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:text-slate-400 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
              >
                {discoverPositions.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t("dashboard.addPosition.wallet.discovering")}
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    {t("dashboard.addPosition.wallet.discover")}
                  </>
                )}
              </button>
            </div>

            {/* Discovery Results */}
            {discoveryStats && (
              <div className="space-y-4">

                {/* Position Selection */}
                {discoveredPositions.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-md font-medium text-white">
                        {t("dashboard.addPosition.wallet.selectPosition")}
                      </h4>
                    </div>

                    {/* Position List */}
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {discoveredPositions.map((position) => {
                        if (!position.nftId) return null;

                        const isSelected = selectedPosition === position.nftId;

                        return (
                          <div
                            key={position.nftId}
                            className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                              isSelected
                                ? "bg-blue-500/10 border-blue-500/30"
                                : "bg-slate-700/30 border-slate-600/50 hover:bg-slate-700/50"
                            }`}
                            onClick={() => selectPosition(position.nftId!)}
                          >
                            <div className="flex items-center gap-3">
                              {isSelected ? (
                                <CheckCircle className="w-5 h-5 text-blue-400 flex-shrink-0" />
                              ) : (
                                <Circle className="w-5 h-5 text-slate-400 flex-shrink-0" />
                              )}

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-white font-medium">
                                    NFT #{position.nftId}
                                  </span>
                                  <span className="text-xs text-slate-400">
                                    {position.pool.token0.symbol}/{position.pool.token1.symbol}
                                  </span>
                                  <span className="text-xs text-slate-500">
                                    {position.pool.fee / 10000}%
                                  </span>
                                </div>
                                <div className="text-sm text-slate-400">
                                  {t("dashboard.addPosition.wallet.currentValue")}: {formatCompactValue(
                                    calculateCurrentValue(position),
                                    position.token0IsQuote ? position.pool.token0.decimals : position.pool.token1.decimals
                                  )} {position.token0IsQuote ? position.pool.token0.symbol : position.pool.token1.symbol}
                                </div>
                              </div>

                              <ExternalLink className="w-4 h-4 text-slate-400 flex-shrink-0" />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Import Button */}
                    <button
                      onClick={handleImport}
                      disabled={!selectedPosition || importPositions.isPending || hasSuccessfulImport}
                      className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 disabled:text-slate-400 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
                    >
                      {importPositions.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          {t("dashboard.addPosition.wallet.importing")}
                        </>
                      ) : (
                        <>
                          {t("dashboard.addPosition.wallet.importSelected")}
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* No Positions Found */}
                {discoveredPositions.length === 0 && discoveryStats.newPositionsFound === 0 && (
                  <div className="text-center py-8">
                    <div className="text-slate-400 mb-2">
                      {t("dashboard.addPosition.wallet.noNewPositions")}
                    </div>
                    <div className="text-sm text-slate-500">
                      {t("dashboard.addPosition.wallet.noNewPositionsDesc")}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Error Display */}
            {discoverPositions.isError && (
              <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
                {handleApiError(discoverPositions.error, t("dashboard.addPosition.wallet.discoveryError"))}
              </div>
            )}

            {importPositions.isError && (
              <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
                {handleApiError(importPositions.error, t("dashboard.addPosition.wallet.importError"))}
              </div>
            )}

            {/* Success Display */}
            {importPositions.isSuccess && importPositions.data && (
              <div className="px-4 py-3 bg-green-500/10 border border-green-500/20 rounded-lg text-sm text-green-400">
                <div className="font-medium">
                  {t("dashboard.addPosition.wallet.importSuccess", {
                    count: importPositions.data.imported.length
                  })}
                </div>
                {importPositions.data.failed.length > 0 && (
                  <div className="mt-2 text-yellow-400">
                    {t("dashboard.addPosition.wallet.partialSuccess", {
                      failed: importPositions.data.failed.length
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}