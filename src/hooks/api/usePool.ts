/**
 * usePool Hook
 *
 * React Query hook for loading individual Uniswap V3 pools by chain and address
 */

import { useQuery } from "@tanstack/react-query";
import type { SupportedChainsType } from "@/config/chains";

export interface PoolData {
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
}

interface PoolResponse {
    success: boolean;
    pool?: PoolData;
    error?: string;
    details?: string;
}

interface UsePoolProps {
    chain?: SupportedChainsType | null;
    poolAddress?: string;
    enabled: boolean;
}

export function usePool({ chain, poolAddress, enabled }: UsePoolProps) {
    const queryKey = ["pool", chain, poolAddress];

    const queryFn = async (): Promise<PoolData> => {
        if (!chain || !poolAddress) {
            throw new Error("Chain and pool address are required");
        }

        const response = await fetch(`/api/pools/${chain}/${poolAddress}`);

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(
                errorData?.error ||
                    `HTTP ${response.status}: ${response.statusText}`
            );
        }

        const data: PoolResponse = await response.json();

        if (!data.success) {
            throw new Error(data.error || "Pool loading failed");
        }

        if (!data.pool) {
            throw new Error("No pool data returned");
        }

        return data.pool;
    };

    const query = useQuery({
        queryKey,
        queryFn,
        enabled: enabled && !!chain && !!poolAddress,
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
        retry: (failureCount, error) => {
            // Don't retry validation errors (4xx)
            const errorMessage = error?.message || "";
            if (
                errorMessage.includes("Invalid") ||
                errorMessage.includes("400")
            ) {
                return false;
            }
            // Retry network errors up to 2 times
            return failureCount < 2;
        },
    });

    return {
        pool: query.data,
        isLoading: query.isLoading,
        isError: query.isError,
        error: query.error?.message || null,
        refetch: query.refetch,
    };
}
