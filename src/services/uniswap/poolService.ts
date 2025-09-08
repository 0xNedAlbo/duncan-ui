import { PrismaClient, Pool } from "@prisma/client";
import { createPublicClient, http } from "viem";
import { mainnet, arbitrum, base } from "viem/chains";
import { TokenResolutionService } from "../tokens/tokenResolutionService";
import {
    TokenReferenceService,
    TokenReferenceWithToken,
    UnifiedTokenData,
} from "../tokens/tokenReferenceService";
import {
    UNISWAP_V3_FACTORY_ADDRESSES,
    UNISWAP_V3_FACTORY_ABI,
    getTickSpacing,
    isValidFeeTier,
} from "@/lib/contracts/uniswapV3Factory";
import {
    UNISWAP_V3_POOL_ABI,
    PoolState,
    sortTokens,
} from "@/lib/contracts/uniswapV3Pool";
import { sqrtRatioX96ToToken1PerToken0 } from "@/lib/utils/uniswap-v3/price";
import { normalizeAddress } from "@/lib/contracts/erc20";
import JSBI from "jsbi";

// Chain configuration for viem clients
const CHAIN_CONFIG = {
    ethereum: { chain: mainnet },
    arbitrum: { chain: arbitrum },
    base: { chain: base },
};

export interface PoolSearchOptions {
    chain?: string;
    token0?: string;
    token1?: string;
    userId?: string;
    includeUserPools?: boolean;
}

export interface PoolWithTokenReferences extends Pool {
    token0Ref: TokenReferenceWithToken;
    token1Ref: TokenReferenceWithToken;
}

export interface PoolWithTokens extends Pool {
    token0Data: UnifiedTokenData;
    token1Data: UnifiedTokenData;
}

export class PoolService {
    private prisma: PrismaClient;
    private tokenResolver: TokenResolutionService;
    private tokenRefService: TokenReferenceService;

    constructor(prisma?: PrismaClient) {
        this.prisma = prisma || new PrismaClient();
        this.tokenResolver = new TokenResolutionService(this.prisma);
        this.tokenRefService = new TokenReferenceService(this.prisma);
    }

    /**
     * Find or create a pool using the TokenReference system
     */
    async findOrCreatePool(
        chain: string,
        token0Address: string,
        token1Address: string,
        fee: number,
        userId: string
    ): Promise<PoolWithTokens> {
        // Validate inputs
        if (!isValidFeeTier(fee)) {
            throw new Error(`Invalid fee tier: ${fee}`);
        }

        // Normalize and sort token addresses
        const [sortedToken0, sortedToken1] = sortTokens(
            normalizeAddress(token0Address),
            normalizeAddress(token1Address)
        );

        // Get or create token references
        const [token0Ref, token1Ref] = await Promise.all([
            this.tokenRefService.findOrCreateReference(
                chain,
                sortedToken0,
                userId
            ),
            this.tokenRefService.findOrCreateReference(
                chain,
                sortedToken1,
                userId
            ),
        ]);

        // Check if pool already exists
        const existingPool = await this.prisma.pool.findUnique({
            where: {
                chain_token0Address_token1Address_fee: {
                    chain,
                    token0Address: sortedToken0,
                    token1Address: sortedToken1,
                    fee,
                },
            },
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
        });

        if (existingPool) {
            // Update pool state to ensure current price data
            await this.updatePoolState(existingPool.id);
            
            // Fetch updated pool with current state
            const updatedPool = await this.prisma.pool.findUnique({
                where: { id: existingPool.id },
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
            });
            
            if (!updatedPool) {
                throw new Error(`Pool ${existingPool.id} not found after update`);
            }
            
            return {
                ...updatedPool,
                token0Data: this.tokenRefService.getUnifiedTokenData(
                    updatedPool.token0Ref
                ),
                token1Data: this.tokenRefService.getUnifiedTokenData(
                    updatedPool.token1Ref
                ),
            };
        }

        // Compute pool address from factory
        const poolAddress = await this.computePoolAddress(
            chain,
            sortedToken0,
            sortedToken1,
            fee
        );

        // Verify pool exists on-chain
        const poolExists = await this.verifyPoolExists(chain, poolAddress);
        if (!poolExists) {
            const token0Data =
                this.tokenRefService.getUnifiedTokenData(token0Ref);
            const token1Data =
                this.tokenRefService.getUnifiedTokenData(token1Ref);
            throw new Error(
                `Pool does not exist on-chain for ${token0Data.symbol}/${
                    token1Data.symbol
                } with ${fee / 100}% fee`
            );
        }

        // Determine pool owner (if any user tokens are involved)
        const poolOwnerId =
            this.tokenRefService.isUserReference(token0Ref) ||
            this.tokenRefService.isUserReference(token1Ref)
                ? userId
                : null;

        // Create pool in database
        const pool = await this.prisma.pool.create({
            data: {
                chain,
                poolAddress,
                token0RefId: token0Ref.id,
                token1RefId: token1Ref.id,
                token0Address: sortedToken0,
                token1Address: sortedToken1,
                fee,
                tickSpacing: getTickSpacing(fee),
                ownerId: poolOwnerId,
            },
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
        });

        // Fetch initial pool state
        await this.updatePoolState(pool.id);

        return {
            ...pool,
            token0Data: this.tokenRefService.getUnifiedTokenData(
                pool.token0Ref
            ),
            token1Data: this.tokenRefService.getUnifiedTokenData(
                pool.token1Ref
            ),
        };
    }

