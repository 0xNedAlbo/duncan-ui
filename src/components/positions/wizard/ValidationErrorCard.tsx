"use client";

import { AlertCircle, ArrowLeft } from "lucide-react";

type ErrorType = 'chain' | 'tokens' | 'pool' | 'params';

interface ValidationErrorCardProps {
    type: ErrorType;
    onNavigate: () => void;
}

const ERROR_CONFIG: Record<ErrorType, {
    title: string;
    description: string;
    buttonText: string;
}> = {
    chain: {
        title: "Invalid Chain Selected",
        description: "Please select a valid blockchain network to continue.",
        buttonText: "Go to Chain Selection",
    },
    tokens: {
        title: "Token Pair Required",
        description: "Please select both base and quote tokens to continue.",
        buttonText: "Go to Token Pair Selection",
    },
    pool: {
        title: "Pool Selection Required",
        description: "Please select a pool to continue.",
        buttonText: "Go to Pool Selection",
    },
    params: {
        title: "Position Configuration Required",
        description: "Please complete the position configuration to continue.",
        buttonText: "Go to Position Configuration",
    },
};

/**
 * Displays validation error messages with navigation back to previous step
 */
export function ValidationErrorCard({ type, onNavigate }: ValidationErrorCardProps) {
    const config = ERROR_CONFIG[type];

    return (
        <div className="space-y-6">
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                    <div>
                        <h5 className="text-red-400 font-medium">{config.title}</h5>
                        <p className="text-red-200/80 text-sm mt-1">{config.description}</p>
                    </div>
                </div>
                <button
                    onClick={onNavigate}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    {config.buttonText}
                </button>
            </div>
        </div>
    );
}
