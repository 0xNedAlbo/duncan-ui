"use client";

import { Loader2, Check } from "lucide-react";

export interface TransactionStepProps {
    title: string;
    description: string;
    isLoading: boolean;
    isComplete: boolean;
    isDisabled: boolean;
    onExecute: () => void;
    showExecute?: boolean;
}

/**
 * Reusable transaction step UI component
 * Displays transaction status with icon indicator and execute button
 */
export function TransactionStep({
    title,
    description,
    isLoading,
    isComplete,
    isDisabled,
    onExecute,
    showExecute = true,
}: TransactionStepProps) {
    return (
        <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
            <div className="flex items-center gap-3">
                {isComplete ? (
                    <div className="w-8 h-8 rounded-full bg-green-500/20 border border-green-500/50 flex items-center justify-center">
                        <Check className="w-4 h-4 text-green-400" />
                    </div>
                ) : (
                    <div className="w-8 h-8 rounded-full bg-slate-600/50 border border-slate-500/50 flex items-center justify-center">
                        {isLoading ? (
                            <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                        ) : (
                            <span className="text-slate-400 text-sm">•</span>
                        )}
                    </div>
                )}
                <div>
                    <p className="text-white font-medium text-sm">{title}</p>
                    <p className="text-slate-400 text-xs">{description}</p>
                </div>
            </div>
            {!isComplete && showExecute && (
                <button
                    onClick={onExecute}
                    disabled={isDisabled || isLoading}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:text-slate-400 text-white text-sm rounded-lg transition-colors"
                >
                    {isLoading ? "Processing..." : "Execute"}
                </button>
            )}
        </div>
    );
}
