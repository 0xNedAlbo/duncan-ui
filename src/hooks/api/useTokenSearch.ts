import { useState, useEffect, useCallback, useMemo } from "react";
import { useDebounce } from "use-debounce";
import type { SupportedChainsType } from "@/config/chains";

export interface TokenSearchResult {
    address: string;
    symbol: string;
    name: string;
    decimals: number;
    verified: boolean;
    logoUrl?: string;
    source: 'popular' | 'database' | 'alchemy' | 'onchain';
}

export interface TokenSearchResponse {
    results: TokenSearchResult[];
    query: string;
    chain: string;
    type?: 'base' | 'quote';
}

export interface UseTokenSearchOptions {
    chain: SupportedChainsType;
    type?: 'base' | 'quote';
    enabled?: boolean;
    debounceMs?: number;
    limit?: number;
}

export interface UseTokenSearchReturn {
    // Search state
    query: string;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    setQuery: (query: string) => void;
    debouncedQuery: string;

    // Results
    results: TokenSearchResult[];
    isLoading: boolean;
    error: string | null;

    // Popular tokens (shown when no query)
    popularTokens: TokenSearchResult[];

    // Actions
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    search: (searchQuery: string) => Promise<void>;
    clearResults: () => void;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    selectToken: (token: TokenSearchResult) => void;

    // State
    hasSearched: boolean;
    isEmpty: boolean;
}

/**
 * Hook for searching tokens with debouncing and caching
 */
export function useTokenSearch({
    chain,
    type,
    enabled = true,
    debounceMs = 300,
    limit = 20,
}: UseTokenSearchOptions): UseTokenSearchReturn {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<TokenSearchResult[]>([]);
    const [popularTokens, setPopularTokens] = useState<TokenSearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasSearched, setHasSearched] = useState(false);

    // Debounce the search query
    const [debouncedQuery] = useDebounce(query, debounceMs);

    // Memoized search function
    const search = useCallback(async (searchQuery: string) => {
        if (!enabled) return;

        setIsLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams({
                chain,
                query: searchQuery,
                limit: limit.toString(),
            });

            if (type) {
                params.append('type', type);
            }

            const response = await fetch(`/api/tokens/search?${params.toString()}`);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Search failed');
            }

            const data: TokenSearchResponse = await response.json();
            setResults(data.results);
            setHasSearched(true);

            // If no query, these are popular tokens
            if (!searchQuery.trim()) {
                setPopularTokens(data.results);
            }

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Search failed';
            setError(errorMessage);
            setResults([]);
        } finally {
            setIsLoading(false);
        }
    }, [chain, type, limit, enabled]);

    // Load popular tokens on mount
    useEffect(() => {
        if (enabled && !hasSearched && popularTokens.length === 0) {
            search("");
        }
    }, [search, enabled, hasSearched, popularTokens.length]);

    // Search when debounced query changes
    useEffect(() => {
        if (enabled && debouncedQuery !== undefined && debouncedQuery.length >= 3) {
            search(debouncedQuery);
        }
    }, [debouncedQuery, search, enabled]);

    // Clear results
    const clearResults = useCallback(() => {
        setResults([]);
        setError(null);
        setHasSearched(false);
        setQuery("");
    }, []);

    // Select token (for external handling)
    const selectToken = useCallback(() => {
        // This is a placeholder - the parent component should handle token selection
        // console.log("Token selected:", token);
    }, []);

    // Computed properties
    const isEmpty = useMemo(() => {
        return hasSearched && results.length === 0 && !isLoading;
    }, [hasSearched, results.length, isLoading]);

    return {
        // Search state
        query,
        setQuery,
        debouncedQuery,

        // Results
        results,
        isLoading,
        error,

        // Popular tokens
        popularTokens,

        // Actions
        search,
        clearResults,
        selectToken,

        // State
        hasSearched,
        isEmpty,
    };
}

/**
 * Simple token search function for one-off searches
 */
export async function searchTokens(
    chain: SupportedChainsType,
    query: string,
    options: {
        type?: 'base' | 'quote';
        limit?: number;
    } = {}
): Promise<TokenSearchResult[]> {
    const { type, limit = 20 } = options;

    const params = new URLSearchParams({
        chain,
        query,
        limit: limit.toString(),
    });

    if (type) {
        params.append('type', type);
    }

    const response = await fetch(`/api/tokens/search?${params.toString()}`);

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Search failed');
    }

    const data: TokenSearchResponse = await response.json();
    return data.results;
}