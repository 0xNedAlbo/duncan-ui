/**
 * RPC Clients for Backend Services
 *
 * Provides blockchain RPC clients without frontend wallet dependencies.
 * Used by backend services and scripts that don't need wallet connectivity.
 */

import { createPublicClient, PublicClient, http } from "viem";
import {
    getChainConfig,
    SUPPORTED_CHAINS,
    SupportedChainsType,
} from "@/config/chains";

export class BackendRpcClients {
    private clients: Map<SupportedChainsType, PublicClient> = new Map();

    constructor() {
        this.initializeClients();
    }

    private initializeClients(): void {
        if (SUPPORTED_CHAINS.length) {
            SUPPORTED_CHAINS.forEach((chainName) => {
                const config = getChainConfig(chainName as SupportedChainsType);

                const client = createPublicClient({
                    chain: config as any,
                    transport: http(config.rpcUrl, {
                        timeout: 30000,
                        retryCount: 3,
                        retryDelay: 1000,
                    }),
                }) as PublicClient;

                this.clients.set(chainName as SupportedChainsType, client);
            });
        }
    }

    getClients() {
        if (!this.clients.size) {
            this.initializeClients();
        }
        return this.clients;
    }

    get(chain: SupportedChainsType): PublicClient | undefined {
        return this.clients.get(chain);
    }
}
