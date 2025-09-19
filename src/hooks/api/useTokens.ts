/**
 * Token Management Hooks
 *
 * React Query hooks for token-related API operations
 */

import React from "react";
import {
    useQuery,
    useQueryClient,
    UseQueryOptions,
} from "@tanstack/react-query";
import { apiClient } from "@/lib/app/apiClient";
import { ApiError } from "@/lib/app/apiError";
import type {
    TokenSearchParams,
    TokenSearchResponse,
    TokenBatchRequest,
    TokenBatchResponse,
    TokenDetailsResponse,
    TokenData,
} from "@/types/api";
import { QUERY_KEYS, QUERY_OPTIONS } from "@/types/api";

/**
 * Hook to search for tokens
 */
export function useTokenSearch(
    params: TokenSearchParams,
    options?: Omit<
        UseQueryOptions<TokenSearchResponse, ApiError, TokenData[]>,
        "queryKey" | "queryFn"
    >
) {
    return useQuery({
        queryKey: QUERY_KEYS.tokenSearch(params),
        queryFn: () =>
            apiClient.get<TokenSearchResponse>("/api/tokens/search", {
                params,
            }),

        // Default options
        staleTime: QUERY_OPTIONS.tokenSearch.staleTime,
        gcTime: QUERY_OPTIONS.tokenSearch.cacheTime,

        // Only search if query is long enough
        enabled: params.query.length > 2 && options?.enabled !== false,

        // Transform response to extract token data
        select: (response) => response.data || [],

        ...options,
    });
}

/**
 * Hook to fetch multiple tokens by addresses (batch request)
 */
export function useTokenBatch(
    request: TokenBatchRequest,
    options?: Omit<
        UseQueryOptions<
            TokenBatchResponse,
            ApiError,
            { tokens: TokenData[]; notFound: string[]; foundCount: number }
        >,
        "queryKey" | "queryFn"
    >
) {
    return useQuery({
        queryKey: QUERY_KEYS.tokenBatch(request.addresses, request.chain),
        queryFn: () =>
            apiClient.post<TokenBatchResponse>("/api/tokens/batch", request),

        // Default options
        staleTime: QUERY_OPTIONS.tokenDetails.staleTime,
        gcTime: QUERY_OPTIONS.tokenDetails.cacheTime,

        // Only fetch if we have addresses
        enabled: request.addresses.length > 0 && options?.enabled !== false,

        // Transform response
        select: (response) => ({
            tokens: response.data || [],
            notFound: response.meta?.notFoundAddresses || [],
            foundCount: response.meta?.foundCount || 0,
        }),

        ...options,
    });
}

/**
 * Hook to fetch a single token by address
 */
export function useToken(
    address: string,
    chain: string,
    options?: Omit<
        UseQueryOptions<TokenDetailsResponse, ApiError, TokenData | undefined>,
        "queryKey" | "queryFn"
    >
) {
    return useQuery({
        queryKey: QUERY_KEYS.tokenDetails(address, chain),
        queryFn: () =>
            apiClient.get<TokenDetailsResponse>(`/api/tokens/${address}`, {
                params: { chain },
            }),

        // Default options
        staleTime: QUERY_OPTIONS.tokenDetails.staleTime,
        gcTime: QUERY_OPTIONS.tokenDetails.cacheTime,

        // Only fetch if address and chain are provided
        enabled: !!address && !!chain && options?.enabled !== false,

        // Transform response
        select: (response) => response.data,

        ...options,
    });
}

/**
 * Hook for debounced token search
 * Useful for search-as-you-type functionality
 */
export function useDebouncedTokenSearch(
    query: string,
    chain?: string,
    debounceMs = 300,
    options?: Omit<
        UseQueryOptions<TokenSearchResponse, ApiError, TokenData[]>,
        "queryKey" | "queryFn"
    >
) {
    const [debouncedQuery, setDebouncedQuery] = React.useState(query);

    React.useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(query);
        }, debounceMs);

        return () => clearTimeout(timer);
    }, [query, debounceMs]);

    return useTokenSearch(
        {
            query: debouncedQuery,
            chain,
            limit: 10, // Reasonable limit for search
        },
        {
            // Don't fetch if query is too short
            enabled: debouncedQuery.length > 2,
            ...options,
        }
    );
}

