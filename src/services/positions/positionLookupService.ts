/**
 * Position Lookup Service
 *
 * Discovers Uniswap V3 NFT positions for a given address using on-chain enumeration.
 * Uses balanceOf -> tokenOfOwnerByIndex -> positions to find all positions.
 */

import { type PublicClient } from "viem";
import { type SupportedChainsType, getChainId } from "@/config/chains";
import {
    NONFUNGIBLE_POSITION_MANAGER_ABI,
    NONFUNGIBLE_POSITION_MANAGER_ADDRESSES
} from "@/lib/contracts/nonfungiblePositionManager";
import { PrismaClient } from "@prisma/client";
import { PoolService, type PoolWithTokens } from "../pools/poolService";
import { PositionService, type BasicPosition, type PoolData } from "./positionService";
import { QuoteTokenService } from "./quoteTokenService";
import type { Services } from "../ServiceFactory";
import type { Clients } from "../ClientsFactory";
import { normalizeAddress, isValidAddress } from "@/lib/utils/evm";
import { createServiceLogger, type ServiceLogger } from "@/lib/logging/loggerFactory";
import type { DiscoveredPositionSummary } from "@/types/positions";

// Re-export for backward compatibility
export type { DiscoveredPositionSummary };

export interface PositionLookupResult {
    address: string;
    chain: SupportedChainsType;
    totalNFTs: number;
    existingPositions: number;
    newPositionsFound: number;
    positions: BasicPosition[];
    summary: DiscoveredPositionSummary[];
}

export class PositionLookupService {
    private prisma: PrismaClient;
    private rpcClients: Map<SupportedChainsType, PublicClient>;
    private poolService: PoolService;
    private positionService: PositionService;
    private quoteTokenService: QuoteTokenService;
    private logger: ServiceLogger;

    constructor(
        requiredClients: Pick<Clients, "prisma" | "rpcClients">,
        requiredServices: Pick<Services, "poolService" | "positionService">
    ) {
        this.prisma = requiredClients.prisma;
        this.rpcClients = requiredClients.rpcClients;
        this.poolService = requiredServices.poolService;
        this.positionService = requiredServices.positionService;
        this.quoteTokenService = new QuoteTokenService();
        this.logger = createServiceLogger('PositionLookupService');
    }

    /**
     * Discover NFT positions for a given address
     */
    async findPositionsForAddress(
        address: string,
        chain: SupportedChainsType,
        userId: string,
        limit: number = 10
    ): Promise<PositionLookupResult> {
        // Validate inputs
        if (!isValidAddress(address)) {
            throw new Error(`Invalid address format: ${address}`);
        }

        if (!userId || !chain) {
            throw new Error("Missing required parameters: userId or chain");
        }

        const normalizedAddress = normalizeAddress(address);

        const client = this.rpcClients.get(chain);
        if (!client) {
            throw new Error(`No RPC client available for chain: ${chain}`);
        }

        const chainId = getChainId(chain);
        const nftManagerAddress = NONFUNGIBLE_POSITION_MANAGER_ADDRESSES[chainId];
        if (!nftManagerAddress) {
            throw new Error(
                `NFT Manager address not configured for chain: ${chain} (chainId: ${chainId})`
            );
        }

        // Step 1: Get total NFT balance for the address
        const balance = await client.readContract({
            address: nftManagerAddress,
            abi: NONFUNGIBLE_POSITION_MANAGER_ABI,
            functionName: "balanceOf",
            args: [normalizedAddress as `0x${string}`],
        });

        // Step 2: Get existing positions to avoid duplicates
        const existingNftIds = await this.getExistingNftIds(userId, chain);

        // Step 3: Iterate through NFTs and discover positions
        const foundPositions: BasicPosition[] = [];
        const summaryData: DiscoveredPositionSummary[] = [];
        const totalNFTs = Number(balance);

        // Add buffer to account for existing positions we'll skip
        const maxIterations = Math.min(totalNFTs, limit + existingNftIds.length);

        // Start from the highest index (latest positions) and iterate in descending order
        for (let i = totalNFTs - 1; i >= 0 && foundPositions.length < limit && (totalNFTs - i) <= maxIterations; i--) {
            try {
                // Get NFT ID at index
                const nftId = await client.readContract({
                    address: nftManagerAddress,
                    abi: NONFUNGIBLE_POSITION_MANAGER_ABI,
                    functionName: "tokenOfOwnerByIndex",
                    args: [normalizedAddress as `0x${string}`, BigInt(i)],
                });

                const nftIdString = nftId.toString();

                // Skip if already exists in database
                if (existingNftIds.includes(nftIdString)) {
                    continue;
                }

                // Get position data from contract
                const positionData = await this.getPositionFromNft(
                    client,
                    nftManagerAddress,
                    nftId
                );

                // Get pool address from factory
                const poolAddress = await this.positionService.getPoolAddress(
                    chain,
                    positionData.token0,
                    positionData.token1,
                    positionData.fee
                );

                // Get/create pool data
                const poolWithTokens = await this.poolService.createPool(
                    chain,
                    poolAddress
                );

                // Convert PoolWithTokens to PoolData format
                const poolData = this.convertToPoolData(poolWithTokens);

                // Determine quote token configuration
                const { token0IsQuote } = this.quoteTokenService.determineQuoteToken(
                    poolData.token0.symbol,
                    poolData.token0.address,
                    poolData.token1.symbol,
                    poolData.token1.address,
                    chain
                );

                // Determine position status
                const status = positionData.liquidity > 0n ? "active" : "closed";

                // Create BasicPosition structure
                const basicPosition: BasicPosition = {
                    userId,
                    chain,
                    protocol: "uniswapv3",
                    nftId: nftIdString,
                    liquidity: positionData.liquidity.toString(),
                    tickLower: positionData.tickLower,
                    tickUpper: positionData.tickUpper,
                    token0IsQuote,
                    owner: normalizedAddress,
                    importType: "discovery",
                    status,
                    pool: poolData,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                };

                foundPositions.push(basicPosition);

                // Add to summary
                summaryData.push({
                    nftId: nftIdString,
                    poolAddress: poolData.poolAddress,
                    token0Symbol: poolData.token0.symbol,
                    token1Symbol: poolData.token1.symbol,
                    fee: poolData.fee,
                    tickLower: positionData.tickLower,
                    tickUpper: positionData.tickUpper,
                    liquidity: positionData.liquidity.toString(),
                    status,
                });

            } catch (error) {
                // Log error but continue with next NFT
                this.logger.debug(
                    { error: error instanceof Error ? error.message : 'Unknown error', index: i },
                    'Failed to process NFT at index'
                );
                continue;
            }
        }

        return {
            address: normalizedAddress,
            chain,
            totalNFTs,
            existingPositions: existingNftIds.length,
            newPositionsFound: foundPositions.length,
            positions: foundPositions,
            summary: summaryData,
        };
    }

