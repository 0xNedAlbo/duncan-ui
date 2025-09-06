export interface AlchemyTokenMetadata {
  symbol: string;
  name: string;
  decimals: number;
  logo: string | null;
}

export interface AlchemyResponse {
  jsonrpc: string;
  id: number;
  result?: AlchemyTokenMetadata;
  error?: {
    code: number;
    message: string;
  };
}

export interface AlchemyBatchResponse {
  jsonrpc: string;
  id: number;
  result?: AlchemyTokenMetadata[];
  error?: {
    code: number;
    message: string;
  };
}

export class AlchemyTokenService {
  private alchemyUrls: Record<string, string>;

  constructor() {
    const apiKey = process.env.ALCHEMY_TOKEN_API_KEY;
    this.alchemyUrls = {
      ethereum: `https://eth-mainnet.g.alchemy.com/v2/${apiKey}`,
      arbitrum: `https://arb-mainnet.g.alchemy.com/v2/${apiKey}`,
      base: `https://base-mainnet.g.alchemy.com/v2/${apiKey}`,
    };
  }

  /**
   * Fetch metadata for a single token
   */
  async getTokenMetadata(chain: string, address: string): Promise<AlchemyTokenMetadata> {
    this.validateChain(chain);
    this.validateAddress(address);

    const url = this.alchemyUrls[chain];
    if (!url) {
      throw new Error(`Alchemy URL not configured for chain: ${chain}`);
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'alchemy_getTokenMetadata',
        params: [address],
        id: 1,
      }),
    });

    if (!response.ok) {
      throw new Error(`Alchemy API error: ${response.status} ${response.statusText}`);
    }

    const data: AlchemyResponse = await response.json();

    if (data.error) {
      throw new Error(`Alchemy API error: ${data.error.message}`);
    }

    if (!data.result) {
      throw new Error(`Token not found: ${address} on ${chain}`);
    }

    return data.result;
  }

  /**
   * Fetch metadata for multiple tokens in a single batch request
   */
  async getTokenMetadataBatch(
    chain: string,
    addresses: string[]
  ): Promise<AlchemyTokenMetadata[]> {
    this.validateChain(chain);
    
    if (addresses.length === 0) {
      return [];
    }

    if (addresses.length > 100) {
      throw new Error('Batch size cannot exceed 100 tokens');
    }

    // Validate all addresses
    addresses.forEach(address => this.validateAddress(address));

    const url = this.alchemyUrls[chain];
    if (!url) {
      throw new Error(`Alchemy URL not configured for chain: ${chain}`);
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'alchemy_getTokenMetadataBatch',
        params: [addresses],
        id: 1,
      }),
    });

    if (!response.ok) {
      throw new Error(`Alchemy API error: ${response.status} ${response.statusText}`);
    }

    const data: AlchemyBatchResponse = await response.json();

    if (data.error) {
      throw new Error(`Alchemy API error: ${data.error.message}`);
    }

    return data.result || [];
  }

  /**
   * Split large address arrays into chunks of 100 for batch processing
   */
  async getTokenMetadataBatchLarge(
    chain: string,
    addresses: string[]
  ): Promise<AlchemyTokenMetadata[]> {
    if (addresses.length === 0) {
      return [];
    }

    const chunks = this.chunkArray(addresses, 100);
    const results: AlchemyTokenMetadata[] = [];

    for (const chunk of chunks) {
      const chunkResults = await this.getTokenMetadataBatch(chain, chunk);
      results.push(...chunkResults);
    }

    return results;
  }

  /**
   * Check if a chain is supported
   */
  isChainSupported(chain: string): boolean {
    return Object.keys(this.alchemyUrls).includes(chain);
  }

  /**
   * Get list of supported chains
   */
  getSupportedChains(): string[] {
    return Object.keys(this.alchemyUrls);
  }

  private validateChain(chain: string): void {
    if (!this.isChainSupported(chain)) {
      throw new Error(`Unsupported chain: ${chain}. Supported chains: ${this.getSupportedChains().join(', ')}`);
    }
  }

  private validateAddress(address: string): void {
    if (!address || typeof address !== 'string') {
      throw new Error('Invalid address: must be a non-empty string');
    }

    // Basic Ethereum address validation (40 hex chars + 0x prefix)
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      throw new Error(`Invalid Ethereum address format: ${address}`);
    }
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}