"use client";

import { useEffect, useState } from "react";
import type { SupportedChainsType } from "@/config/chains";

// Dynamic import to avoid SSR issues
let CowSwapWidgetReact: any = null;
let TradeType: any = null;

interface CowSwapWidgetProps {
    buyToken?: {
        address: string;
        symbol: string;
        decimals: number;
        amount: string; // Human readable amount (e.g., "1500.5")
    };
    sellToken?: {
        address: string;
        symbol: string;
        decimals: number;
    };
    chain?: SupportedChainsType;
}

// Map our chain types to CowSwap chain IDs
function getChainIdForCowSwap(chain?: SupportedChainsType): number {
    switch (chain) {
        case "ethereum":
            return 1;
        case "arbitrum":
        case "arbitrum-fork-local": // Use arbitrum for our fork testnet
            return 42161;
        case "base":
            return 8453;
        default:
            return 1; // Default to Ethereum mainnet
    }
}

export function CowSwapWidget({
    buyToken,
    sellToken,
    chain,
}: CowSwapWidgetProps) {
    const [widgetLoaded, setWidgetLoaded] = useState(false);

    useEffect(() => {
        // Dynamic import to avoid SSR issues
        const loadWidget = async () => {
            if (!CowSwapWidgetReact) {
                try {
                    const widgetLib = await import("@cowprotocol/widget-react");
                    CowSwapWidgetReact = widgetLib.CowSwapWidget;
                    TradeType = widgetLib.TradeType;
                    setWidgetLoaded(true);
                } catch (error) {
                    console.error(
                        "Failed to load CowSwap widget library:",
                        error
                    );
                }
            } else {
                setWidgetLoaded(true);
            }
        };

        loadWidget();
    }, []);

    if (!widgetLoaded) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="text-slate-400">Loading CowSwap widget...</div>
            </div>
        );
    }

    if (!CowSwapWidgetReact) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="text-slate-400">Failed to load widget</div>
            </div>
        );
    }

    // Prepare widget parameters
    const params = {
        appCode: "DUNCAN_LIQUIDITY_MANAGER",
        chainId: getChainIdForCowSwap(chain),
        theme: "dark",
        width: "100%",
        height: "600px",
        standaloneMode: false,
        tradeType: TradeType?.SWAP,
    };

    // Pre-fill buy token if provided
    if (buyToken) {
        console.log("Setting buy token in CowSwap widget:", buyToken.symbol, buyToken.amount);
        params.buy = {
            asset: buyToken.address,
            amount: buyToken.amount,
        };
    }

    // Pre-fill sell token if provided
    if (sellToken) {
        params.sell = {
            asset: sellToken.address,
        };
    }

    return (
        <div className="w-full">
            <CowSwapWidgetReact
                params={params}
                provider={(window as any)?.ethereum}
            />
        </div>
    );
}