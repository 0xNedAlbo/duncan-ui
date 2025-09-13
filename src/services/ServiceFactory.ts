import { AlchemyTokenService } from "./alchemy/tokenMetadata";
import { EtherscanEventService } from "./etherscan/etherscanEventService";
import { PoolService } from "./pools/poolService";
import { PoolPriceService } from "./prices/poolPriceService";
import { QuoteTokenService } from "./positions/quoteTokenService";
import { PositionImportService } from "./positions/positionImportService";
import { PositionService } from "./positions/positionService";
import { TokenService } from "./tokens/tokenService";
import { TokenReferenceService } from "./tokens/tokenReferenceService";
import { TokenResolutionService } from "./tokens/tokenResolutionService";
import { DefaultClientsFactory } from "./ClientsFactory";

export interface Services {
    alchemyTokenService: AlchemyTokenService;
    etherscanEventService: EtherscanEventService;
    poolService: PoolService;
    poolPriceService: PoolPriceService;
    quoteTokenService: QuoteTokenService;
    positionImportService: PositionImportService;
    positionService: PositionService;
    tokenService: TokenService;
    tokenReferenceService: TokenReferenceService;
    tokenResolutionService: TokenResolutionService;
}

export interface ServiceFactory {
    getServices(): Services;
}

export class DefaultServiceFactory implements ServiceFactory {
    private static instance: DefaultServiceFactory;
    private services: Services;

    private constructor() {
        const clients = DefaultClientsFactory.getInstance().getClients();
        const { prisma, rpcClients, etherscanClient } = clients;

        const alchemyTokenService = new AlchemyTokenService();
        const etherscanEventService = new EtherscanEventService(
            { etherscanClient }
        );
        const poolPriceService = new PoolPriceService();
        const quoteTokenService = new QuoteTokenService();
        const positionService = new PositionService(prisma);

        const tokenService = new TokenService(
            { prisma },
            { alchemyTokenService }
        );

        const tokenResolutionService = new TokenResolutionService(
            { prisma },
            { tokenService, alchemyTokenService }
        );

        const tokenReferenceService = new TokenReferenceService(
            { prisma },
            { tokenResolutionService }
        );

        const poolService = new PoolService(
            { prisma },
            { tokenResolutionService, tokenReferenceService }
        );

        const positionImportService = new PositionImportService(
            { prisma, rpcClients },
            { positionService, poolService }
        );

        this.services = {
            alchemyTokenService,
            etherscanEventService,
            poolService,
            poolPriceService,
            quoteTokenService,
            positionImportService,
            positionService,
            tokenService,
            tokenReferenceService,
            tokenResolutionService,
        };
    }

    public static getInstance(): DefaultServiceFactory {
        if (!DefaultServiceFactory.instance) {
            DefaultServiceFactory.instance = new DefaultServiceFactory();
        }
        return DefaultServiceFactory.instance;
    }

    public getServices(): Services {
        return this.services;
    }
}
