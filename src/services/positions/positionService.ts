/**
 * Position Service - Clean Rewrite
 *
 * Focused on essential database operations for Uniswap V3 positions.
 * PnL calculations and complex analytics are handled by separate services.
 */

import { SupportedChainsType } from "@/config/chains";
import { PrismaClient } from "@prisma/client";
import { type PublicClient } from "viem";
import { UNISWAP_V3_FACTORY_ABI, UNISWAP_V3_FACTORY_ADDRESSES } from "@/lib/contracts/uniswapV3Factory";
import { NONFUNGIBLE_POSITION_MANAGER_ABI, NONFUNGIBLE_POSITION_MANAGER_ADDRESSES, getChainId } from "@/lib/contracts/nonfungiblePositionManager";
import { normalizeAddress, compareAddresses } from "@/lib/utils/evm";

// Token data interface
export interface TokenData {
    address: string;
    symbol: string;
    name: string;
    decimals: number;
    logoUrl?: string;
}

// Pool data interface
export interface PoolData {
    chain: string;
    poolAddress: string;
    protocol: string;
    fee: number;
    tickSpacing: number;
    token0: TokenData;
    token1: TokenData;
    currentTick?: number;
    currentPrice?: string;
}

// Basic position interface (no PnL data)
export interface BasicPosition {
    userId: string;
    chain: string;
    protocol: string;
    nftId: string;
    liquidity: string;
    tickLower: number;
    tickUpper: number;
    token0IsQuote: boolean;
    owner?: string;
    importType: string;
    status: string;
    pool: PoolData;
    createdAt: Date;
    updatedAt: Date;
}

// Position creation data
export interface CreatePositionData {
    chain: string;
    protocol: string;
    nftId: string;
    userId: string;
    poolChain: string;
    poolAddress: string;
    tickLower: number;
    tickUpper: number;
    liquidity: string;
    token0IsQuote: boolean;
    owner?: string;
    importType: "manual" | "wallet" | "nft";
    status?: string;
}

// Position composite primary key interface
export interface PositionId {
    userId: string;
    chain: string;
    protocol: string;
    nftId: string;
}

// Helper functions for PositionId
export function createPositionId(userId: string, chain: string, protocol: string, nftId: string): PositionId {
    return { userId, chain, protocol, nftId };
}

export function formatPositionKey(positionId: PositionId): string {
    return `${positionId.userId}-${positionId.chain}-${positionId.protocol}-${positionId.nftId}`;
}

// Position update data
export interface UpdatePositionData {
    liquidity?: string;
    tickLower?: number;
    tickUpper?: number;
    token0IsQuote?: boolean;
    owner?: string;
    status?: string;
}

// Position list options
export interface PositionListOptions {
    userId?: string;
    chain?: SupportedChainsType;
    status?: string;
    limit?: number;
    offset?: number;
    sortBy?: "createdAt" | "updatedAt" | "liquidity";
    sortOrder?: "asc" | "desc";
}

export class PositionService {
    private prisma: PrismaClient;
    private rpcClients: Map<SupportedChainsType, PublicClient>;

    constructor(prisma: PrismaClient, rpcClients: Map<SupportedChainsType, PublicClient>) {
        this.prisma = prisma;
        this.rpcClients = rpcClients;
    }

    /**
     * Get a single position by PositionId
     */
    async getPosition(positionId: PositionId): Promise<BasicPosition | null> {
        const position = await this.prisma.position.findUnique({
            where: {
                userId_chain_protocol_nftId: {
                    userId: positionId.userId,
                    chain: positionId.chain,
                    protocol: positionId.protocol,
                    nftId: positionId.nftId,
                },
            },
            include: {
                pool: {
                    include: {
                        token0: true,
                        token1: true,
                    },
                },
            },
        });

        if (!position) {
            return null;
        }

        return this.mapToBasicPosition(position);
    }

    /**
     * List positions with filtering and pagination
     */
    async listPositions(
        options: PositionListOptions = {}
    ): Promise<BasicPosition[]> {
        const {
            userId,
            chain,
            status,
            limit = 50,
            offset = 0,
            sortBy = "createdAt",
            sortOrder = "desc",
        } = options;

        const whereClause: any = {};

        if (status) {
            whereClause.status = status;
        }

        if (userId) {
            whereClause.userId = userId;
        }

        if (chain) {
            whereClause.chain = chain;
        }

        const positions = await this.prisma.position.findMany({
            where: whereClause,
            include: {
                pool: {
                    include: {
                        token0: true,
                        token1: true,
                    },
                },
            },
            orderBy: {
                [sortBy]: sortOrder,
            },
            take: limit,
            skip: offset,
        });

        return positions.map((position) => this.mapToBasicPosition(position));
    }

