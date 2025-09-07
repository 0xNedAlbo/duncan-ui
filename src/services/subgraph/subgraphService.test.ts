import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { SubgraphService } from './subgraphService';
import { SUBGRAPH_ENDPOINTS } from '@/config/subgraph';
import type { SubgraphResponse, PositionQueryData } from '@/types/subgraph';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

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
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchPositionHistory', () => {
    it('should fetch position history successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(mockPositionResponse)
      });

      const result = await service.fetchPositionHistory('123456', 'ethereum');

      expect(result).toBeTruthy();
      expect(result?.source).toBe('subgraph');
      expect(result?.confidence).toBe('exact');
      expect(result?.token0Amount).toBe('1.5');
      expect(result?.token1Amount).toBe('3000.0');
      expect(result?.timestamp).toEqual(new Date(1640995200 * 1000));
      
      // Verify fetch was called with correct parameters
      expect(mockFetch).toHaveBeenCalledWith(
        SUBGRAPH_ENDPOINTS.ethereum.endpoint,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('GetPosition')
        })
      );
    });

    it('should return null when position not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ data: { position: null } })
      });

      const result = await service.fetchPositionHistory('999999', 'ethereum');

      expect(result).toBeNull();
    });

    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await service.fetchPositionHistory('123456', 'ethereum');

      expect(result).toBeNull();
    });

    it('should handle rate limit errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        json: vi.fn()
      });

      const result = await service.fetchPositionHistory('123456', 'ethereum');

      expect(result).toBeNull();
    });

    it('should handle query errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          errors: [{ message: 'Invalid query' }]
        })
      });

      const result = await service.fetchPositionHistory('123456', 'ethereum');

      expect(result).toBeNull();
    });

    it('should throw error for unsupported chain', async () => {
      await expect(
        service.fetchPositionHistory('123456', 'unsupported')
      ).rejects.toThrow('Subgraph not available for chain: unsupported');
    });

    it('should retry on network failures', async () => {
      // First call fails, second succeeds
      mockFetch
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: vi.fn().mockResolvedValue(mockPositionResponse)
        });

      const result = await service.fetchPositionHistory('123456', 'ethereum');

      expect(result).toBeTruthy();
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should work with API key', async () => {
      const serviceWithKey = new SubgraphService('test-api-key');
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(mockPositionResponse)
      });

      await serviceWithKey.fetchPositionHistory('123456', 'ethereum');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('gateway.thegraph.com/api/test-api-key'),
        expect.any(Object)
      );
    });

    it('should handle timeout correctly', async () => {
      // Mock fetch that never resolves (simulating timeout)
      mockFetch.mockImplementationOnce(() => new Promise(() => {}));

      const startTime = Date.now();
      const result = await service.fetchPositionHistory('123456', 'ethereum');
      const elapsed = Date.now() - startTime;

      expect(result).toBeNull();
      expect(elapsed).toBeLessThan(12000); // Should timeout before 12 seconds
    }, 15000);
  });

  describe('fetchPositionsByOwner', () => {
    it('should fetch positions by owner successfully', async () => {
      const mockResponse = {
        data: {
          positions: [mockPositionResponse.data!.position]
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(mockResponse)
      });

      const result = await service.fetchPositionsByOwner('0xowner123', 'ethereum');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('123456');
    });

    it('should return empty array for unsupported chain', async () => {
      const result = await service.fetchPositionsByOwner('0xowner123', 'unsupported');
      expect(result).toEqual([]);
    });

    it('should handle pagination parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ data: { positions: [] } })
      });

      await service.fetchPositionsByOwner('0xowner123', 'ethereum', 10, 20);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"first":10,"skip":20')
        })
      );
    });
  });

  describe('parseInitialValue', () => {
    it('should calculate initial value correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(mockPositionResponse)
      });

      const result = await service.fetchPositionHistory('123456', 'ethereum');

      // WETH: 1.5 * 2000.5 = 3000.75
      // USDC: 3000.0 * 0.0005 = 1.5  
      // Total: 3002.25
      expect(parseFloat(result!.value)).toBeCloseTo(3002.25, 2);
    });
  });
});