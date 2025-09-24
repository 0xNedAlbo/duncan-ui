"use client";

import { CheckCircle, Copy } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "@/i18n/client";
import { compareAddresses } from "@/lib/utils/evm";
import type { SupportedChainsType } from "@/config/chains";
import type { PositionConfig, TokenPair, PoolOption } from "./types";

interface PositionSummaryStepProps {
    chain: SupportedChainsType;
    tokenPair: TokenPair;
    selectedPool: PoolOption;
    config: PositionConfig;
    onCreatePosition: () => void;
    onBack: () => void;
}

export function PositionSummaryStep({
    chain,
    tokenPair,
    selectedPool,
    config,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onCreatePosition,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onBack,
}: PositionSummaryStepProps) {
    const t = useTranslations();
    const [copiedField, setCopiedField] = useState<string | null>(null);

    // Determine token0IsQuote based on address ordering
    const token0IsQuote = compareAddresses(tokenPair.baseToken.address, tokenPair.quoteToken.address) > 0;

    const copyToClipboard = (text: string, field: string) => {
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const summaryData = [
        {
            label: "Chain",
            value: chain,
            field: "chain"
        },
        {
            label: "Pool Address",
            value: selectedPool.pool.poolAddress,
            field: "poolAddress"
        },
        {
            label: "Token0 Is Quote",
            value: token0IsQuote.toString(),
            field: "token0IsQuote"
        },
        {
            label: "Base Token",
            value: `${tokenPair.baseToken.symbol} (${tokenPair.baseToken.address})`,
            field: "baseToken"
        },
        {
            label: "Quote Token",
            value: `${tokenPair.quoteToken.symbol} (${tokenPair.quoteToken.address})`,
            field: "quoteToken"
        },
        {
            label: "Tick Lower",
            value: config.tickLower.toString(),
            field: "tickLower"
        },
        {
            label: "Tick Upper",
            value: config.tickUpper.toString(),
            field: "tickUpper"
        },
        {
            label: "Liquidity",
            value: config.liquidity.toString(),
            field: "liquidity"
        }
    ];

    return (
        <div className="space-y-6">
            <div className="text-center">
                <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">
                    Position Summary
                </h3>
                <p className="text-slate-300">
                    Review the position parameters before creating the transaction
                </p>
            </div>

            <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-6">
                <div className="space-y-4">
                    {summaryData.map((item) => (
                        <div key={item.field} className="flex items-center justify-between py-3 border-b border-slate-700/30 last:border-b-0">
                            <span className="text-slate-400 font-medium">
                                {item.label}:
                            </span>
                            <div className="flex items-center gap-2">
                                <span className="text-white font-mono text-sm break-all">
                                    {item.value}
                                </span>
                                <button
                                    onClick={() => copyToClipboard(item.value, item.field)}
                                    className="p-1 text-slate-400 hover:text-white transition-colors"
                                    title="Copy to clipboard"
                                >
                                    {copiedField === item.field ? (
                                        <CheckCircle className="w-4 h-4 text-green-400" />
                                    ) : (
                                        <Copy className="w-4 h-4" />
                                    )}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <h4 className="text-blue-400 font-medium mb-2">
                    Ready to Create Position
                </h4>
                <p className="text-blue-200/80 text-sm">
                    These values define your Uniswap V3 liquidity position.
                    The next step will create an on-chain transaction with these parameters.
                </p>
            </div>
        </div>
    );
}