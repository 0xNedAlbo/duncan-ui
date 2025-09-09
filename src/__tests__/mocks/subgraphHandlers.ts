import { http, HttpResponse, delay } from 'msw';
import type { SubgraphResponse, PositionQueryData } from '@/types/subgraph';

// Mock Subgraph Response Data
const mockPositionResponse: SubgraphResponse<PositionQueryData> = {
  data: {
    position: {
      id: '123456',
      liquidity: '1000000000000000000',
      depositedToken0: '1.5',
      depositedToken1: '3000.0',
      withdrawnToken0: '0',
      withdrawnToken1: '0',
      collectedFeesToken0: '0.001',
      collectedFeesToken1: '2.5',
      transaction: {
        id: '0xabc123',
        timestamp: '1640995200', // 2022-01-01
        blockNumber: '14000000',
        gasUsed: '250000',
        gasPrice: '20000000000'
      },
      pool: {
        id: '0xpool123',
        token0: {
          id: '0xtoken0',
          symbol: 'WETH',
          name: 'Wrapped Ether',
          decimals: 18
        },
        token1: {
          id: '0xtoken1',
          symbol: 'USDC',
          name: 'USD Coin',
          decimals: 6
        },
        feeTier: 3000,
        token0Price: '2000.5',
        token1Price: '0.0005',
        liquidity: '500000000000000000000',
        sqrtPrice: '1771845812700903892492492442',
        tick: 201000
      }
    }
  }
};

export const subgraphHandlers = [
  // Ethereum subgraph endpoint (exact URL)
  http.post('https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3', async ({ request }) => {
    console.log('[MSW] Subgraph handler called!');
    try {
      const body = await request.json() as { query: string; variables: any };
      console.log('[MSW] Request body:', { query: body.query.substring(0, 100) + '...', variables: body.variables });
      
      if (body.query.includes('GetPosition')) {
        const tokenId = body.variables.tokenId;
        
        if (tokenId === '123456') {
          return HttpResponse.json(mockPositionResponse);
        }
        
        if (tokenId === '999999') {
          return HttpResponse.json({ data: { position: null } });
        }
      }
      
      if (body.query.includes('GetPositionsByOwner')) {
        const owner = body.variables.owner;
        
        if (owner === '0xowner123') {
          return HttpResponse.json({
            data: {
              positions: [mockPositionResponse.data!.position]
            }
          });
        }
        
        return HttpResponse.json({ data: { positions: [] } });
      }
      
      return HttpResponse.json({ errors: [{ message: 'Query not found' }] });
    } catch (error) {
      return HttpResponse.json({ errors: [{ message: 'Handler error' }] });
    }
  }),
  
  // Test API key endpoint - using pattern for gateway
  http.post('https://gateway.thegraph.com/api/*/subgraphs/name/uniswap/uniswap-v3', async ({ request }) => {
    try {
      const body = await request.json() as { query: string; variables: any };
      
      if (body.query.includes('GetPosition')) {
        const tokenId = body.variables.tokenId;
        
        if (tokenId === '123456') {
          return HttpResponse.json(mockPositionResponse);
        }
        
        if (tokenId === '999999') {
          return HttpResponse.json({ data: { position: null } });
        }
      }
      
      return HttpResponse.json({ errors: [{ message: 'Query not found' }] });
    } catch (error) {
      return HttpResponse.json({ errors: [{ message: 'Handler error' }] });
    }
  })
];

// Test-specific handler overrides
export const createSubgraphTestHandlers = () => ({
  // Network error handler
  networkError: http.post('https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3', () => {
    return HttpResponse.error();
  }),

  // Rate limit handler  
  rateLimit: http.post('https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3', () => {
    return new HttpResponse(null, { status: 429, statusText: 'Too Many Requests' });
  }),

  // Query error handler
  queryError: http.post('https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3', () => {
    return HttpResponse.json({
      errors: [{ message: 'Invalid query' }]
    });
  }),

  // Retry handler (fails first attempt, succeeds second)
  retry: (() => {
    let attempts = 0;
    return http.post('https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3', () => {
      attempts++;
      if (attempts === 1) {
        return HttpResponse.error();
      }
      return HttpResponse.json(mockPositionResponse);
    });
  })(),

  // Timeout handler
  timeout: http.post('https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3', async () => {
    await delay(15000); // Delay longer than timeout
    return HttpResponse.json(mockPositionResponse);
  })
});