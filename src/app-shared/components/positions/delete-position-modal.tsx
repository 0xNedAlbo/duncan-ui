"use client";

import { X, AlertTriangle, Loader2 } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { useTranslations } from "@/i18n/client";
import { useDeletePosition } from "@/hooks/api/useDeletePosition";
import { handleApiError } from "@/lib/app/apiError";
import type { BasicPosition } from "@/services/positions/positionService";

interface DeletePositionModalProps {
  isOpen: boolean;
  onClose: () => void;
  position: BasicPosition;
  onDeleteSuccess?: () => void;
}

export function DeletePositionModal({
  isOpen,
  onClose,
  position,
  onDeleteSuccess
}: DeletePositionModalProps) {
  const t = useTranslations();
  const [mounted, setMounted] = useState(false);

  // Ensure component is mounted on client side for portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Delete mutation - Store update is now handled by parent callback
  const deletePosition = useDeletePosition({
    onSuccess: () => {
      // Call parent callback to handle store update
      onDeleteSuccess?.();
      onClose();
    },
    onError: (error) => {
      // Error handling is done within the component UI
      console.error("Position deletion failed:", error);
    },
  });

  // Handle delete confirmation
  const handleDelete = () => {
    if (!position.chain || !position.nftId) return;

    deletePosition.mutate({
      chain: position.chain,
      nftId: position.nftId,
    });
  };

  // Format chain name for display
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

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-slate-800/90 backdrop-blur-md border border-slate-700/50 rounded-xl shadow-xl shadow-black/20 w-full max-w-md">

          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <h2 className="text-lg font-semibold text-white">
                {t("dashboard.positions.delete.confirmTitle")}
              </h2>
            </div>
            <button
              onClick={onClose}
              disabled={deletePosition.isPending}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Warning message */}
            <p className="text-slate-300 text-sm leading-relaxed">
              {t("dashboard.positions.delete.confirmMessage")}
            </p>

            {/* Position details */}
            <div className="bg-slate-700/30 rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-400">{t("dashboard.positions.nftId")}:</span>
                <span className="text-sm text-white font-mono">#{position.nftId}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-400">{t("dashboard.positions.tokenPair")}:</span>
                <span className="text-sm text-white">
                  {position.pool.token0.symbol}/{position.pool.token1.symbol}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-400">{t("dashboard.positions.chain")}:</span>
                <span className="text-sm text-white">{formatChainName(position.chain)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-400">{t("dashboard.positions.feeTier")}:</span>
                <span className="text-sm text-white">{position.pool.fee / 10000}%</span>
              </div>
            </div>

            {/* Error display */}
            {deletePosition.isError && (
              <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
                {handleApiError(deletePosition.error, t("dashboard.positions.delete.error"))}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={onClose}
                disabled={deletePosition.isPending}
                className="flex-1 px-4 py-2 text-sm font-medium text-slate-300 hover:text-white border border-slate-600 hover:border-slate-500 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t("dashboard.positions.delete.cancelButton")}
              </button>
              <button
                onClick={handleDelete}
                disabled={deletePosition.isPending}
                className="flex-1 px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 disabled:bg-red-600/50 text-white rounded-lg transition-colors disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {deletePosition.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t("dashboard.positions.delete.deleting")}
                  </>
                ) : (
                  t("dashboard.positions.delete.confirmButton")
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(modalContent, document.body);
}