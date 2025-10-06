"use client";

import { useState } from "react";
import { MoreVertical, Trash2 } from "lucide-react";
import { useTranslations } from "@/app-shared/i18n/client";
import type { BasicPosition } from "@/services/positions/positionService";

interface PositionActionsMenuProps {
  position: BasicPosition;
  onDelete: () => void;
  isDeleting?: boolean;
}

export function PositionActionsMenu({
  onDelete,
  isDeleting = false
}: PositionActionsMenuProps) {
  const t = useTranslations();
  const [isOpen, setIsOpen] = useState(false);

  // Close menu when clicking outside
  const handleBackdropClick = () => {
    setIsOpen(false);
  };

  // Handle delete action
  const handleDelete = () => {
    setIsOpen(false);
    onDelete();
  };

  return (
    <div className="relative">
      {/* Three-dot menu button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isDeleting}
        className="p-1 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title={t("dashboard.positions.actions.menu")}
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {/* Backdrop for mobile/outside click detection */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={handleBackdropClick}
        />
      )}

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute right-0 top-8 z-50 min-w-[160px] bg-slate-800/95 backdrop-blur-md border border-slate-700/50 rounded-lg shadow-xl shadow-black/20">
          <div className="py-1">
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-slate-700/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4" />
              {t("dashboard.positions.actions.delete")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}