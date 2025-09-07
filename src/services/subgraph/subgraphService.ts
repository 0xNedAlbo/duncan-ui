import { getSubgraphEndpoint, isSubgraphAvailable } from '@/config/subgraph';
import { 
  SubgraphResponse, 
  PositionQueryData, 
  PositionsQueryData,
  InitialValueData,
  SubgraphPosition 
} from '@/types/subgraph';
import { POSITION_QUERY, POSITIONS_BY_OWNER_QUERY, buildQuery } from './queries';

export class SubgraphService {
  private readonly timeout = 10000; // 10 Sekunden
  private readonly maxRetries = 2;

  constructor(private readonly apiKey?: string) {}

  /**
   * Fetch Position History für Initial Value Berechnung
   */
  async fetchPositionHistory(nftId: string, chain: string): Promise<InitialValueData | null> {
    if (!isSubgraphAvailable(chain)) {
      throw new SubgraphError({
        code: 'NOT_FOUND',
        message: `Subgraph not available for chain: ${chain}`,
        chain
      });
    }

    try {
      const response = await this.querySubgraph<PositionQueryData>(
        chain,
        buildQuery(POSITION_QUERY, { tokenId: nftId })
      );

      if (!response.data?.position) {
        return null; // Position nicht im Subgraph gefunden
      }

      return this.parseInitialValue(response.data.position);
    } catch (error) {
      console.error(`Subgraph error for position ${nftId} on ${chain}:`, error);
      return null; // Fallback zu Snapshot
    }
  }

  /**
   * Fetch alle Positionen eines Owners (für Wallet Import)
   */
  async fetchPositionsByOwner(
    owner: string,
    chain: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<SubgraphPosition[]> {
    if (!isSubgraphAvailable(chain)) {
      return [];
    }

    try {
      const response = await this.querySubgraph<PositionsQueryData>(
        chain,
        buildQuery(POSITIONS_BY_OWNER_QUERY, {
          owner: owner.toLowerCase(),
          first: limit,
          skip: offset
        })
      );

      return response.data?.positions ?? [];
    } catch (error) {
      console.error(`Error fetching positions for owner ${owner} on ${chain}:`, error);
      return [];
    }
  }

  /**
   * Generische Subgraph Query mit Retry Logic
   */
  private async querySubgraph<T>(
    chain: string,
    { query, variables }: { query: string; variables: Record<string, any> }
  ): Promise<SubgraphResponse<T>> {
    const endpoint = getSubgraphEndpoint(chain, this.apiKey);
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query, variables }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          if (response.status === 429) {
            throw new SubgraphError({
              code: 'RATE_LIMIT',
              message: 'Rate limit exceeded',
              chain,
              query,
              variables
            });
          }
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data: SubgraphResponse<T> = await response.json();

        if (data.errors && data.errors.length > 0) {
          throw new SubgraphError({
            code: 'QUERY_ERROR',
            message: data.errors[0].message,
            chain,
            query,
            variables
          });
        }

        return data;
      } catch (error) {
        lastError = error as Error;
        
        // Bei Timeout oder Network Error: Retry
        if (error instanceof Error && 
           (error.name === 'AbortError' || error.message.includes('fetch'))) {
          console.warn(`Subgraph request failed (attempt ${attempt + 1}):`, error.message);
          if (attempt < this.maxRetries - 1) {
            await this.delay(1000 * (attempt + 1)); // Exponential backoff
            continue;
          }
        }
        
        throw error;
      }
    }

    throw new SubgraphError({
      code: 'NETWORK_ERROR',
      message: lastError?.message ?? 'Unknown network error',
      chain,
      query,
      variables
    });
  }

  /**
   * Parse Subgraph Position zu Initial Value Data
   */
  private parseInitialValue(position: SubgraphPosition): InitialValueData {
    // Berechne Initial Value in Quote Asset
    // Hier vereinfacht - könnte komplexer werden mit Preisen
    const token0Value = parseFloat(position.depositedToken0) * parseFloat(position.pool.token0Price);
    const token1Value = parseFloat(position.depositedToken1) * parseFloat(position.pool.token1Price);
    const totalValue = token0Value + token1Value;

    return {
      value: totalValue.toString(),
      token0Amount: position.depositedToken0,
      token1Amount: position.depositedToken1,
      timestamp: new Date(parseInt(position.transaction.timestamp) * 1000),
      source: 'subgraph',
      confidence: 'exact',
      transactionHash: position.transaction.id,
      blockNumber: parseInt(position.transaction.blockNumber)
    };
  }

  /**
   * Helper: Delay für Retry Logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Custom Error Class
class SubgraphError extends Error {
  public readonly code: 'NETWORK_ERROR' | 'QUERY_ERROR' | 'NOT_FOUND' | 'RATE_LIMIT' | 'TIMEOUT';
  public readonly chain: string;
  public readonly query?: string;
  public readonly variables?: Record<string, any>;

  constructor(params: {
    code: 'NETWORK_ERROR' | 'QUERY_ERROR' | 'NOT_FOUND' | 'RATE_LIMIT' | 'TIMEOUT';
    message: string;
    chain: string;
    query?: string;
    variables?: Record<string, any>;
  }) {
    super(params.message);
    this.name = 'SubgraphError';
    this.code = params.code;
    this.chain = params.chain;
    this.query = params.query;
    this.variables = params.variables;
  }
}

// Singleton Instance
let subgraphServiceInstance: SubgraphService | null = null;

export function getSubgraphService(apiKey?: string): SubgraphService {
  if (!subgraphServiceInstance) {
    subgraphServiceInstance = new SubgraphService(apiKey);
  }
  return subgraphServiceInstance;
}