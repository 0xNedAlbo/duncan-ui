// The Graph Protocol Configuration für Uniswap V3 Subgraphs

export interface SubgraphConfig {
  endpoint: string;
  chainId: number;
  available: boolean;
  name: string;
}

export const SUBGRAPH_ENDPOINTS: Record<string, SubgraphConfig> = {
  ethereum: {
    endpoint: 'https://gateway.thegraph.com/api/[api-key]/subgraphs/id/5zvR82QoaXYFyDEKLZ9t6v9adgnptxYpKpSbxtgVENFV',
    chainId: 1,
    available: true,
    name: 'Uniswap V3 (Ethereum)'
  },
  arbitrum: {
    endpoint: 'https://gateway.thegraph.com/api/[api-key]/subgraphs/id/FbCGRftH4a3yZugY7TnbYgPJVEv2LvMT6oF1fxPe9aJM',
    chainId: 42161,
    available: true,
    name: 'Uniswap V3 (Arbitrum)'
  },
  base: {
    endpoint: 'https://gateway.thegraph.com/api/[api-key]/subgraphs/id/HMuAwufqZ1YCRmzL2SfHTVkzZovC9VL2UAKhjvRqKiR1',
    chainId: 8453,
    available: true,
    name: 'Uniswap V3 (Base)'
  }
};

export function getSubgraphEndpoint(chain: string, apiKey?: string): string {
  const config = SUBGRAPH_ENDPOINTS[chain];
  if (!config) {
    throw new Error(`Subgraph not available for chain: ${chain}`);
  }

  // Mit API Key (höhere Rate Limits)
  if (apiKey) {
    // Handle different URL formats
    if (config.endpoint.includes('[api-key]')) {
      // New gateway format with subgraph ID
      return config.endpoint.replace('[api-key]', apiKey);
    } else {
      // Legacy hosted service format
      const gatewayUrl = config.endpoint.replace(
        'https://api.thegraph.com/subgraphs/name/',
        `https://gateway.thegraph.com/api/${apiKey}/subgraphs/name/`
      );
      return gatewayUrl;
    }
  }

  return config.endpoint;
}

export function isSubgraphAvailable(chain: string): boolean {
  return SUBGRAPH_ENDPOINTS[chain]?.available ?? false;
}

export function getSupportedChains(): string[] {
  return Object.keys(SUBGRAPH_ENDPOINTS);
}