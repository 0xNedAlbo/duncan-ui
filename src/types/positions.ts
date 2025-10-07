/**
 * Position Type Definitions
 *
 * Shared types for Uniswap V3 positions across the application.
 * These types are used by services, API routes, and frontend components.
 */

import { SupportedChainsType } from "@/config/chains";

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

// Position discovery types
export interface DiscoveredPositionSummary {
    nftId: string;
    poolAddress: string;
    token0Symbol: string;
    token1Symbol: string;
    fee: number;
    tickLower: number;
    tickUpper: number;
    liquidity: string;
    status: "active" | "closed";
}

// Position event types
export interface PositionEvent {
    id: string;
    eventType: 'CREATE' | 'INCREASE' | 'DECREASE' | 'COLLECT' | 'CLOSE';
    timestamp: string; // ISO string
    blockNumber: number;
    transactionHash: string;
    liquidityDelta: string; // BigInt as string
    token0Delta: string; // BigInt as string
    token1Delta: string; // BigInt as string
    collectedFee0?: string; // BigInt as string, COLLECT events only
    collectedFee1?: string; // BigInt as string, COLLECT events only
    poolPrice: string; // BigInt as string
    valueInQuote: string; // BigInt as string
    feeValueInQuote?: string; // BigInt as string, COLLECT events only
    source: 'subgraph' | 'onchain' | 'manual';
    confidence: 'exact' | 'estimated';
    createdAt: string; // ISO string
}
