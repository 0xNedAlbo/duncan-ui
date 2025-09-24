"use client";

import { useState, useEffect, useRef } from "react";
import { Settings } from "lucide-react";
import type { PoolWithTokens } from "@/services/pools/poolService";
import type { PositionConfig } from "./types";

interface PositionConfigStepProps {
    pool: PoolWithTokens;
    config: PositionConfig | null;
    onConfigChange: (config: PositionConfig) => void;
    onCreatePosition: () => void;
    onBack: () => void;
}

export function PositionConfigStep({
    pool,
    config,
    onConfigChange,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onCreatePosition,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onBack,
}: PositionConfigStepProps) {
    const configRef = useRef<PositionConfig | null>(null);

    // State for the core position parameters
    const [tickLower, setTickLower] = useState<number>(config?.tickLower || -60);
    const [tickUpper, setTickUpper] = useState<number>(config?.tickUpper || 60);
    const [liquidity, setLiquidity] = useState<string>(config?.liquidity.toString() || "1000000000000000000");

    // Pool address comes from the selected pool, not user input
    const poolAddress = pool.poolAddress;

    // Update position config when values change
    useEffect(() => {
        const liquidityBigInt = BigInt(liquidity || "0");

        const newConfig: PositionConfig = {
            poolAddress,
            tickLower,
            tickUpper,
            liquidity: liquidityBigInt,
        };

        // Only call onConfigChange if the config has actually changed
        const prevConfig = configRef.current;
        const hasChanged = !prevConfig ||
            prevConfig.poolAddress !== newConfig.poolAddress ||
            prevConfig.tickLower !== newConfig.tickLower ||
            prevConfig.tickUpper !== newConfig.tickUpper ||
            prevConfig.liquidity !== newConfig.liquidity;

        if (hasChanged) {
            configRef.current = newConfig;
            onConfigChange(newConfig);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tickLower, tickUpper, liquidity]);

    const handleLiquidityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        // Allow empty input or valid BigInt strings
        if (value === "" || /^\d+$/.test(value)) {
            setLiquidity(value);
        }
    };

    return (
        <div className="space-y-6">

            <div className="max-w-md mx-auto">
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-6">
                    <div className="flex items-center gap-2 mb-6">
                        <Settings className="w-5 h-5 text-blue-400" />
                        <h4 className="text-lg font-semibold text-white">
                            Position Parameters
                        </h4>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Lower Tick
                            </label>
                            <input
                                type="number"
                                value={tickLower}
                                onChange={(e) => setTickLower(parseInt(e.target.value) || 0)}
                                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="-60"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Upper Tick
                            </label>
                            <input
                                type="number"
                                value={tickUpper}
                                onChange={(e) => setTickUpper(parseInt(e.target.value) || 0)}
                                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="60"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Liquidity Amount
                            </label>
                            <input
                                type="text"
                                value={liquidity}
                                onChange={handleLiquidityChange}
                                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="1000000000000000000"
                            />
                            <p className="text-xs text-slate-400 mt-1">
                                Abstract liquidity value (BigInt format)
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}