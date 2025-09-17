/**
 * Position Service - Clean Rewrite
 *
 * Focused on essential database operations for Uniswap V3 positions.
 * PnL calculations and complex analytics are handled by separate services.
 */

import { SupportedChainsType } from "@/config/chains";
import { PrismaClient } from "@prisma/client";

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
    id: string;
    chain: string;
    poolAddress: string;
    fee: number;
    tickSpacing: number;
    token0: TokenData;
    token1: TokenData;
    currentTick?: number;
    currentPrice?: string;
}

// Basic position interface (no PnL data)
export interface BasicPosition {
    id: string;
    chain: string;
    nftId?: string;
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
    id?: string;
    userId: string;
    poolId: string;
    tickLower: number;
    tickUpper: number;
    liquidity: string;
    token0IsQuote: boolean;
    owner?: string;
    importType: "manual" | "wallet" | "nft";
    nftId?: string;
    status?: string;
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
    constructor(prisma: PrismaClient) {
        this.prisma = prisma;
    }

    /**
     * Get a single position by ID
     */
    async getPosition(positionId: string): Promise<BasicPosition | null> {
        const position = await this.prisma.position.findUnique({
            where: { id: positionId },
            include: {
                pool: {
                    include: {
                        token0Ref: {
                            include: {
                                globalToken: true,
                                userToken: true,
                            },
                        },
                        token1Ref: {
                            include: {
                                globalToken: true,
                                userToken: true,
                            },
                        },
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
            whereClause.pool = {
                chain,
            };
        }

        const positions = await this.prisma.position.findMany({
            where: whereClause,
            include: {
                pool: {
                    include: {
                        token0Ref: {
                            include: {
                                globalToken: true,
                                userToken: true,
                            },
                        },
                        token1Ref: {
                            include: {
                                globalToken: true,
                                userToken: true,
                            },
                        },
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
            id: data.id,
            userId: data.userId,
            poolId: data.poolId,
            tickLower: data.tickLower,
            tickUpper: data.tickUpper,
            liquidity: data.liquidity,
            token0IsQuote: data.token0IsQuote,
            owner: data.owner,
            importType: data.importType,
            nftId: data.nftId,
            status: data.status || "active",
        };

        const position = await this.prisma.position.create({
            data: positionData,
            include: {
                pool: {
                    include: {
                        token0Ref: {
                            include: {
                                globalToken: true,
                                userToken: true,
                            },
                        },
                        token1Ref: {
                            include: {
                                globalToken: true,
                                userToken: true,
                            },
                        },
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
        positionId: string,
        data: UpdatePositionData
    ): Promise<BasicPosition> {
        const position = await this.prisma.position.update({
            where: { id: positionId },
            data,
            include: {
                pool: {
                    include: {
                        token0Ref: {
                            include: {
                                globalToken: true,
                                userToken: true,
                            },
                        },
                        token1Ref: {
                            include: {
                                globalToken: true,
                                userToken: true,
                            },
                        },
                    },
                },
            },
        });

        return this.mapToBasicPosition(position);
    }

    /**
     * Delete a position
     */
    async deletePosition(positionId: string): Promise<void> {
        await this.prisma.position.delete({
            where: { id: positionId },
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
            whereClause.pool = {
                chain,
            };
        }

        return await this.prisma.position.count({
            where: whereClause,
        });
    }

    /**
     * Get positions by NFT ID
     */
    async getPositionsByNftId(
        nftId: string,
        chain?: SupportedChainsType,
        status?: string
    ): Promise<BasicPosition[]> {
        const whereClause: any = {
            nftId,
        };

        if (status) {
            whereClause.status = status;
        }

        if (chain) {
            whereClause.pool = {
                chain,
            };
        }

        const positions = await this.prisma.position.findMany({
            where: whereClause,
            include: {
                pool: {
                    include: {
                        token0Ref: {
                            include: {
                                globalToken: true,
                                userToken: true,
                            },
                        },
                        token1Ref: {
                            include: {
                                globalToken: true,
                                userToken: true,
                            },
                        },
                    },
                },
            },
        });

        return positions.map((position) => this.mapToBasicPosition(position));
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
                pool: {
                    chain,
                },
            },
            include: {
                pool: {
                    include: {
                        token0Ref: {
                            include: {
                                globalToken: true,
                                userToken: true,
                            },
                        },
                        token1Ref: {
                            include: {
                                globalToken: true,
                                userToken: true,
                            },
                        },
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
    async positionExists(positionId: string): Promise<boolean> {
        const position = await this.prisma.position.findUnique({
            where: { id: positionId },
            select: { id: true },
        });

        return position !== null;
    }

    /**
     * Map database result to BasicPosition interface
     */
    private mapToBasicPosition(position: any): BasicPosition {
        // Extract token data from polymorphic references
        const token0Data = this.extractTokenData(position.pool.token0Ref);
        const token1Data = this.extractTokenData(position.pool.token1Ref);

        return {
            id: position.id,
            chain: position.pool.chain,
            nftId: position.nftId,
            liquidity: position.liquidity,
            tickLower: position.tickLower,
            tickUpper: position.tickUpper,
            token0IsQuote: position.token0IsQuote,
            owner: position.owner,
            importType: position.importType,
            status: position.status,
            pool: {
                id: position.pool.id,
                chain: position.pool.chain,
                poolAddress: position.pool.poolAddress,
                fee: position.pool.fee,
                tickSpacing: position.pool.tickSpacing,
                token0: token0Data,
                token1: token1Data,
                currentTick: position.pool.currentTick,
                currentPrice: position.pool.currentPrice,
            },
            createdAt: position.createdAt,
            updatedAt: position.updatedAt,
        };
    }

    /**
     * Extract token data from polymorphic token reference
     */
    private extractTokenData(tokenRef: any): TokenData {
        const token = tokenRef.globalToken || tokenRef.userToken;

        if (!token) {
            throw new Error("Token data not found in reference");
        }

        return {
            address: token.address,
            symbol: token.symbol,
            name: token.name,
            decimals: token.decimals,
            logoUrl: token.logoUrl,
        };
    }

    /**
     * Cleanup database connections
     */
    async disconnect(): Promise<void> {
        // Prisma client cleanup is handled globally
    }
}