    /**
     * Get pool by ID with resolved token references
     */
    async getPoolById(poolId: string): Promise<PoolWithTokens | null> {
        const pool = await this.prisma.pool.findUnique({
            where: { id: poolId },
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
        });

        if (!pool) {
            return null;
        }

        return {
            ...pool,
            token0Data: this.tokenRefService.getUnifiedTokenData(
                pool.token0Ref
            ),
            token1Data: this.tokenRefService.getUnifiedTokenData(
                pool.token1Ref
            ),
        };
    }

    /**
     * Search pools by token pair
     */
    async getPoolsForTokenPair(
        chain: string,
        token0Address: string,
        token1Address: string
    ): Promise<PoolWithTokens[]> {
        const [sortedToken0, sortedToken1] = sortTokens(
            normalizeAddress(token0Address),
            normalizeAddress(token1Address)
        );

        const pools = await this.prisma.pool.findMany({
            where: {
                chain,
                token0Address: sortedToken0,
                token1Address: sortedToken1,
            },
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
            orderBy: [{ fee: "asc" }],
        });

        return pools.map((pool) => ({
            ...pool,
            token0Data: this.tokenRefService.getUnifiedTokenData(
                pool.token0Ref
            ),
            token1Data: this.tokenRefService.getUnifiedTokenData(
                pool.token1Ref
            ),
        }));
    }

    /**
     * Search pools with various filters
     */
    async searchPools(
        options: PoolSearchOptions = {}
    ): Promise<PoolWithTokens[]> {
        const {
            chain,
            token0,
            token1,
            userId,
            includeUserPools = false,
        } = options;

        const where: any = {};

        if (chain) {
            where.chain = chain;
        }

        if (token0 || token1) {
            const token0Normalized = token0 ? normalizeAddress(token0) : null;
            const token1Normalized = token1 ? normalizeAddress(token1) : null;

            if (token0Normalized && token1Normalized) {
                const [sortedToken0, sortedToken1] = sortTokens(
                    token0Normalized,
                    token1Normalized
                );
                where.token0Address = sortedToken0;
                where.token1Address = sortedToken1;
            } else if (token0Normalized || token1Normalized) {
                const tokenAddress = token0Normalized || token1Normalized;
                where.OR = [
                    { token0Address: tokenAddress },
                    { token1Address: tokenAddress },
                ];
            }
        }

        if (!includeUserPools) {
            where.ownerId = null; // Only global pools
        } else if (userId) {
            where.OR = [
                { ownerId: null }, // Global pools
                { ownerId: userId }, // User's pools
            ];
        }

        const pools = await this.prisma.pool.findMany({
            where,
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
            orderBy: [{ tvl: "desc" }, { fee: "asc" }],
            take: 50, // Limit results
        });

        return pools.map((pool) => ({
            ...pool,
            token0Data: this.tokenRefService.getUnifiedTokenData(
                pool.token0Ref
            ),
            token1Data: this.tokenRefService.getUnifiedTokenData(
                pool.token1Ref
            ),
        }));
    }

    /**
     * Update pool state from blockchain
     */
    async updatePoolState(poolId: string): Promise<void> {
        const pool = await this.prisma.pool.findUnique({
            where: { id: poolId },
        });

        if (!pool) {
            throw new Error("Pool not found");
        }

        try {
            const poolState = await this.fetchPoolState(
                pool.chain,
                pool.poolAddress
            );

            // Get token decimals for price calculation
            // Use pool owner for context, or skip resolution for custom tokens without owner
            const resolveUserId = pool.ownerId || "";
            const [token0Info] = await Promise.all([
                this.tokenResolver.resolveToken(
                    pool.chain,
                    pool.token0Address,
                    resolveUserId
                ),
                this.tokenResolver.resolveToken(
                    pool.chain,
                    pool.token1Address,
                    resolveUserId
                ),
            ]);

            // Calculate token0 price in token1 units (e.g., WETH price in USDC)
            // sqrtRatioX96 represents sqrt(token1/token0) * 2^96
            // We want price of token0 in token1 units, so we use sqrtRatioX96ToToken1PerToken0
            const currentPrice = sqrtRatioX96ToToken1PerToken0(
                JSBI.BigInt(poolState.sqrtPriceX96.toString()),
                token0Info.decimals
            );

            await this.prisma.pool.update({
                where: { id: poolId },
                data: {
                    currentTick: poolState.tick,
                    currentPrice: currentPrice.toString(),
                    sqrtPriceX96: poolState.sqrtPriceX96.toString(),
                    updatedAt: new Date(),
                },
            });
        } catch (error) {
            console.error(
                `Failed to update pool state for pool ${poolId}:`,
                error
            );
            throw error;
        }
    }

