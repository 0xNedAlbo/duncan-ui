// The Graph Protocol Configuration für Uniswap V3 Subgraphs

export interface SubgraphConfig {
  endpoint: string;
  chainId: number;
  available: boolean;
  name: string;
}

export const SUBGRAPH_ENDPOINTS: Record<string, SubgraphConfig> = {
  ethereum: {
    endpoint: 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3',
    chainId: 1,
    available: true,
    name: 'Uniswap V3 (Ethereum)'
  },
  arbitrum: {
    endpoint: 'https://api.thegraph.com/subgraphs/name/ianlapham/uniswap-v3-arbitrum',
    chainId: 42161,
    available: true,
    name: 'Uniswap V3 (Arbitrum)'
  },
  base: {
    endpoint: 'https://api.studio.thegraph.com/query/48211/uniswap-v3-base/version/latest',
    chainId: 8453,
    available: true,
    name: 'Uniswap V3 (Base)'
  }
};

// Alternative: Wenn wir einen API Key haben
export function getSubgraphEndpoint(chain: string, apiKey?: string): string {
  const config = SUBGRAPH_ENDPOINTS[chain];
  if (!config) {
    throw new Error(`Subgraph not available for chain: ${chain}`);
  }

  // Mit API Key (höhere Rate Limits)
  if (apiKey && chain !== 'base') { // Base ist Studio, braucht keinen API Key
    const gatewayUrl = config.endpoint.replace(
      'https://api.thegraph.com/subgraphs/name/',
      `https://gateway.thegraph.com/api/${apiKey}/subgraphs/name/`
    );
    return gatewayUrl;
  }

  return config.endpoint;
}

export function isSubgraphAvailable(chain: string): boolean {
  return SUBGRAPH_ENDPOINTS[chain]?.available ?? false;
}

export function getSupportedChains(): string[] {
  return Object.keys(SUBGRAPH_ENDPOINTS);
}