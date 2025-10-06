"use client";

import { WagmiProvider } from "wagmi";
import { config } from "@/app-shared/lib/wagmi";
import "@rainbow-me/rainbowkit/styles.css";

import { RainbowKitProvider } from "@rainbow-me/rainbowkit";

export function Web3Provider({ children }: { children: React.ReactNode }) {
    return (
        <WagmiProvider config={config}>
            <RainbowKitProvider>{children}</RainbowKitProvider>
        </WagmiProvider>
    );
}
