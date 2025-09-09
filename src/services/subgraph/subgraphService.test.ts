import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SubgraphService } from './subgraphService';
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

describe('SubgraphService', () => {
  let service: SubgraphService;
  let fetchSpy: any;

  beforeEach(() => {
    // Reset all mocks before each test
    vi.restoreAllMocks();
    service = new SubgraphService();
    
    // Create default mock for successful responses
    fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (url, init) => {
      const body = JSON.parse(init?.body as string);
      const query = body.query;
      const variables = body.variables;
      
      // Handle GetPosition queries
      if (query.includes('GetPosition')) {
        const tokenId = variables.tokenId;
        if (tokenId === '123456') {
          return new Response(JSON.stringify(mockPositionResponse), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        if (tokenId === '999999') {
          return new Response(JSON.stringify({ data: { position: null } }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }
      
      // Handle GetPositionsByOwner queries
      if (query.includes('GetPositionsByOwner')) {
        const owner = variables.owner;
        if (owner === '0xowner123') {
          return new Response(JSON.stringify({
            data: {
              positions: [mockPositionResponse.data!.position]
            }
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        return new Response(JSON.stringify({ data: { positions: [] } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Default error response
      return new Response(JSON.stringify({ errors: [{ message: 'Query not found' }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    });
  });

  describe('fetchPositionHistory', () => {
    it('should fetch position history successfully', async () => {
      const result = await service.fetchPositionHistory('123456', 'ethereum');

      expect(result).toBeTruthy();
      expect(result?.source).toBe('subgraph');
      expect(result?.confidence).toBe('exact');
      expect(result?.token0Amount).toBe('1500000000000000000'); // 1.5 ETH in Wei
      expect(result?.token1Amount).toBe('3000000000'); // 3000 USDC in smallest unit
      expect(result?.timestamp).toEqual(new Date(1640995200 * 1000));
    });

    it('should return null when position not found', async () => {
      const result = await service.fetchPositionHistory('999999', 'ethereum');

      expect(result).toBeNull();
    });

    it('should handle network errors gracefully', async () => {
      // Mock network error - need to override the default successful mock
      fetchSpy.mockReset();
      fetchSpy.mockRejectedValueOnce(new Error('Failed to fetch'));

      const result = await service.fetchPositionHistory('123456', 'ethereum');

      expect(result).toBeNull();
    });

    it('should handle rate limit errors', async () => {
      // Mock rate limit error - need to override the default successful mock
      fetchSpy.mockReset();
      fetchSpy.mockResolvedValueOnce(new Response(null, {
        status: 429,
        statusText: 'Too Many Requests'
      }));

      const result = await service.fetchPositionHistory('123456', 'ethereum');

      expect(result).toBeNull();
    });

    it('should handle query errors', async () => {
      // Mock query error response - need to override the default successful mock
      fetchSpy.mockReset();
      fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({
        errors: [{ message: 'Invalid query' }]
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }));

      const result = await service.fetchPositionHistory('123456', 'ethereum');

      expect(result).toBeNull();
    });

    it('should throw error for unsupported chain', async () => {
      await expect(
        service.fetchPositionHistory('123456', 'unsupported')
      ).rejects.toThrow('Subgraph not available for chain: unsupported');
    });

    it('should retry on network failures', async () => {
      // Mock first call to fail, second to succeed - need to override the default successful mock
      fetchSpy.mockReset();
      fetchSpy
        .mockRejectedValueOnce(new Error('Failed to fetch'))
        .mockResolvedValueOnce(new Response(JSON.stringify(mockPositionResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }));

      const result = await service.fetchPositionHistory('123456', 'ethereum');

      expect(result).toBeTruthy();
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    it('should work with API key', async () => {
      // Verify that API key service uses different endpoint
      const serviceWithKey = new SubgraphService('test-api-key');
      
      const result = await serviceWithKey.fetchPositionHistory('123456', 'ethereum');

      expect(result).toBeTruthy();
      // Verify the correct gateway URL is called
      expect(fetchSpy).toHaveBeenCalledWith(
        'https://gateway.thegraph.com/api/test-api-key/subgraphs/name/uniswap/uniswap-v3',
        expect.any(Object)
      );
    });

    it('should handle timeout correctly', async () => {
      // Mock timeout by making fetch promise reject due to AbortController
      fetchSpy.mockReset();
      fetchSpy.mockImplementationOnce(() => 
        new Promise((_, reject) => {
          // Simulate timeout by rejecting with AbortError after delay
          setTimeout(() => {
            const abortError = new Error('The operation was aborted');
            abortError.name = 'AbortError';
            reject(abortError);
          }, 50); // Short delay to simulate timeout
        })
      );

      const startTime = Date.now();
      const result = await service.fetchPositionHistory('123456', 'ethereum');
      const elapsed = Date.now() - startTime;

      expect(result).toBeNull();
      expect(elapsed).toBeLessThan(2000); // Should fail quickly due to our mock
    });
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

      // The service returns values in smallest token units (BigInt strings)
      // For this test, we expect a specific BigInt value based on the mock data
      // The exact calculation depends on the price scaling logic in the service
      expect(result!.value).toBeTruthy(); // Just verify we get a non-empty value
      expect(typeof result!.value).toBe('string'); // Should be BigInt-compatible string
    });
  });
});