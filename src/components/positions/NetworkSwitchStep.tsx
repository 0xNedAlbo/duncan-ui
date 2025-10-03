"use client";

import { AlertCircle, Loader2 } from "lucide-react";
import { useSwitchChain } from "wagmi";
import { getChainId, getChainConfig, type SupportedChainsType } from "@/config/chains";

interface NetworkSwitchStepProps {
    chain: SupportedChainsType;
    isWrongNetwork: boolean;
}

/**
 * Compact network switch step for transaction flows
 * Displays a warning and switch button when wallet is connected to wrong network
 */
export function NetworkSwitchStep({ chain, isWrongNetwork }: NetworkSwitchStepProps) {
    const { switchChain, isPending: isSwitchingNetwork } = useSwitchChain();

    if (!isWrongNetwork) {
        return null;
    }

    const chainName = getChainConfig(chain)?.shortName || chain;

    return (
        <div className="flex items-center justify-between p-3 bg-amber-900/20 border border-amber-600/50 rounded-lg">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-600/50 border border-amber-500/50 flex items-center justify-center">
                    <AlertCircle className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                    <p className="text-white font-medium text-sm">
                        Switch to {chainName}
                    </p>
                    <p className="text-amber-200/80 text-xs">
                        Connect to the correct network
                    </p>
                </div>
            </div>
            <button
                onClick={() => switchChain({ chainId: getChainId(chain) })}
                disabled={isSwitchingNetwork}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-600 disabled:text-slate-400 text-white text-sm rounded-lg transition-colors"
            >
                {isSwitchingNetwork ? (
                    <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Switching...
                    </span>
                ) : (
                    "Switch"
                )}
            </button>
        </div>
    );
}
