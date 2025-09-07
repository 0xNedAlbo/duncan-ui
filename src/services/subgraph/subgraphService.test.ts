import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { SubgraphService } from './subgraphService';
import { SUBGRAPH_ENDPOINTS } from '@/config/subgraph';
import type { SubgraphResponse, PositionQueryData } from '@/types/subgraph';
import { server } from '@/__tests__/mocks/server';
import { http, HttpResponse, delay } from 'msw';

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

describe('SubgraphService', () => {
  let service: SubgraphService;

  beforeEach(() => {
    service = new SubgraphService();
    server.resetHandlers();
  });

  beforeAll(() => {
    // Add basic Subgraph handlers
    server.use(
      // Ethereum subgraph endpoint (exact URL)
      http.post('https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3', async ({ request }) => {
        try {
          const body = await request.json() as { query: string; variables: any };
          console.log('MSW Handler received:', { query: body.query.substring(0, 100), variables: body.variables });
          
          if (body.query.includes('GetPosition')) {
            const tokenId = body.variables.tokenId;
            console.log('GetPosition for tokenId:', tokenId);
            
            if (tokenId === '123456') {
              console.log('Returning mockPositionResponse');
              return HttpResponse.json(mockPositionResponse);
            }
            
            if (tokenId === '999999') {
              console.log('Returning null position');
              return HttpResponse.json({ data: { position: null } });
            }
          }
          
          if (body.query.includes('GetPositionsByOwner')) {
            const owner = body.variables.owner;
            console.log('GetPositionsByOwner for owner:', owner);
            
            if (owner === '0xowner123') {
              console.log('Returning positions array');
              return HttpResponse.json({
                data: {
                  positions: [mockPositionResponse.data!.position]
                }
              });
            }
            
            return HttpResponse.json({ data: { positions: [] } });
          }
          
          console.log('Query not recognized');
          return HttpResponse.json({ errors: [{ message: 'Query not found' }] });
        } catch (error) {
          console.error('MSW Handler error:', error);
          return HttpResponse.json({ errors: [{ message: 'Handler error' }] });
        }
      }),
      
      // Test API key endpoint - using pattern for gateway
      http.post('https://gateway.thegraph.com/api/test-api-key/subgraphs/name/uniswap/uniswap-v3', async () => {
        console.log('API key handler called');
        return HttpResponse.json(mockPositionResponse);
      })
    );
  });

  describe('fetchPositionHistory', () => {
    it('should fetch position history successfully', async () => {
      const result = await service.fetchPositionHistory('123456', 'ethereum');

      expect(result).toBeTruthy();
      expect(result?.source).toBe('subgraph');
      expect(result?.confidence).toBe('exact');
      expect(result?.token0Amount).toBe('1.5');
      expect(result?.token1Amount).toBe('3000.0');
      expect(result?.timestamp).toEqual(new Date(1640995200 * 1000));
    });

    it('should return null when position not found', async () => {
      const result = await service.fetchPositionHistory('999999', 'ethereum');

      expect(result).toBeNull();
    });

    it('should handle network errors gracefully', async () => {
      // Override handler for this test
      server.use(
        http.post('https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3', () => {
          return HttpResponse.error();
        })
      );

      const result = await service.fetchPositionHistory('123456', 'ethereum');

      expect(result).toBeNull();
    });

    it('should handle rate limit errors', async () => {
      // Override handler for this test  
      server.use(
        http.post('https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3', () => {
          return new HttpResponse(null, { status: 429, statusText: 'Too Many Requests' });
        })
      );

      const result = await service.fetchPositionHistory('123456', 'ethereum');

      expect(result).toBeNull();
    });

    it('should handle query errors', async () => {
      // Override handler for this test
      server.use(
        http.post('https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3', () => {
          return HttpResponse.json({
            errors: [{ message: 'Invalid query' }]
          });
        })
      );

      const result = await service.fetchPositionHistory('123456', 'ethereum');

      expect(result).toBeNull();
    });

    it('should throw error for unsupported chain', async () => {
      await expect(
        service.fetchPositionHistory('123456', 'unsupported')
      ).rejects.toThrow('Subgraph not available for chain: unsupported');
    });

    it('should retry on network failures', async () => {
      let attempts = 0;
      
      // Override handler for this test
      server.use(
        http.post('https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3', () => {
          attempts++;
          if (attempts === 1) {
            return HttpResponse.error();
          }
          return HttpResponse.json(mockPositionResponse);
        })
      );

      const result = await service.fetchPositionHistory('123456', 'ethereum');

      expect(result).toBeTruthy();
      expect(attempts).toBe(2);
    });

    it('should work with API key', async () => {
      const serviceWithKey = new SubgraphService('test-api-key');
      
      const result = await serviceWithKey.fetchPositionHistory('123456', 'ethereum');

      expect(result).toBeTruthy();
    });

    it('should handle timeout correctly', async () => {
      // Override handler for this test
      server.use(
        http.post('https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3', async () => {
          await delay(15000); // Delay longer than timeout
          return HttpResponse.json(mockPositionResponse);
        })
      );

      const startTime = Date.now();
      const result = await service.fetchPositionHistory('123456', 'ethereum');
      const elapsed = Date.now() - startTime;

      expect(result).toBeNull();
      expect(elapsed).toBeLessThan(12000); // Should timeout before 12 seconds
    }, 15000);
  });

  describe('fetchPositionsByOwner', () => {
    it('should fetch positions by owner successfully', async () => {
      const result = await service.fetchPositionsByOwner('0xowner123', 'ethereum');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('123456');
    });

    it('should return empty array for unsupported chain', async () => {
      const result = await service.fetchPositionsByOwner('0xowner123', 'unsupported');
      expect(result).toEqual([]);
    });

    it('should handle pagination parameters', async () => {
      const result = await service.fetchPositionsByOwner('0xowner123', 'ethereum', 10, 20);

      // Should get empty array for this owner but not error
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('parseInitialValue', () => {
    it('should calculate initial value correctly', async () => {
      const result = await service.fetchPositionHistory('123456', 'ethereum');

      // WETH: 1.5 * 2000.5 = 3000.75
      // USDC: 3000.0 * 0.0005 = 1.5  
      // Total: 3002.25
      expect(parseFloat(result!.value)).toBeCloseTo(3002.25, 2);
    });
  });
});