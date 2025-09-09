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
   * Returns BigInt-compatible strings in smallest unit (no decimals)
   */
  private parseInitialValue(position: SubgraphPosition): InitialValueData {
    // Get token decimals from subgraph
    const token0Decimals = parseInt(position.pool.token0.decimals);
    const token1Decimals = parseInt(position.pool.token1.decimals);
    
    // Convert depositedToken amounts to BigInt in smallest unit
    const token0AmountWei = this.stringToBigInt(position.depositedToken0, token0Decimals);
    const token1AmountWei = this.stringToBigInt(position.depositedToken1, token1Decimals);
    
    // Pool-Preise scaled für Berechnungen
    const token0PriceScaled = this.stringToBigInt(position.pool.token0Price, 18);
    const token1PriceScaled = this.stringToBigInt(position.pool.token1Price, 18);
    
    // Bestimme Quote Token (meist token1 für WETH/USDC Paare)
    // Wenn token0Price sehr klein ist, ist token1 wahrscheinlich der Quote Token
    let totalValueInQuoteWei: bigint;
    let quoteTokenDecimals: number;
    
    if (token0PriceScaled < BigInt(1e15)) { // < 0.001 - token1 ist Quote
      // token1Price = Base per Quote, verwende für Base-Wert Berechnung
      const token0ValueInToken1 = (token0AmountWei * token1PriceScaled) / BigInt(10 ** (18 + token0Decimals - token1Decimals));
      totalValueInQuoteWei = token0ValueInToken1 + token1AmountWei;
      quoteTokenDecimals = token1Decimals;
    } else { // token0 ist Quote
      const token1ValueInToken0 = (token1AmountWei * token0PriceScaled) / BigInt(10 ** (18 + token1Decimals - token0Decimals));
      totalValueInQuoteWei = token0AmountWei + token1ValueInToken0;
      quoteTokenDecimals = token0Decimals;
    }

    return {
      // Store values in smallest unit (BigInt-compatible strings)
      value: totalValueInQuoteWei.toString(),
      token0Amount: token0AmountWei.toString(),
      token1Amount: token1AmountWei.toString(),
      timestamp: new Date(parseInt(position.transaction.timestamp) * 1000),
      source: 'subgraph',
      confidence: 'exact',
      transactionHash: position.transaction.id,
      blockNumber: parseInt(position.transaction.blockNumber)
    };
  }

  /**
   * Convert decimal string to scaled BigInt
   */
  private stringToBigInt(value: string, scale: number): bigint {
    if (!value || value === '0') return 0n;
    
    // Split by decimal point
    const [integer, decimal = ''] = value.split('.');
    
    // Pad or truncate decimal part to scale
    const paddedDecimal = decimal.padEnd(scale, '0').slice(0, scale);
    
    // Combine and convert to BigInt
    const combined = integer + paddedDecimal;
    return BigInt(combined);
  }

  /**
   * Convert scaled BigInt back to decimal string
   */
  private bigIntToString(value: bigint, scale: number): string {
    if (value === 0n) return '0';
    
    const valueStr = value.toString();
    const divisor = 10 ** scale;
    
    if (valueStr.length <= scale) {
      // Value is less than 1
      const paddedValue = valueStr.padStart(scale, '0');
      return '0.' + paddedValue.replace(/0+$/, '') || '0';
    } else {
      // Value is greater than 1
      const integerPart = valueStr.slice(0, -scale);
      const decimalPart = valueStr.slice(-scale).replace(/0+$/, '');
      return decimalPart ? `${integerPart}.${decimalPart}` : integerPart;
    }
  }

  /**
   * Helper: Delay für Retry Logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generic public query method for custom subgraph queries
   * Used by other services that need direct subgraph access
   */
  async query<T = any>(
    chain: string,
    query: string,
    variables: Record<string, any> = {}
  ): Promise<SubgraphResponse<T>> {
    return this.querySubgraph<T>(chain, { query, variables });
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
    // Load API key from environment if not provided
    const key = apiKey || process.env.THE_GRAPH_API_KEY;
    subgraphServiceInstance = new SubgraphService(key);
  }
  return subgraphServiceInstance;
}