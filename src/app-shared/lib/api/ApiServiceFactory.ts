import { AlchemyTokenService } from "@/services/alchemy/tokenMetadata";
import { CoinGeckoService } from "@/services/coingecko/coinGeckoService";
import { EtherscanEventService } from "@/services/etherscan/etherscanEventService";
import { EtherscanBlockInfoService } from "@/services/etherscan/etherscanBlockInfoService";
import { EvmBlockInfoService } from "@/services/evm/evmBlockInfoService";
import { PoolService } from "@/services/pools/poolService";
import { PoolDiscoveryService } from "@/services/pools/poolDiscoveryService";
import { PoolPriceService } from "@/services/prices/poolPriceService";
import { QuoteTokenService } from "@/services/positions/quoteTokenService";
import { PositionImportService } from "@/services/positions/positionImportService";
import { PositionLookupService } from "@/services/positions/positionLookupService";
import { PositionLedgerService } from "@/services/positions/positionLedgerService";
import { PositionService } from "@/services/positions/positionService";
import { PositionPnLService } from "@/services/positions/positionPnLService";
import { PositionAprService } from "@/services/positions/positionAprService";
import { CurveDataService } from "@/services/positions/curveDataService";
import { TokenService } from "@/services/tokens/tokenService";
import { ApiKeyService } from "@/services/auth/apiKeyService";
import { DefaultClientsFactory, type Clients } from "@/services/ClientsFactory";
import type { Services } from "@/services/ServiceFactory";

export class ApiServiceFactory {
    private static instance: ApiServiceFactory;
    private clients: Clients;
    private serviceInstances: Partial<Services> = {};

    private constructor() {
        this.clients = DefaultClientsFactory.getInstance().getClients();
    }

    public static getInstance(): ApiServiceFactory {
        if (!ApiServiceFactory.instance) {
            ApiServiceFactory.instance = new ApiServiceFactory();
        }
        return ApiServiceFactory.instance;
    }

    public get alchemyTokenService(): AlchemyTokenService {
        if (!this.serviceInstances.alchemyTokenService) {
            this.serviceInstances.alchemyTokenService = new AlchemyTokenService();
        }
        return this.serviceInstances.alchemyTokenService;
    }

    public get coinGeckoService(): CoinGeckoService {
        if (!this.serviceInstances.coinGeckoService) {
            this.serviceInstances.coinGeckoService = new CoinGeckoService();
        }
        return this.serviceInstances.coinGeckoService;
    }

    public get etherscanEventService(): EtherscanEventService {
        if (!this.serviceInstances.etherscanEventService) {
            const { etherscanClient } = this.clients;
            this.serviceInstances.etherscanEventService = new EtherscanEventService(
                { etherscanClient }
            );
        }
        return this.serviceInstances.etherscanEventService;
    }

    public get etherscanBlockInfoService(): EtherscanBlockInfoService {
        if (!this.serviceInstances.etherscanBlockInfoService) {
            const { etherscanClient } = this.clients;
            this.serviceInstances.etherscanBlockInfoService = new EtherscanBlockInfoService(
                { etherscanClient }
            );
        }
        return this.serviceInstances.etherscanBlockInfoService;
    }

    public get evmBlockInfoService(): EvmBlockInfoService {
        if (!this.serviceInstances.evmBlockInfoService) {
            const { rpcClients } = this.clients;
            this.serviceInstances.evmBlockInfoService = new EvmBlockInfoService(rpcClients);
        }
        return this.serviceInstances.evmBlockInfoService;
    }

    public get poolPriceService(): PoolPriceService {
        if (!this.serviceInstances.poolPriceService) {
            const { rpcClients, prisma } = this.clients;
            this.serviceInstances.poolPriceService = new PoolPriceService({ rpcClients, prisma });
        }
        return this.serviceInstances.poolPriceService;
    }

    public get quoteTokenService(): QuoteTokenService {
        if (!this.serviceInstances.quoteTokenService) {
            this.serviceInstances.quoteTokenService = new QuoteTokenService();
        }
        return this.serviceInstances.quoteTokenService;
    }

    public get positionService(): PositionService {
        if (!this.serviceInstances.positionService) {
            const { prisma, rpcClients } = this.clients;
            this.serviceInstances.positionService = new PositionService(prisma, rpcClients);
        }
        return this.serviceInstances.positionService;
    }

    public get tokenService(): TokenService {
        if (!this.serviceInstances.tokenService) {
            const { prisma, rpcClients } = this.clients;
            this.serviceInstances.tokenService = new TokenService(
                { prisma, rpcClients },
                { alchemyTokenService: this.alchemyTokenService, coinGeckoService: this.coinGeckoService }
            );
        }
        return this.serviceInstances.tokenService;
    }