    /**
     * Create a new position
     */
    async createPosition(data: CreatePositionData): Promise<BasicPosition> {
        const positionData = {
            chain: data.chain,
            protocol: data.protocol,
            nftId: data.nftId,
            userId: data.userId,
            poolAddress: data.poolAddress,
            tickLower: data.tickLower,
            tickUpper: data.tickUpper,
            liquidity: data.liquidity,
            token0IsQuote: data.token0IsQuote,
            owner: data.owner,
            importType: data.importType,
            status: data.status || "active",
        };

        const position = await this.prisma.position.create({
            data: positionData,
            include: {
                pool: {
                    include: {
                        token0: true,
                        token1: true,
                    },
                },
            },
        });

        return this.mapToBasicPosition(position);
    }

    /**
     * Update an existing position
     */
    async updatePosition(
        positionId: PositionId,
        data: UpdatePositionData
    ): Promise<BasicPosition> {
        const position = await this.prisma.position.update({
            where: {
                userId_chain_protocol_nftId: {
                    userId: positionId.userId,
                    chain: positionId.chain,
                    protocol: positionId.protocol,
                    nftId: positionId.nftId,
                },
            },
            data,
            include: {
                pool: {
                    include: {
                        token0: true,
                        token1: true,
                    },
                },
            },
        });

        return this.mapToBasicPosition(position);
    }

    /**
     * Update mutable on-chain fields of a position by fetching current data from blockchain
     */
    async updatePositionOnChainData(
        positionId: PositionId
    ): Promise<BasicPosition> {
        // Get RPC client for the chain
        const publicClient = this.rpcClients.get(positionId.chain as SupportedChainsType);
        if (!publicClient) {
            throw new Error(`No RPC client available for chain: ${positionId.chain}`);
        }

        // Get NFT Position Manager address
        const chainId = getChainId(positionId.chain);
        const nftManagerAddress = NONFUNGIBLE_POSITION_MANAGER_ADDRESSES[chainId];
        if (!nftManagerAddress) {
            throw new Error(`NFT Manager address not configured for chain: ${positionId.chain} (chainId: ${chainId})`);
        }

        const nftId = BigInt(positionId.nftId);

        // Fetch current position data from NFT contract
        const [positionData, owner] = await Promise.all([
            publicClient.readContract({
                address: nftManagerAddress as `0x${string}`,
                abi: NONFUNGIBLE_POSITION_MANAGER_ABI,
                functionName: "positions",
                args: [nftId],
            }),
            publicClient.readContract({
                address: nftManagerAddress as `0x${string}`,
                abi: NONFUNGIBLE_POSITION_MANAGER_ABI,
                functionName: "ownerOf",
                args: [nftId],
            })
        ]);

        const liquidity = positionData[7].toString(); // liquidity is at index 7
        const normalizedOwner = normalizeAddress(owner as string);

        const position = await this.prisma.position.update({
            where: {
                userId_chain_protocol_nftId: {
                    userId: positionId.userId,
                    chain: positionId.chain,
                    protocol: positionId.protocol,
                    nftId: positionId.nftId,
                },
            },
            data: {
                liquidity,
                owner: normalizedOwner,
                updatedAt: new Date(),
            },
            include: {
                pool: {
                    include: {
                        token0: true,
                        token1: true,
                    },
                },
            },
        });

        return this.mapToBasicPosition(position);
    }

    /**
     * Touch a position to update its updatedAt timestamp
     */
    async touchPosition(positionId: PositionId): Promise<void> {
        await this.prisma.position.update({
            where: {
                userId_chain_protocol_nftId: {
                    userId: positionId.userId,
                    chain: positionId.chain,
                    protocol: positionId.protocol,
                    nftId: positionId.nftId,
                },
            },
            data: {
                updatedAt: new Date(),
            },
        });
    }

    /**
     * Delete a position
     */
    async deletePosition(positionId: PositionId): Promise<void> {
        await this.prisma.position.delete({
            where: {
                userId_chain_protocol_nftId: {
                    userId: positionId.userId,
                    chain: positionId.chain,
                    protocol: positionId.protocol,
                    nftId: positionId.nftId,
                },
            },
        });
    }

