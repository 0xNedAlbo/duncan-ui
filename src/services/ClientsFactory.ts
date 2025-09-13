import { PrismaClient } from "@prisma/client";
import { PublicRpcClients } from "@/lib/wagmi";
import type { PublicClient } from "viem";
import type { SupportedChainsType } from "@/config/chains";
import { EtherscanClient } from "./etherscan/etherscanClient";

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
        const prisma = new PrismaClient();
        const rpcClients = new PublicRpcClients().getClients();
        const etherscanClient = new EtherscanClient();

        this.clients = {
            prisma,
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