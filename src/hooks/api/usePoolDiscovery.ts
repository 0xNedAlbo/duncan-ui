/**
 * usePoolDiscovery Hook
 *
 * React Query hook for discovering Uniswap V3 pools for token pairs
 */

import { useQuery } from "@tanstack/react-query";
import type { SupportedChainsType } from "@/config/chains";

export interface PoolDiscoveryResult {
    poolAddress: string;
    fee: number;
    feePercentage: string;
    tickSpacing: number;
    liquidity: string; // BigInt as string
    exists: boolean;
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
}

interface PoolDiscoveryResponse {
    success: boolean;
    pools: PoolDiscoveryResult[];
    tokenPair?: {
        tokenA: string;
        tokenB: string;
        chain: string;
    };
    error?: string;
    details?: string;
}

interface UsePoolDiscoveryProps {
    chain: SupportedChainsType;
    tokenA: string | null;
    tokenB: string | null;
    enabled?: boolean;
}

export function usePoolDiscovery({
    chain,
    tokenA,
    tokenB,
    enabled = true,
}: UsePoolDiscoveryProps) {
    const queryKey = ["pools", "discover", chain, tokenA, tokenB];

    const queryFn = async (): Promise<PoolDiscoveryResult[]> => {
        if (!tokenA || !tokenB) {
            throw new Error("Both token addresses are required");
        }

        const params = new URLSearchParams({
            chain,
            tokenA,
            tokenB,
        });

        const response = await fetch(`/api/pools/discover?${params.toString()}`);

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(
                errorData?.error || `HTTP ${response.status}: ${response.statusText}`
            );
        }

        const data: PoolDiscoveryResponse = await response.json();

        if (!data.success) {
            throw new Error(data.error || "Pool discovery failed");
        }

        return data.pools;
    };

    const query = useQuery({
        queryKey,
        queryFn,
        enabled: enabled && !!tokenA && !!tokenB,
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
        retry: (failureCount, error) => {
            // Don't retry validation errors (4xx)
            const errorMessage = error?.message || "";
            if (errorMessage.includes("Invalid") || errorMessage.includes("400")) {
                return false;
            }
            // Retry network errors up to 2 times
            return failureCount < 2;
        },
    });

    return {
        ...query,
        pools: query.data || [],
        availablePools: query.data ? query.data.filter(pool => pool.exists) : [],
        isLoading: query.isLoading,
        isError: query.isError,
        error: query.error?.message || null,
    };
}

// Helper function to get recommended pool based on liquidity
export function getRecommendedPool(pools: PoolDiscoveryResult[]): PoolDiscoveryResult | null {
    const availablePools = pools.filter(pool => pool.exists);

    if (availablePools.length === 0) {
        return null;
    }

    // Sort by liquidity (highest first) and return the first one
    return availablePools.sort((a, b) => {
        const liquidityA = BigInt(a.liquidity);
        const liquidityB = BigInt(b.liquidity);
        return liquidityA > liquidityB ? -1 : liquidityA < liquidityB ? 1 : 0;
    })[0];
}

// Helper function to format liquidity display
export function formatPoolLiquidity(liquidityString: string): string {
    const liquidity = BigInt(liquidityString);
    const liquidityNum = Number(liquidity) / 1e18; // Assume 18 decimals for display

    if (liquidityNum >= 1e9) return `$${(liquidityNum / 1e9).toFixed(1)}B`;
    if (liquidityNum >= 1e6) return `$${(liquidityNum / 1e6).toFixed(1)}M`;
    if (liquidityNum >= 1e3) return `$${(liquidityNum / 1e3).toFixed(1)}K`;
    return `$${liquidityNum.toFixed(2)}`;
}