    /**
     * Compute pool address from Uniswap V3 factory
     */
    private async computePoolAddress(
        chain: string,
        token0: string,
        token1: string,
        fee: number
    ): Promise<string> {
        const factoryAddress = UNISWAP_V3_FACTORY_ADDRESSES[chain];
        if (!factoryAddress) {
            throw new Error(`Factory not deployed on chain: ${chain}`);
        }

        const chainConfig = CHAIN_CONFIG[chain as keyof typeof CHAIN_CONFIG];
        if (!chainConfig) {
            throw new Error(`Unsupported chain: ${chain}`);
        }

        const publicClient = createPublicClient({
            chain: chainConfig.chain,
            transport: http(),
        });

        try {
            const poolAddress = (await publicClient.readContract({
                address: factoryAddress,
                abi: UNISWAP_V3_FACTORY_ABI,
                functionName: "getPool",
                args: [token0 as `0x${string}`, token1 as `0x${string}`, fee],
            })) as string;

            return normalizeAddress(poolAddress);
        } catch (error) {
            console.error(`Failed to compute pool address:`, error);
            throw new Error(`Failed to compute pool address: ${error}`);
        }
    }

    /**
     * Verify pool exists on-chain
     */
    private async verifyPoolExists(
        chain: string,
        poolAddress: string
    ): Promise<boolean> {
        const chainConfig = CHAIN_CONFIG[chain as keyof typeof CHAIN_CONFIG];
        if (!chainConfig) {
            return false;
        }

        const publicClient = createPublicClient({
            chain: chainConfig.chain,
            transport: http(),
        });

        try {
            // Try to fetch token0 - if this succeeds, pool exists
            await publicClient.readContract({
                address: poolAddress as `0x${string}`,
                abi: UNISWAP_V3_POOL_ABI,
                functionName: "token0",
            });
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Fetch current pool state from blockchain
     */
    private async fetchPoolState(
        chain: string,
        poolAddress: string
    ): Promise<PoolState> {
        const chainConfig = CHAIN_CONFIG[chain as keyof typeof CHAIN_CONFIG];
        if (!chainConfig) {
            throw new Error(`Unsupported chain: ${chain}`);
        }

        const publicClient = createPublicClient({
            chain: chainConfig.chain,
            transport: http(),
        });

        try {
            const [slot0, liquidity, token0, token1, fee, tickSpacing] =
                (await Promise.all([
                    publicClient.readContract({
                        address: poolAddress as `0x${string}`,
                        abi: UNISWAP_V3_POOL_ABI,
                        functionName: "slot0",
                    }),
                    publicClient.readContract({
                        address: poolAddress as `0x${string}`,
                        abi: UNISWAP_V3_POOL_ABI,
                        functionName: "liquidity",
                    }),
                    publicClient.readContract({
                        address: poolAddress as `0x${string}`,
                        abi: UNISWAP_V3_POOL_ABI,
                        functionName: "token0",
                    }),
                    publicClient.readContract({
                        address: poolAddress as `0x${string}`,
                        abi: UNISWAP_V3_POOL_ABI,
                        functionName: "token1",
                    }),
                    publicClient.readContract({
                        address: poolAddress as `0x${string}`,
                        abi: UNISWAP_V3_POOL_ABI,
                        functionName: "fee",
                    }),
                    publicClient.readContract({
                        address: poolAddress as `0x${string}`,
                        abi: UNISWAP_V3_POOL_ABI,
                        functionName: "tickSpacing",
                    }),
                ])) as [any, bigint, string, string, number, number];

            return {
                sqrtPriceX96: slot0[0],
                tick: slot0[1],
                liquidity,
                token0: normalizeAddress(token0),
                token1: normalizeAddress(token1),
                fee,
                tickSpacing,
            };
        } catch (error) {
            console.error(`Failed to fetch pool state:`, error);
            throw new Error(`Failed to fetch pool state: ${error}`);
        }
    }

    /**
     * Close database connection (for cleanup in tests)
     */
    async disconnect(): Promise<void> {
        await this.tokenResolver.disconnect();
        await this.tokenRefService.disconnect();
        await this.prisma.$disconnect();
    }
}
