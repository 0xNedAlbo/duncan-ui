import { AlchemyTokenService } from "./alchemy/tokenMetadata";
import { EtherscanEventService } from "./etherscan/etherscanEventService";
import { EtherscanBlockInfoService } from "./etherscan/etherscanBlockInfoService";
import { EvmBlockInfoService } from "./evm/evmBlockInfoService";
import { PoolService } from "./pools/poolService";
import { PoolPriceService } from "./prices/poolPriceService";
import { QuoteTokenService } from "./positions/quoteTokenService";
import { PositionImportService } from "./positions/positionImportService";
import { PositionLedgerService } from "./positions/positionLedgerService";
import { PositionService } from "./positions/positionService";
import { PositionPnLService } from "./positions/positionPnLService";
import { CurveDataService } from "./positions/curveDataService";
import { TokenService } from "./tokens/tokenService";
import { TokenReferenceService } from "./tokens/tokenReferenceService";
import { TokenResolutionService } from "./tokens/tokenResolutionService";
import { ApiKeyService } from "./auth/apiKeyService";
import { DefaultClientsFactory } from "./ClientsFactory";

export interface Services {
    alchemyTokenService: AlchemyTokenService;
    etherscanEventService: EtherscanEventService;
    etherscanBlockInfoService: EtherscanBlockInfoService;
    evmBlockInfoService: EvmBlockInfoService;
    poolService: PoolService;
    poolPriceService: PoolPriceService;
    quoteTokenService: QuoteTokenService;
    positionImportService: PositionImportService;
    positionLedgerService: PositionLedgerService;
    positionService: PositionService;
    positionPnLService: PositionPnLService;
    curveDataService: CurveDataService;
    tokenService: TokenService;
    tokenReferenceService: TokenReferenceService;
    tokenResolutionService: TokenResolutionService;
    apiKeyService: ApiKeyService;
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
        const etherscanBlockInfoService = new EtherscanBlockInfoService(
            { etherscanClient }
        );
        const evmBlockInfoService = new EvmBlockInfoService(rpcClients);
        const poolPriceService = new PoolPriceService({ rpcClients, prisma });
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

        const positionLedgerService = new PositionLedgerService(
            { prisma, etherscanClient },
            { tokenService, poolPriceService, etherscanBlockInfoService, evmBlockInfoService }
        );

        const positionImportService = new PositionImportService(
            { prisma, rpcClients, etherscanClient },
            { positionService, poolService }
        );

        const positionPnLService = new PositionPnLService(
            { prisma, rpcClients },
            { positionService, poolService, positionLedgerService }
        );

        const curveDataService = new CurveDataService(
            { positionPnLService }
        );

        const apiKeyService = new ApiKeyService(prisma);

        this.services = {
            alchemyTokenService,
            etherscanEventService,
            etherscanBlockInfoService,
            evmBlockInfoService,
            poolService,
            poolPriceService,
            quoteTokenService,
            positionImportService,
            positionLedgerService,
            positionService,
            positionPnLService,
            curveDataService,
            tokenService,
            tokenReferenceService,
            tokenResolutionService,
            apiKeyService,
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
