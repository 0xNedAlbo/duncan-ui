import { AlchemyTokenService } from "@/services/alchemy/tokenMetadata";
import { EtherscanEventService } from "@/services/etherscan/etherscanEventService";
import { EtherscanBlockInfoService } from "@/services/etherscan/etherscanBlockInfoService";
import { EvmBlockInfoService } from "@/services/evm/evmBlockInfoService";
import { PoolService } from "@/services/pools/poolService";
import { PoolPriceService } from "@/services/prices/poolPriceService";
import { QuoteTokenService } from "@/services/positions/quoteTokenService";
import { PositionImportService } from "@/services/positions/positionImportService";
import { PositionLedgerService } from "@/services/positions/positionLedgerService";
import { PositionService } from "@/services/positions/positionService";
import { PositionPnLService } from "@/services/positions/positionPnLService";
import { CurveDataService } from "@/services/positions/curveDataService";
import { TokenService } from "@/services/tokens/tokenService";
import { TokenReferenceService } from "@/services/tokens/tokenReferenceService";
import { TokenResolutionService } from "@/services/tokens/tokenResolutionService";
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
            const { prisma } = this.clients;
            this.serviceInstances.positionService = new PositionService(prisma);
        }
        return this.serviceInstances.positionService;
    }

    public get tokenService(): TokenService {
        if (!this.serviceInstances.tokenService) {
            const { prisma } = this.clients;
            this.serviceInstances.tokenService = new TokenService(
                { prisma },
                { alchemyTokenService: this.alchemyTokenService }
            );
        }
        return this.serviceInstances.tokenService;
    }

    public get tokenResolutionService(): TokenResolutionService {
        if (!this.serviceInstances.tokenResolutionService) {
            const { prisma } = this.clients;
            this.serviceInstances.tokenResolutionService = new TokenResolutionService(
                { prisma },
                { tokenService: this.tokenService, alchemyTokenService: this.alchemyTokenService }
            );
        }
        return this.serviceInstances.tokenResolutionService;
    }

    public get tokenReferenceService(): TokenReferenceService {
        if (!this.serviceInstances.tokenReferenceService) {
            const { prisma } = this.clients;
            this.serviceInstances.tokenReferenceService = new TokenReferenceService(
                { prisma },
                { tokenResolutionService: this.tokenResolutionService }
            );
        }
        return this.serviceInstances.tokenReferenceService;
    }

    public get poolService(): PoolService {
        if (!this.serviceInstances.poolService) {
            const { prisma } = this.clients;
            this.serviceInstances.poolService = new PoolService(
                { prisma },
                { tokenResolutionService: this.tokenResolutionService, tokenReferenceService: this.tokenReferenceService }
            );
        }
        return this.serviceInstances.poolService;
    }

    public get positionLedgerService(): PositionLedgerService {
        if (!this.serviceInstances.positionLedgerService) {
            const { prisma, etherscanClient } = this.clients;
            this.serviceInstances.positionLedgerService = new PositionLedgerService(
                { prisma, etherscanClient },
                {
                    tokenService: this.tokenService,
                    poolPriceService: this.poolPriceService,
                    etherscanBlockInfoService: this.etherscanBlockInfoService,
                    evmBlockInfoService: this.evmBlockInfoService
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
                { positionService: this.positionService, poolService: this.poolService, positionPnLService: this.positionPnLService, positionLedgerService: this.positionLedgerService }
            );
        }
        return this.serviceInstances.positionImportService;
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

    public get curveDataService(): CurveDataService {
        if (!this.serviceInstances.curveDataService) {
            this.serviceInstances.curveDataService = new CurveDataService(
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
}