/**
 * Hook to get common tokens for a chain
 * Useful for displaying popular tokens
 */
export function useCommonTokens(
    chain: string,
    options?: Omit<
        UseQueryOptions<
            TokenBatchResponse,
            ApiError,
            { tokens: TokenData[]; notFound: string[]; foundCount: number }
        >,
        "queryKey" | "queryFn"
    >
) {
    // Define common token addresses for each chain
    const commonTokenAddresses: Record<string, string[]> = {
        ethereum: [
            "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // WETH
            "0xA0b86a33E6441b8f8c51e4D0EfC03cB3eaAad6b1", // USDC
            "0xdAC17F958D2ee523a2206206994597C13D831ec7", // USDT
            "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", // WBTC
            "0x514910771AF9Ca656af840dff83E8264EcF986CA", // LINK
        ],
        arbitrum: [
            "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", // WETH
            "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8", // USDC
            "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", // USDT
            "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f", // WBTC
            "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4", // LINK
        ],
        base: [
            "0x4200000000000000000000000000000000000006", // WETH
            "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC
            // Add more Base tokens as needed
        ],
    };

    const addresses = commonTokenAddresses[chain] || [];

    return useTokenBatch(
        { addresses, chain },
        {
            // Cache common tokens for longer
            staleTime: 5 * 60 * 1000, // 5 minutes
            gcTime: 30 * 60 * 1000, // 30 minutes
            ...options,
        }
    );
}

/**
 * Hook to prefetch token data
 */
export function usePrefetchToken() {
    const queryClient = useQueryClient();

    return (address: string, chain: string) => {
        return queryClient.prefetchQuery({
            queryKey: QUERY_KEYS.tokenDetails(address, chain),
            queryFn: () =>
                apiClient.get<TokenDetailsResponse>(`/api/tokens/${address}`, {
                    params: { chain },
                }),
            staleTime: QUERY_OPTIONS.tokenDetails.staleTime,
        });
    };
}

/**
 * Hook to add token to cache manually
 * Useful when you have token data from other sources
 */
export function useSetTokenCache() {
    const queryClient = useQueryClient();

    return (token: TokenData) => {
        queryClient.setQueryData(
            QUERY_KEYS.tokenDetails(token.address, token.chainId.toString()),
            { data: token, success: true } as TokenDetailsResponse
        );
    };
}

/**
 * Hook to invalidate token cache
 */
export function useInvalidateTokens() {
    const queryClient = useQueryClient();

    return {
        // Invalidate all token queries
        invalidateAll: () => {
            return queryClient.invalidateQueries({
                queryKey: QUERY_KEYS.tokens,
            });
        },

        // Invalidate specific token
        invalidateToken: (address: string, chain: string) => {
            return queryClient.invalidateQueries({
                queryKey: QUERY_KEYS.tokenDetails(address, chain),
            });
        },

        // Invalidate search results
        invalidateSearch: (params?: TokenSearchParams) => {
            if (params) {
                return queryClient.invalidateQueries({
                    queryKey: QUERY_KEYS.tokenSearch(params),
                });
            }
            return queryClient.invalidateQueries({
                predicate: (query) =>
                    query.queryKey[0] === "tokens" &&
                    query.queryKey[1] === "search",
            });
        },
    };
}

/**
 * Hook to get token cache statistics
 */
export function useTokenCacheInfo() {
    const queryClient = useQueryClient();

    return {
        getCachedTokens: () => {
            return queryClient
                .getQueryCache()
                .findAll({ queryKey: QUERY_KEYS.tokens });
        },

        getStats: () => {
            const cache = queryClient.getQueryCache();
            const tokenQueries = cache.findAll({ queryKey: QUERY_KEYS.tokens });

            return {
                totalTokenQueries: tokenQueries.length,
                searchQueries: tokenQueries.filter(
                    (q) => q.queryKey[1] === "search"
                ).length,
                detailQueries: tokenQueries.filter(
                    (q) => q.queryKey[1] === "details"
                ).length,
                batchQueries: tokenQueries.filter(
                    (q) => q.queryKey[1] === "batch"
                ).length,
            };
        },
    };
}
