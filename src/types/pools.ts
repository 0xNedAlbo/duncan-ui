/**
 * Pool Type Definitions
 *
 * Types for Uniswap V3 pool data and operations.
 */

import type { Pool, Token } from "@prisma/client";

/**
 * Pool with populated token data
 * Extends Prisma Pool model with token information
 */
export interface PoolWithTokens extends Pool {
    token0: Token;
    token1: Token;
}

/**
 * Pool fee tier data
 */
export interface PoolFeeTier {
    fee: number;
    tickSpacing: number;
    exists: boolean;
}

/**
 * Pool discovery result
 */
export interface PoolDiscoveryResult {
    chain: string;
    token0Address: string;
    token1Address: string;
    pools: PoolFeeTier[];
}
