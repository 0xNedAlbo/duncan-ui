/**
 * Pool Discovery API
 *
 * Discovers available Uniswap V3 pools for a token pair
 * GET /api/pools/discover?chain={chain}&tokenA={address}&tokenB={address}
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuthAndLogging } from "@/lib/api/withAuth";
import { getApiServiceFactory } from "@/lib/api/ApiServiceFactory";
import { isValidAddress } from "@/lib/utils/evm";
import { getChainConfig, type SupportedChainsType } from "@/config/chains";

// Request validation schema
const PoolDiscoverySchema = z.object({
    chain: z.string().min(1, "Chain is required"),
    tokenA: z.string().min(1, "Token A address is required"),
    tokenB: z.string().min(1, "Token B address is required"),
});

interface PoolDiscoveryErrorResponse {
    success: false;
    error: string;
    details?: any;
}

interface PoolDiscoverySuccessResponse {
    success: true;
    pools: Array<{
        poolAddress: string;
        fee: number;
        feePercentage: string;
        tickSpacing: number;
        liquidity: string;
        exists: boolean;
        // Pool metrics from subgraph (USD values)
        tvlUSD?: string;
        volumeUSD?: string;
        feesUSD?: string;
        pool?: {
            chain: string;
            poolAddress: string;
            protocol: string;
            fee: number;
            tickSpacing: number;
            token0: {
                address: string;
                symbol: string;
                name: string;
                decimals: number;
                logoUrl: string | null;
            };
            token1: {
                address: string;
                symbol: string;
                name: string;
                decimals: number;
                logoUrl: string | null;
            };
        };
    }>;
    tokenPair: {
        tokenA: string;
        tokenB: string;
        chain: string;
    };
}

type PoolDiscoveryResponse = PoolDiscoveryErrorResponse | PoolDiscoverySuccessResponse;

export const GET = withAuthAndLogging<PoolDiscoveryResponse>(
    async (request: NextRequest, { user, log }) => {
        const { searchParams } = new URL(request.url);

        // Parse and validate query parameters
        const rawParams = {
            chain: searchParams.get("chain"),
            tokenA: searchParams.get("tokenA"),
            tokenB: searchParams.get("tokenB"),
        };

        const validation = PoolDiscoverySchema.safeParse(rawParams);
        if (!validation.success) {
            log.warn(
                { userId: user.userId, validationErrors: validation.error.errors },
                "Pool discovery validation failed"
            );
            return NextResponse.json(
                {
                    success: false,
                    error: "Invalid request parameters",
                    details: validation.error.errors,
                },
                { status: 400 }
            );
        }

        const { chain, tokenA, tokenB } = validation.data;

        // Validate chain
        try {
            getChainConfig(chain as SupportedChainsType);
        } catch {
            log.warn(
                { userId: user.userId, chain },
                "Unsupported chain requested"
            );
            return NextResponse.json(
                {
                    success: false,
                    error: `Unsupported chain: ${chain}`,
                },
                { status: 400 }
            );
        }

        // Validate token addresses
        if (!isValidAddress(tokenA)) {
            log.warn(
                { userId: user.userId, tokenA },
                "Invalid token A address"
            );
            return NextResponse.json(
                {
                    success: false,
                    error: `Invalid token A address: ${tokenA}`,
                },
                { status: 400 }
            );
        }

        if (!isValidAddress(tokenB)) {
            log.warn(
                { userId: user.userId, tokenB },
                "Invalid token B address"
            );
            return NextResponse.json(
                {
                    success: false,
                    error: `Invalid token B address: ${tokenB}`,
                },
                { status: 400 }
            );
        }

        // Check for same token addresses
        if (tokenA.toLowerCase() === tokenB.toLowerCase()) {
            log.warn(
                { userId: user.userId, tokenA, tokenB },
                "Same token addresses provided"
            );
            return NextResponse.json(
                {
                    success: false,
                    error: "Token addresses must be different",
                },
                { status: 400 }
            );
        }

        try {
            const { poolDiscoveryService } = getApiServiceFactory().getServices();

            log.debug(
                { userId: user.userId, chain, tokenA, tokenB },
                "Starting pool discovery"
            );

            // Discover pools for the token pair
            const poolResults = await poolDiscoveryService.findPoolsForTokenPair(
                chain as SupportedChainsType,
                { tokenA, tokenB }
            );

            log.info(
                {
                    userId: user.userId,
                    chain,
                    tokenA,
                    tokenB,
                    poolsFound: poolResults.filter((p: any) => p.exists).length
                },
                "Pool discovery completed"
            );

            // Format response
            const formattedPools = poolResults.map((result: any) => ({
                poolAddress: result.poolAddress,
                fee: result.fee,
                feePercentage: result.feePercentage,
                tickSpacing: result.tickSpacing,
                liquidity: result.liquidity,
                exists: result.exists,
                // Subgraph metrics are now included by poolDiscoveryService
                tvlUSD: result.tvlUSD,
                volumeUSD: result.volumeUSD,
                feesUSD: result.feesUSD,
                pool: result.pool ? {
                    chain: result.pool.chain,
                    poolAddress: result.pool.poolAddress,
                    protocol: result.pool.protocol,
                    fee: result.pool.fee,
                    tickSpacing: result.pool.tickSpacing,
                    liquidity: result.liquidity,
                    token0: {
                        address: result.pool.token0.address,
                        symbol: result.pool.token0.symbol,
                        name: result.pool.token0.name || result.pool.token0.symbol,
                        decimals: result.pool.token0.decimals,
                        logoUrl: result.pool.token0.logoUrl,
                    },
                    token1: {
                        address: result.pool.token1.address,
                        symbol: result.pool.token1.symbol,
                        name: result.pool.token1.name || result.pool.token1.symbol,
                        decimals: result.pool.token1.decimals,
                        logoUrl: result.pool.token1.logoUrl,
                    },
                } : undefined,
            }));

            return NextResponse.json({
                success: true,
                pools: formattedPools,
                tokenPair: {
                    tokenA,
                    tokenB,
                    chain,
                },
            });

        } catch (error) {
            log.error(
                {
                    userId: user.userId,
                    chain,
                    tokenA,
                    tokenB,
                    error: error instanceof Error ? error.message : String(error)
                },
                "Pool discovery failed"
            );

            return NextResponse.json(
                {
                    success: false,
                    error: "Failed to discover pools",
                    details: error instanceof Error ? error.message : String(error),
                },
                { status: 500 }
            );
        }
    }
);