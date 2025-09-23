export interface CoinGeckoToken {
  id: string;
  symbol: string;
  name: string;
  platforms: Record<string, string>;
}

export interface TokenSearchResult {
  address?: string;
  symbol: string;
  name: string;
  decimals?: number;
  verified: boolean;
  logoUrl?: string;
  source: 'coingecko';
}

export class CoinGeckoService {
  private readonly baseUrl = 'https://api.coingecko.com/api/v3';
  private tokensCache: CoinGeckoToken[] | null = null;
  private cacheExpiry: number = 0;
  private readonly cacheTimeout = 5 * 60 * 1000; // 5 minutes

  // Map our chain names to CoinGecko platform IDs
  private readonly chainToPlatformId: Record<string, string> = {
    'ethereum': 'ethereum',
    'arbitrum': 'arbitrum-one',
    'base': 'base',
  };

  /**
   * Search for tokens by symbol or name using CoinGecko's coins list
   */
  async searchTokens(query: string, chain: string, limit: number = 20): Promise<TokenSearchResult[]> {
    const tokens = await this.getAllTokens();
    const normalizedQuery = query.toLowerCase().trim();
    const platformId = this.chainToPlatformId[chain];

    if (!normalizedQuery) {
      return [];
    }

    if (!platformId) {
      throw new Error(`Unsupported chain: ${chain}. Supported chains: ${Object.keys(this.chainToPlatformId).join(', ')}`);
    }

    // Search for tokens that match the query in symbol or name AND have an address on the specified chain
    const matches = tokens.filter(token => {
      const hasMatchingText = token.symbol.toLowerCase().includes(normalizedQuery) ||
                              token.name.toLowerCase().includes(normalizedQuery);
      const hasAddressOnChain = token.platforms[platformId] && token.platforms[platformId].trim() !== '';

      return hasMatchingText && hasAddressOnChain;
    });

    // Sort by relevance: exact symbol match first, then exact name match, then partial matches
    matches.sort((a, b) => {
      const aSymbol = a.symbol.toLowerCase();
      const bSymbol = b.symbol.toLowerCase();
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();

      // Exact symbol match gets highest priority
      if (aSymbol === normalizedQuery && bSymbol !== normalizedQuery) return -1;
      if (bSymbol === normalizedQuery && aSymbol !== normalizedQuery) return 1;

      // Exact name match gets second priority
      if (aName === normalizedQuery && bName !== normalizedQuery) return -1;
      if (bName === normalizedQuery && aName !== normalizedQuery) return 1;

      // Symbol starts with query gets third priority
      if (aSymbol.startsWith(normalizedQuery) && !bSymbol.startsWith(normalizedQuery)) return -1;
      if (bSymbol.startsWith(normalizedQuery) && !aSymbol.startsWith(normalizedQuery)) return 1;

      // Name starts with query gets fourth priority
      if (aName.startsWith(normalizedQuery) && !bName.startsWith(normalizedQuery)) return -1;
      if (bName.startsWith(normalizedQuery) && !aName.startsWith(normalizedQuery)) return 1;

      // Alphabetical by symbol for remaining matches
      return aSymbol.localeCompare(bSymbol);
    });

    return matches.slice(0, limit).map(token => ({
      address: token.platforms[platformId], // Contract address for the specific chain
      symbol: token.symbol,
      name: token.name,
      verified: true, // CoinGecko tokens are considered verified
      source: 'coingecko' as const,
    }));
  }

  /**
   * Get all tokens from CoinGecko with caching
   */
  private async getAllTokens(): Promise<CoinGeckoToken[]> {
    const now = Date.now();

    // Return cached data if valid
    if (this.tokensCache && now < this.cacheExpiry) {
      return this.tokensCache;
    }

    try {
      const response = await fetch(`${this.baseUrl}/coins/list?include_platform=true`);

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`);
      }

      const allTokens: CoinGeckoToken[] = await response.json();

      // Filter to only include tokens that have addresses on our supported chains
      const supportedChainIds = Object.values(this.chainToPlatformId);
      const filteredTokens = allTokens.filter(token => {
        return supportedChainIds.some(chainId =>
          token.platforms[chainId] && token.platforms[chainId].trim() !== ''
        );
      });

      // Cache the filtered results
      this.tokensCache = filteredTokens;
      this.cacheExpiry = now + this.cacheTimeout;

      return filteredTokens;
    } catch (error) {
      // If we have cached data and API fails, return cached data
      if (this.tokensCache) {
        return this.tokensCache;
      }

      throw new Error(`Failed to fetch tokens from CoinGecko: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Clear the token cache (useful for testing or manual refresh)
   */
  clearCache(): void {
    this.tokensCache = null;
    this.cacheExpiry = 0;
  }

  /**
   * Check if service has cached data
   */
  hasCachedData(): boolean {
    return this.tokensCache !== null && Date.now() < this.cacheExpiry;
  }
}