    /**
     * Get existing NFT IDs for a user on a specific chain to avoid duplicates
     */
    private async getExistingNftIds(userId: string, chain: SupportedChainsType): Promise<string[]> {
        const existingPositions = await this.prisma.position.findMany({
            where: {
                userId,
                chain,
                protocol: "uniswapv3",
            },
            select: {
                nftId: true,
            },
        });

        return existingPositions.map(p => p.nftId);
    }

    /**
     * Get position data from NFT Manager contract
     */
    private async getPositionFromNft(
        client: PublicClient,
        nftManagerAddress: string,
        nftId: bigint
    ) {
        try {
            const positionData = await client.readContract({
                address: nftManagerAddress as `0x${string}`,
                abi: NONFUNGIBLE_POSITION_MANAGER_ABI,
                functionName: "positions",
                args: [nftId],
            });

            return {
                nonce: positionData[0],
                operator: positionData[1],
                token0: positionData[2],
                token1: positionData[3],
                fee: positionData[4],
                tickLower: positionData[5],
                tickUpper: positionData[6],
                liquidity: positionData[7],
                feeGrowthInside0LastX128: positionData[8],
                feeGrowthInside1LastX128: positionData[9],
                tokensOwed0: positionData[10],
                tokensOwed1: positionData[11],
            };
        } catch (error) {
            throw new Error(
                `Failed to read position data from NFT ${nftId}: ${
                    error instanceof Error ? error.message : "Unknown error"
                }`
            );
        }
    }

    /**
     * Convert PoolWithTokens (from database) to PoolData format
     */
    private convertToPoolData(poolWithTokens: PoolWithTokens): PoolData {
        return {
            chain: poolWithTokens.chain,
            poolAddress: poolWithTokens.poolAddress,
            protocol: poolWithTokens.protocol,
            fee: poolWithTokens.fee,
            tickSpacing: poolWithTokens.tickSpacing,
            token0: {
                address: poolWithTokens.token0.address,
                symbol: poolWithTokens.token0.symbol,
                name: poolWithTokens.token0.name,
                decimals: poolWithTokens.token0.decimals,
                logoUrl: poolWithTokens.token0.logoUrl || undefined,
            },
            token1: {
                address: poolWithTokens.token1.address,
                symbol: poolWithTokens.token1.symbol,
                name: poolWithTokens.token1.name,
                decimals: poolWithTokens.token1.decimals,
                logoUrl: poolWithTokens.token1.logoUrl || undefined,
            },
            currentTick: poolWithTokens.currentTick || undefined,
            currentPrice: poolWithTokens.currentPrice || undefined,
        };
    }
}