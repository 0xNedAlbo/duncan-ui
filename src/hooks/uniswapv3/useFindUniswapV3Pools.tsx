import { useState, useEffect } from "react";
import { useConfig } from "wagmi";
import { Erc20Token } from "@/utils/erc20Token";
import {
    UniswapV3Pool,
    findPoolsByTokenPair,
} from "@/utils/uniswapV3/uniswapV3Pool";

export interface UseFindUniswapV3PoolsParams {
    chainId?: number;
    quoteToken?: Erc20Token;
    baseToken?: Erc20Token;
    enabled?: boolean; // Allow manual control of when to fetch
}

export interface UseFindUniswapV3PoolsResult {
    pools: UniswapV3Pool[];
    isLoading: boolean;
    error: string | null;
    refetch: () => void;
}

/**
 * Hook to find Uniswap V3 pools for a given token pair
 * @param params Configuration for pool search
 * @returns Pool data, loading state, error state, and refetch function
 */
export function useFindUniswapV3Pools({
    chainId,
    quoteToken,
    baseToken,
    enabled = true,
}: UseFindUniswapV3PoolsParams): UseFindUniswapV3PoolsResult {
    const config = useConfig();
    const [pools, setPools] = useState<UniswapV3Pool[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const shouldFetch =
        enabled &&
        chainId !== undefined &&
        quoteToken !== undefined &&
        baseToken !== undefined;

    const fetchPools = async () => {
        if (!shouldFetch) return;

        setIsLoading(true);
        setError(null);
        setPools([]);

        try {
            const foundPools = await findPoolsByTokenPair(
                config,
                chainId!,
                baseToken!,
                quoteToken!
            );
            setPools(foundPools);
        } catch (err) {
            const errorMessage =
                err instanceof Error ? err.message : "Failed to find pools";
            setError(errorMessage);
            console.error("Error finding Uniswap V3 pools:", err);
        } finally {
            setIsLoading(false);
        }
    };

    // Effect to trigger pool search when dependencies change
    useEffect(() => {
        fetchPools();
    }, [chainId, quoteToken?.address, baseToken?.address, enabled]);

    // Reset state when dependencies become undefined
    useEffect(() => {
        if (!shouldFetch) {
            setPools([]);
            setError(null);
            setIsLoading(false);
        }
    }, [shouldFetch]);

    return {
        pools,
        isLoading,
        error,
        refetch: fetchPools,
    };
}
