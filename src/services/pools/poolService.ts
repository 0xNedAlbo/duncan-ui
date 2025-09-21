import { PrismaClient, Pool, Token } from "@prisma/client";
import { type PublicClient } from "viem";
import { TokenService } from "../tokens/tokenService";
import type { Services } from "../ServiceFactory";
import type { Clients } from "../ClientsFactory";
import { UNISWAP_V3_POOL_ABI, PoolState } from "@/lib/contracts/uniswapV3Pool";
import { sqrtRatioX96ToToken1PerToken0 } from "@/lib/utils/uniswap-v3/price";
import { normalizeAddress } from "@/lib/utils/evm";
import { type SupportedChainsType } from "@/config/chains";
import JSBI from "jsbi";

export interface PoolWithTokens extends Pool {
    token0: Token;
    token1: Token;
}

export class PoolService {
    private prisma: PrismaClient;
    private tokenService: TokenService;
    private rpcClients: Map<SupportedChainsType, PublicClient>;

    constructor(
        requiredClients: Pick<Clients, "prisma" | "rpcClients">,
        requiredServices: Pick<Services, "tokenService">
    ) {
        this.prisma = requiredClients.prisma;
        this.rpcClients = requiredClients.rpcClients;
        this.tokenService = requiredServices.tokenService;
    }

    /**
     * Create or get pool from known pool address (used when importing from positions)
     */
    async createPool(
        chain: string,
        poolAddress: string
    ): Promise<PoolWithTokens> {
        const normalizedPoolAddress = normalizeAddress(poolAddress);

        // Check if pool already exists
        const existingPool = await this.prisma.pool.findUnique({
            where: {
                chain_poolAddress: {
                    chain,
                    poolAddress: normalizedPoolAddress,
                },
            },
            include: {
                token0: true,
                token1: true,
            },
        });

        if (existingPool) {
            // Update pool state to ensure current price data
            await this.updatePoolState(chain, normalizedPoolAddress);
            return existingPool;
        }

        // Fetch pool data from blockchain to get token addresses and fee
        const poolData = await this.fetchPoolBasicInfo(
            chain,
            normalizedPoolAddress
        );

        // Ensure tokens exist in database
        await Promise.all([
            this.tokenService.findOrCreateToken(chain, poolData.token0),
            this.tokenService.findOrCreateToken(chain, poolData.token1),
        ]);

        // Create pool in database
        const pool = await this.prisma.pool.create({
            data: {
                chain,
                poolAddress: normalizedPoolAddress,
                protocol: "uniswapv3",
                token0Address: poolData.token0,
                token1Address: poolData.token1,
                fee: poolData.fee,
                tickSpacing: poolData.tickSpacing,
            },
            include: {
                token0: true,
                token1: true,
            },
        });

        // Fetch initial pool state
        await this.updatePoolState(chain, normalizedPoolAddress);

        return pool;
    }

    /**
     * Get pool by chain and address
     */
    async getPool(
        chain: string,
        poolAddress: string
    ): Promise<PoolWithTokens | null> {
        const pool = await this.prisma.pool.findUnique({
            where: {
                chain_poolAddress: {
                    chain,
                    poolAddress,
                },
            },
            include: {
                token0: true,
                token1: true,
            },
        });

        return pool;
    }

    /**
     * Update pool state from blockchain
     */
    async updatePoolState(chain: string, poolAddress: string): Promise<void> {
        const pool = await this.prisma.pool.findUnique({
            where: {
                chain_poolAddress: {
                    chain,
                    poolAddress,
                },
            },
            include: {
                token0: true,
                token1: true,
            },
        });

        if (!pool) {
            throw new Error("Pool not found");
        }

        try {
            const poolState = await this.fetchPoolState(chain, poolAddress);

            // Calculate token0 price in token1 units (e.g., WETH price in USDC)
            // sqrtRatioX96 represents sqrt(token1/token0) * 2^96
            // We want price of token0 in token1 units, so we use sqrtRatioX96ToToken1PerToken0
            const currentPrice = sqrtRatioX96ToToken1PerToken0(
                JSBI.BigInt(poolState.sqrtPriceX96.toString()),
                pool.token0.decimals
            );

            await this.prisma.pool.update({
                where: {
                    chain_poolAddress: {
                        chain,
                        poolAddress,
                    },
                },
                data: {
                    currentTick: poolState.tick,
                    currentPrice: currentPrice.toString(),
                    sqrtPriceX96: poolState.sqrtPriceX96.toString(),
                    feeGrowthGlobal0X128: poolState.feeGrowthGlobal0X128.toString(),
                    feeGrowthGlobal1X128: poolState.feeGrowthGlobal1X128.toString(),
                    updatedAt: new Date(),
                },
            });
        } catch (error) {
            // Pool state update failed
            throw error;
        }
    }

    /**
     * Fetch basic pool info from blockchain (immutable data needed for pool creation)
     */
    private async fetchPoolBasicInfo(
        chain: string,
        poolAddress: string
    ): Promise<{
        token0: string;
        token1: string;
        fee: number;
        tickSpacing: number;
    }> {
        const publicClient = this.rpcClients.get(chain as SupportedChainsType);
        if (!publicClient) {
            throw new Error(`No RPC client available for chain: ${chain}`);
        }

        try {
            const [token0, token1, fee, tickSpacing] = (await Promise.all([
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
            ])) as [string, string, number, number];

            return {
                token0: normalizeAddress(token0),
                token1: normalizeAddress(token1),
                fee,
                tickSpacing,
            };
        } catch (error) {
            throw new Error(`Failed to fetch pool basic info: ${error}`);
        }
    }

    /**
     * Fetch current pool state from blockchain
     */
    private async fetchPoolState(
        chain: string,
        poolAddress: string
    ): Promise<PoolState> {
        const publicClient = this.rpcClients.get(chain as SupportedChainsType);
        if (!publicClient) {
            throw new Error(`No RPC client available for chain: ${chain}`);
        }

        try {
            const [slot0, liquidity, feeGrowthGlobal0X128, feeGrowthGlobal1X128] = (await Promise.all([
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
                    functionName: "feeGrowthGlobal0X128",
                }),
                publicClient.readContract({
                    address: poolAddress as `0x${string}`,
                    abi: UNISWAP_V3_POOL_ABI,
                    functionName: "feeGrowthGlobal1X128",
                }),
            ])) as [any, bigint, bigint, bigint];

            return {
                sqrtPriceX96: slot0[0],
                tick: slot0[1],
                liquidity,
                feeGrowthGlobal0X128,
                feeGrowthGlobal1X128,
            };
        } catch (error) {
            // Pool state fetch failed
            throw new Error(`Failed to fetch pool state: ${error}`);
        }
    }


    /**
     * Close database connection (for cleanup in tests)
     */
    async disconnect(): Promise<void> {
        await this.tokenService.disconnect();
        await this.prisma.$disconnect();
    }
}
