import { PrismaClient } from "@prisma/client";
import { BackendRpcClients } from "./evm/rpcClients";
import type { PublicClient } from "viem";
import type { SupportedChainsType } from "@/config/chains";
import { EtherscanClient } from "./etherscan/etherscanClient";
import { addressChecksumExtension } from "@/lib/validation/addressChecksum";

export interface Clients {
    prisma: PrismaClient;
    rpcClients: Map<SupportedChainsType, PublicClient>;
    etherscanClient: EtherscanClient;
}

export interface ClientsFactory {
    getClients(): Clients;
}

export class DefaultClientsFactory implements ClientsFactory {
    private static instance: DefaultClientsFactory;
    private clients: Clients;

    private constructor() {
        const prisma = new PrismaClient().$extends(addressChecksumExtension);
        const rpcClients = new BackendRpcClients().getClients();
        const etherscanClient = new EtherscanClient();

        this.clients = {
            prisma: prisma as any, // Cast to maintain interface compatibility
            rpcClients,
            etherscanClient,
        };
    }

    public static getInstance(): DefaultClientsFactory {
        if (!DefaultClientsFactory.instance) {
            DefaultClientsFactory.instance = new DefaultClientsFactory();
        }
        return DefaultClientsFactory.instance;
    }

    public getClients(): Clients {
        return this.clients;
    }
}