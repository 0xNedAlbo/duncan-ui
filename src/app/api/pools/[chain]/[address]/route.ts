/**
 * Pool Lookup API
 *
 * Loads a specific Uniswap V3 pool by chain and address
 * GET /api/pools/{chain}/{address}
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuthAndLogging } from "@/lib/api/withAuth";
import { getApiServiceFactory } from "@/lib/api/ApiServiceFactory";
import { isValidAddress } from "@/lib/utils/evm";
import { getChainConfig, type SupportedChainsType } from "@/config/chains";

// Request validation schema
const PoolLookupParamsSchema = z.object({
    chain: z.string().min(1, "Chain is required"),
    address: z.string().min(1, "Pool address is required"),
});

interface PoolLookupErrorResponse {
    success: false;
    error: string;
    details?: any;
}

interface PoolLookupSuccessResponse {
    success: true;
    pool: {
        chain: string;
        poolAddress: string;
        protocol: string;
        fee: number;
        tickSpacing: number;
        currentTick: number | null;
        currentPrice: string;
        sqrtPriceX96: string;
        feeGrowthGlobal0X128: string;
        feeGrowthGlobal1X128: string;
        token0: {
            address: string;
            symbol: string;
            name: string;
            decimals: number;
            verified: boolean;
            logoUrl: string | null;
        };
        token1: {
            address: string;
            symbol: string;
            name: string;
            decimals: number;
            verified: boolean;
            logoUrl: string | null;
        };
        createdAt: string;
        updatedAt: string;
    };
}

type PoolLookupResponse = PoolLookupErrorResponse | PoolLookupSuccessResponse;

export const GET = withAuthAndLogging<PoolLookupResponse>(
    async (request: NextRequest, { user, log }, params?: { chain: string; address: string }) => {
        // Parse URL parameters
        const rawParams = {
            chain: params?.chain,
            address: params?.address,
        };

        const validation = PoolLookupParamsSchema.safeParse(rawParams);
        if (!validation.success) {
            log.warn(
                { userId: user.userId, validationErrors: validation.error.errors },
                "Pool lookup validation failed"
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

        const { chain, address } = validation.data;

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

        // Check if chain is in supported chains list
        const supportedChains = ['ethereum', 'arbitrum', 'base'];
        if (!supportedChains.includes(chain)) {
            log.warn(
                { userId: user.userId, chain },
                "Chain not supported for pools"
            );
            return NextResponse.json(
                {
                    success: false,
                    error: `Chain not supported for pool operations: ${chain}`,
                },
                { status: 400 }
            );
        }

        // Validate pool address
        if (!isValidAddress(address)) {
            log.warn(
                { userId: user.userId, address },
                "Invalid pool address"
            );
            return NextResponse.json(
                {
                    success: false,
                    error: `Invalid pool address: ${address}`,
                },
                { status: 400 }
            );
        }

        try {
            const { poolService } = getApiServiceFactory().getServices();

            log.debug(
                { userId: user.userId, chain, address },
                "Loading pool data"
            );

            // Load pool using existing service method
            const pool = await poolService.createPool(chain, address);

            log.info(
                {
                    userId: user.userId,
                    chain,
                    poolAddress: address,
                    fee: pool.fee,
                    protocol: pool.protocol
                },
                "Pool loaded successfully"
            );

            // Format response
            return NextResponse.json({
                success: true,
                pool: {
                    chain: pool.chain,
                    poolAddress: pool.poolAddress,
                    protocol: pool.protocol,
                    fee: pool.fee,
                    tickSpacing: pool.tickSpacing,
                    currentTick: pool.currentTick,
                    currentPrice: pool.currentPrice,
                    sqrtPriceX96: pool.sqrtPriceX96,
                    feeGrowthGlobal0X128: pool.feeGrowthGlobal0X128,
                    feeGrowthGlobal1X128: pool.feeGrowthGlobal1X128,
                    token0: {
                        address: pool.token0.address,
                        symbol: pool.token0.symbol,
                        name: pool.token0.name || pool.token0.symbol,
                        decimals: pool.token0.decimals,
                        verified: pool.token0.verified,
                        logoUrl: pool.token0.logoUrl,
                    },
                    token1: {
                        address: pool.token1.address,
                        symbol: pool.token1.symbol,
                        name: pool.token1.name || pool.token1.symbol,
                        decimals: pool.token1.decimals,
                        verified: pool.token1.verified,
                        logoUrl: pool.token1.logoUrl,
                    },
                    createdAt: pool.createdAt.toISOString(),
                    updatedAt: pool.updatedAt.toISOString(),
                },
            });

        } catch (error) {
            log.error(
                {
                    userId: user.userId,
                    chain,
                    address,
                    error: error instanceof Error ? error.message : String(error)
                },
                "Pool loading failed"
            );

            return NextResponse.json(
                {
                    success: false,
                    error: "Failed to load pool",
                    details: error instanceof Error ? error.message : String(error),
                },
                { status: 500 }
            );
        }
    }
);