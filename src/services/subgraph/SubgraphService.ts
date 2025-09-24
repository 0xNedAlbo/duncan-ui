import { getSubgraphEndpoint } from '@/config/subgraph';

// Generic SubgraphResponse for API responses
export interface SubgraphResponse<T> {
  data?: T;
  errors?: Array<{ message: string; path?: string[]; extensions?: any }>;
}

export class SubgraphService {
  private readonly timeout = 30000; // 30 seconds
  private readonly maxRetries = 2;
  private readonly apiKey: string | undefined;

  constructor() {
    const apiKey = process.env.THE_GRAPH_API_KEY;
    if (!apiKey) {
      console.warn('⚠️  THE_GRAPH_API_KEY not set - using public endpoints with rate limits');
    }
    this.apiKey = apiKey;
  }

  /**
   * Generic public query method for subgraph queries
   */
  async query<T = any>(
    chain: string,
    query: string,
    variables: Record<string, any> = {}
  ): Promise<SubgraphResponse<T>> {
    return this.querySubgraph<T>(chain, { query, variables });
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
          console.error(`🚫 The Graph subgraph HTTP error for ${chain}:`, {
            status: response.status,
            statusText: response.statusText,
            endpoint,
            attempt: attempt + 1,
            hasApiKey: !!this.apiKey,
            query: query.replace(/\s+/g, ' ').trim().substring(0, 200)
          });

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
          console.error(`🔍 The Graph subgraph GraphQL error for ${chain}:`, {
            errors: data.errors.map(err => ({
              message: err.message,
              path: err.path,
              extensions: err.extensions
            })),
            endpoint,
            attempt: attempt + 1,
            hasApiKey: !!this.apiKey,
            query: query.replace(/\s+/g, ' ').trim(),
            variables
          });

          throw new SubgraphError({
            code: 'QUERY_ERROR',
            message: data.errors[0].message,
            chain,
            query,
            variables
          });
        }

        // Log successful requests for debugging
        console.log(`✅ The Graph subgraph success for ${chain}:`, {
          endpoint,
          dataReceived: !!data.data,
          hasApiKey: !!this.apiKey,
          attempt: attempt + 1
        });

        return data;
      } catch (error) {
        lastError = error as Error;

        // Bei Timeout oder Network Error: Retry
        if (error instanceof Error &&
           (error.name === 'AbortError' || error.message.includes('fetch'))) {
          console.warn(`⏱️  The Graph subgraph network error for ${chain} (attempt ${attempt + 1}):`, {
            error: error.message,
            errorType: error.name,
            endpoint,
            willRetry: attempt < this.maxRetries - 1,
            hasApiKey: !!this.apiKey
          });
          if (attempt < this.maxRetries - 1) {
            await this.delay(1000 * (attempt + 1)); // Exponential backoff
            continue;
          }
        }

        throw error;
      }
    }

    console.error(`💥 The Graph subgraph final failure for ${chain} after ${this.maxRetries} attempts:`, {
      finalError: lastError?.message ?? 'Unknown network error',
      errorType: lastError?.name,
      endpoint: getSubgraphEndpoint(chain, this.apiKey),
      hasApiKey: !!this.apiKey,
      query: query.replace(/\s+/g, ' ').trim().substring(0, 200),
      variables
    });

    throw new SubgraphError({
      code: 'NETWORK_ERROR',
      message: lastError?.message ?? 'Unknown network error',
      chain,
      query,
      variables
    });
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

export function getSubgraphService(): SubgraphService {
  if (!subgraphServiceInstance) {
    subgraphServiceInstance = new SubgraphService();
  }
  return subgraphServiceInstance;
}