    public get poolService(): PoolService {
        if (!this.serviceInstances.poolService) {
            const { prisma, rpcClients } = this.clients;
            this.serviceInstances.poolService = new PoolService(
                { prisma, rpcClients },
                { tokenService: this.tokenService }
            );
        }
        return this.serviceInstances.poolService;
    }

    public get poolDiscoveryService(): PoolDiscoveryService {
        if (!this.serviceInstances.poolDiscoveryService) {
            const { rpcClients } = this.clients;
            this.serviceInstances.poolDiscoveryService = new PoolDiscoveryService(
                { rpcClients },
                { poolService: this.poolService }
            );
        }
        return this.serviceInstances.poolDiscoveryService;
    }

    public get positionLedgerService(): PositionLedgerService {
        if (!this.serviceInstances.positionLedgerService) {
            const { prisma, etherscanClient } = this.clients;
            this.serviceInstances.positionLedgerService = new PositionLedgerService(
                { prisma, etherscanClient },
                {
                    tokenService: this.tokenService,
                    poolPriceService: this.poolPriceService,
                    evmBlockInfoService: this.evmBlockInfoService,
                    positionAprService: this.positionAprService
                }
            );
        }
        return this.serviceInstances.positionLedgerService;
    }

    public get positionImportService(): PositionImportService {
        if (!this.serviceInstances.positionImportService) {
            const { prisma, rpcClients, etherscanClient } = this.clients;
            this.serviceInstances.positionImportService = new PositionImportService(
                { prisma, rpcClients, etherscanClient },
                {
                    positionService: this.positionService,
                    poolService: this.poolService,
                    positionPnLService: this.positionPnLService,
                    positionLedgerService: this.positionLedgerService
                }
            );
        }
        return this.serviceInstances.positionImportService;
    }

    public get positionLookupService(): PositionLookupService {
        if (!this.serviceInstances.positionLookupService) {
            const { prisma, rpcClients } = this.clients;
            this.serviceInstances.positionLookupService = new PositionLookupService(
                { prisma, rpcClients },
                { poolService: this.poolService, positionService: this.positionService }
            );
        }
        return this.serviceInstances.positionLookupService;
    }

    public get positionPnLService(): PositionPnLService {
        if (!this.serviceInstances.positionPnLService) {
            const { prisma, rpcClients } = this.clients;
            this.serviceInstances.positionPnLService = new PositionPnLService(
                { prisma, rpcClients },
                { positionService: this.positionService, poolService: this.poolService, positionLedgerService: this.positionLedgerService }
            );
        }
        return this.serviceInstances.positionPnLService;
    }

    public get positionAprService(): PositionAprService {
        if (!this.serviceInstances.positionAprService) {
            const { prisma } = this.clients;
            this.serviceInstances.positionAprService = new PositionAprService(prisma);
        }
        return this.serviceInstances.positionAprService;
    }

    public get curveDataService(): CurveDataService {
        if (!this.serviceInstances.curveDataService) {
            const { prisma } = this.clients;
            this.serviceInstances.curveDataService = new CurveDataService(
                { prisma },
                { positionPnLService: this.positionPnLService }
            );
        }
        return this.serviceInstances.curveDataService;
    }

    public get apiKeyService(): ApiKeyService {
        if (!this.serviceInstances.apiKeyService) {
            const { prisma } = this.clients;
            this.serviceInstances.apiKeyService = new ApiKeyService(prisma);
        }
        return this.serviceInstances.apiKeyService;
    }

    public getServices(): Services {
        return {
            alchemyTokenService: this.alchemyTokenService,
            coinGeckoService: this.coinGeckoService,
            etherscanEventService: this.etherscanEventService,
            etherscanBlockInfoService: this.etherscanBlockInfoService,
            evmBlockInfoService: this.evmBlockInfoService,
            poolService: this.poolService,
            poolDiscoveryService: this.poolDiscoveryService,
            poolPriceService: this.poolPriceService,
            quoteTokenService: this.quoteTokenService,
            positionImportService: this.positionImportService,
            positionLookupService: this.positionLookupService,
            positionLedgerService: this.positionLedgerService,
            positionService: this.positionService,
            positionPnLService: this.positionPnLService,
            positionAprService: this.positionAprService,
            curveDataService: this.curveDataService,
            tokenService: this.tokenService,
            apiKeyService: this.apiKeyService,
        };
    }
}

// Helper function for convenience
export function getApiServiceFactory(): ApiServiceFactory {
    return ApiServiceFactory.getInstance();
}