    /**
     * Count positions with optional filtering
     */
    async countPositions(
        options: Pick<PositionListOptions, "userId" | "chain" | "status"> = {}
    ): Promise<number> {
        const { userId, chain, status } = options;

        const whereClause: any = {};

        if (status) {
            whereClause.status = status;
        }

        if (userId) {
            whereClause.userId = userId;
        }

        if (chain) {
            whereClause.chain = chain;
        }

        return await this.prisma.position.count({
            where: whereClause,
        });
    }


    /**
     * Get a single position by user ID, chain, and NFT ID
     */
    async getPositionByUserChainAndNft(
        userId: string,
        chain: SupportedChainsType,
        nftId: string
    ): Promise<BasicPosition | null> {
        const position = await this.prisma.position.findFirst({
            where: {
                userId,
                nftId,
                chain,
            },
            include: {
                pool: {
                    include: {
                        token0: true,
                        token1: true,
                    },
                },
            },
        });

        if (!position) {
            return null;
        }

        return this.mapToBasicPosition(position);
    }

    /**
     * Check if position exists
     */
    async positionExists(positionId: PositionId): Promise<boolean> {
        const position = await this.prisma.position.findUnique({
            where: {
                userId_chain_protocol_nftId: {
                    userId: positionId.userId,
                    chain: positionId.chain,
                    protocol: positionId.protocol,
                    nftId: positionId.nftId,
                },
            },
            select: { chain: true },
        });

        return position !== null;
    }

    /**
     * Map database result to BasicPosition interface
     */
    private mapToBasicPosition(position: any): BasicPosition {
        return {
            userId: position.userId,
            chain: position.chain,
            protocol: position.protocol,
            nftId: position.nftId,
            liquidity: position.liquidity,
            tickLower: position.tickLower,
            tickUpper: position.tickUpper,
            token0IsQuote: position.token0IsQuote,
            owner: position.owner,
            importType: position.importType,
            status: position.status,
            pool: {
                chain: position.pool.chain,
                poolAddress: position.pool.poolAddress,
                protocol: position.pool.protocol,
                fee: position.pool.fee,
                tickSpacing: position.pool.tickSpacing,
                token0: {
                    address: position.pool.token0.address,
                    symbol: position.pool.token0.symbol,
                    name: position.pool.token0.name,
                    decimals: position.pool.token0.decimals,
                    logoUrl: position.pool.token0.logoUrl,
                },
                token1: {
                    address: position.pool.token1.address,
                    symbol: position.pool.token1.symbol,
                    name: position.pool.token1.name,
                    decimals: position.pool.token1.decimals,
                    logoUrl: position.pool.token1.logoUrl,
                },
                currentTick: position.pool.currentTick,
                currentPrice: position.pool.currentPrice,
            },
            createdAt: position.createdAt,
            updatedAt: position.updatedAt,
        };
    }

    /**
     * Get pool address from Uniswap V3 Factory contract (used for position import)
     */
    async getPoolAddress(
        chain: string,
        token0: string,
        token1: string,
        fee: number
    ): Promise<string> {
        const publicClient = this.rpcClients.get(chain as SupportedChainsType);
        if (!publicClient) {
            throw new Error(`No RPC client available for chain: ${chain}`);
        }

        const factoryAddress = UNISWAP_V3_FACTORY_ADDRESSES[chain];
        if (!factoryAddress) {
            throw new Error(`Uniswap V3 Factory not deployed on chain: ${chain}`);
        }

        // Normalize and sort token addresses (Uniswap V3 requires token0 < token1)
        const normalizedToken0 = normalizeAddress(token0);
        const normalizedToken1 = normalizeAddress(token1);

        // Sort tokens to ensure token0 < token1
        const [sortedToken0, sortedToken1] = compareAddresses(normalizedToken0, normalizedToken1) < 0
            ? [normalizedToken0, normalizedToken1]
            : [normalizedToken1, normalizedToken0];

        try {
            const poolAddress = await publicClient.readContract({
                address: factoryAddress,
                abi: UNISWAP_V3_FACTORY_ABI,
                functionName: "getPool",
                args: [sortedToken0 as `0x${string}`, sortedToken1 as `0x${string}`, fee],
            });

            if (!poolAddress || poolAddress === "0x0000000000000000000000000000000000000000") {
                throw new Error(`Pool does not exist for tokens ${sortedToken0}/${sortedToken1} with fee ${fee}`);
            }

            return normalizeAddress(poolAddress);
        } catch (error) {
            throw new Error(`Failed to get pool address: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }

    /**
     * Cleanup database connections
     */
    async disconnect(): Promise<void> {
        // Prisma client cleanup is handled globally
    }
}
