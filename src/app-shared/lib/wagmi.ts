import {
    getChainConfig,
    SUPPORTED_CHAINS,
    SupportedChainsType,
} from "@/config/chains";
import { createPublicClient, PublicClient } from "viem";
import { http, createConfig } from "wagmi";
import { injected, walletConnect } from "wagmi/connectors";
import type { Chain } from "viem";

const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || "";

// Build chains and transports dynamically from supported chains
const chains: Chain[] = [];
const transports: Record<number, any> = {};

SUPPORTED_CHAINS.forEach((chainName) => {
    const chainConfig = getChainConfig(chainName as SupportedChainsType);
    if (chainConfig?.viemChain) {
        chains.push(chainConfig.viemChain);
        transports[chainConfig.chainId] = http(chainConfig.rpcUrl);
    }
});

export const config = createConfig({
    chains: chains as any,
    connectors: [injected(), walletConnect({ projectId })],
    transports,
});

const clients: Map<SupportedChainsType, PublicClient> = new Map<
    SupportedChainsType,
    PublicClient
>();

export class PublicRpcClients {
    private clients: Map<SupportedChainsType, PublicClient> = new Map<
        SupportedChainsType,
        PublicClient
    >();

    constructor() {
        this.initializeClients();
    }

    private initializeClients(): void {
        if (SUPPORTED_CHAINS.length)
            SUPPORTED_CHAINS.forEach((chainName) => {
                const config = getChainConfig(chainName as SupportedChainsType);

                const client = createPublicClient({
                    chain: config as any,
                    transport: http(config.rpcUrl, {
                        timeout: 30000,
                        retryCount: 3,
                        retryDelay: 1000,
                    }),
                }) as any;
                clients.set(chainName as SupportedChainsType, client);
            });
    }

    getClients() {
        if (!clients.size) this.initializeClients();
        return clients;
    }
}
