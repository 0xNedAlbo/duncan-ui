import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';
import type { PositionWithPnL } from '@/services/positions/positionService';

// Mock authentication
vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

// Mock Position Service
vi.mock('@/services/positions', () => ({
  getPositionService: vi.fn(),
}));

import { getServerSession } from 'next-auth/next';
import { getPositionService } from '@/services/positions';

// Mock Position data
const mockPositionWithPnL: PositionWithPnL = {
  id: 'test-position-1',
  nftId: '12345',
  liquidity: '1000000000000000000',
  tickLower: -887220,
  tickUpper: 887220,
  owner: '0x123...abc',
  importType: 'nft',
  status: 'active',
  createdAt: new Date('2024-01-01T10:00:00Z'),
  
  pool: {
    id: 'pool-1',
    chain: 'ethereum',
    poolAddress: '0xpool123',
    fee: 3000,
    currentPrice: '2000.50',
    token0: {
      id: 'token-weth',
      symbol: 'WETH',
      name: 'Wrapped Ether',
      decimals: 18,
      logoUrl: 'https://logo.weth'
    },
    token1: {
      id: 'token-usdc',
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      logoUrl: 'https://logo.usdc'
    }
  },

  token0IsQuote: false,
  tokenPair: 'WETH/USDC',
  baseSymbol: 'WETH',
  quoteSymbol: 'USDC',

  initialValue: '10000.00',
  currentValue: '10500.00',
  pnl: '500.00',
  pnlPercent: 5.0,
  initialSource: 'subgraph',
  confidence: 'exact',

  rangeStatus: 'in-range',
  lastUpdated: new Date('2024-01-01T12:00:00Z')
};

const mockPositionService = {
  getPositionsWithPnL: vi.fn(),
};

describe('/api/positions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getPositionService).mockReturnValue(mockPositionService as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const createRequest = (queryParams: Record<string, string> = {}) => {
    const url = new URL('http://localhost:3000/api/positions');
    Object.entries(queryParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
    
    return new NextRequest(url.toString(), {
      method: 'GET',
    });
  };

  describe('Authentication', () => {
    it('should return 401 when no session', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);
      
      const request = createRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized - Please sign in');
      expect(mockPositionService.getPositionsWithPnL).not.toHaveBeenCalled();
    });

    it('should return 401 when session has no user ID', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { email: 'test@example.com' }
      } as any);
      
      const request = createRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized - Please sign in');
    });
  });

  describe('Successful Requests', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' }
      } as any);
    });

    it('should return positions with default parameters', async () => {
      mockPositionService.getPositionsWithPnL.mockResolvedValue({
        positions: [mockPositionWithPnL],
        total: 1,
        hasMore: false
      });

      const request = createRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.positions).toHaveLength(1);
      expect(data.data.positions[0]).toMatchObject({
        ...mockPositionWithPnL,
        createdAt: mockPositionWithPnL.createdAt.toISOString(),
        lastUpdated: mockPositionWithPnL.lastUpdated.toISOString()
      });
      expect(data.data.pagination).toEqual({
        total: 1,
        limit: 20,
        offset: 0,
        hasMore: false,
        nextOffset: null
      });

      expect(mockPositionService.getPositionsWithPnL).toHaveBeenCalledWith({
        userId: 'user-123',
        status: 'active',
        chain: undefined,
        limit: 20,
        offset: 0,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });
    });

    it('should handle custom query parameters', async () => {
      mockPositionService.getPositionsWithPnL.mockResolvedValue({
        positions: [],
        total: 0,
        hasMore: false
      });

      const request = createRequest({
        status: 'closed',
        chain: 'arbitrum',
        limit: '10',
        offset: '20',
        sortBy: 'pnl',
        sortOrder: 'asc'
      });
      
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockPositionService.getPositionsWithPnL).toHaveBeenCalledWith({
        userId: 'user-123',
        status: 'closed',
        chain: 'arbitrum',
        limit: 10,
        offset: 20,
        sortBy: 'pnl',
        sortOrder: 'asc'
      });
    });

    it('should include data quality metrics', async () => {
      const positions = [
        { ...mockPositionWithPnL, id: '1', initialSource: 'subgraph', dataUpdated: false },
        { ...mockPositionWithPnL, id: '2', initialSource: 'snapshot', dataUpdated: true },
        { ...mockPositionWithPnL, id: '3', initialSource: 'subgraph', dataUpdated: false },
      ] as PositionWithPnL[];

      mockPositionService.getPositionsWithPnL.mockResolvedValue({
        positions,
        total: 3,
        hasMore: false
      });

      const request = createRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(data.meta.dataQuality).toEqual({
        subgraphPositions: 2,
        snapshotPositions: 1,
        upgradedPositions: 1
      });
    });

    it('should calculate pagination correctly with hasMore=true', async () => {
      mockPositionService.getPositionsWithPnL.mockResolvedValue({
        positions: [mockPositionWithPnL],
        total: 50,
        hasMore: true
      });

      const request = createRequest({ limit: '10', offset: '20' });
      const response = await GET(request);
      const data = await response.json();

      expect(data.data.pagination).toEqual({
        total: 50,
        limit: 10,
        offset: 20,
        hasMore: true,
        nextOffset: 30
      });
    });

    it('should calculate pagination correctly with hasMore=false', async () => {
      mockPositionService.getPositionsWithPnL.mockResolvedValue({
        positions: [mockPositionWithPnL],
        total: 1,
        hasMore: false
      });

      const request = createRequest({ limit: '20', offset: '0' });
      const response = await GET(request);
      const data = await response.json();

      expect(data.data.pagination).toEqual({
        total: 1,
        limit: 20,
        offset: 0,
        hasMore: false,
        nextOffset: null
      });
    });
  });

  describe('Query Parameter Validation', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' }
      } as any);
    });

    it('should return 400 for invalid status', async () => {
      const request = createRequest({ status: 'invalid' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid query parameters');
      expect(data.details).toBeDefined();
    });

    it('should return 400 for invalid limit (too low)', async () => {
      const request = createRequest({ limit: '0' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid query parameters');
    });

    it('should return 400 for invalid limit (too high)', async () => {
      const request = createRequest({ limit: '101' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid query parameters');
    });

    it('should return 400 for invalid offset (negative)', async () => {
      const request = createRequest({ offset: '-1' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid query parameters');
    });

    it('should return 400 for invalid sortBy', async () => {
      const request = createRequest({ sortBy: 'invalid' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid query parameters');
    });

    it('should return 400 for invalid sortOrder', async () => {
      const request = createRequest({ sortOrder: 'invalid' });
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid query parameters');
    });

    it('should accept valid enum values', async () => {
      mockPositionService.getPositionsWithPnL.mockResolvedValue({
        positions: [],
        total: 0,
        hasMore: false
      });

      const validParams = [
        { status: 'active' },
        { status: 'closed' },
        { status: 'archived' },
        { sortBy: 'createdAt' },
        { sortBy: 'currentValue' },
        { sortBy: 'pnl' },
        { sortBy: 'pnlPercent' },
        { sortOrder: 'asc' },
        { sortOrder: 'desc' },
      ];

      for (const params of validParams) {
        const request = createRequest(params);
        const response = await GET(request);
        expect(response.status).toBe(200);
      }
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' }
      } as any);
    });

    it('should handle position service errors', async () => {
      mockPositionService.getPositionsWithPnL.mockRejectedValue(
        new Error('Database connection failed')
      );

      const request = createRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Internal server error');
      expect(data.message).toBe('Database connection failed');
    });

    it('should handle non-Error exceptions', async () => {
      mockPositionService.getPositionsWithPnL.mockRejectedValue('String error');

      const request = createRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Internal server error');
      expect(data.message).toBe('Unknown error');
    });

    it('should handle getServerSession errors', async () => {
      vi.mocked(getServerSession).mockRejectedValue(new Error('Auth service down'));

      const request = createRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Internal server error');
    });
  });

  describe('Response Structure', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' }
      } as any);
    });

    it('should include all required response fields', async () => {
      mockPositionService.getPositionsWithPnL.mockResolvedValue({
        positions: [mockPositionWithPnL],
        total: 1,
        hasMore: false
      });

      const request = createRequest({ chain: 'ethereum' });
      const response = await GET(request);
      const data = await response.json();

      expect(data).toEqual({
        success: true,
        data: {
          positions: [{
            ...mockPositionWithPnL,
            createdAt: mockPositionWithPnL.createdAt.toISOString(),
            lastUpdated: mockPositionWithPnL.lastUpdated.toISOString()
          }],
          pagination: {
            total: 1,
            limit: 20,
            offset: 0,
            hasMore: false,
            nextOffset: null
          }
        },
        meta: {
          requestedAt: expect.any(String),
          filters: {
            status: 'active',
            chain: 'ethereum',
            sortBy: 'createdAt',
            sortOrder: 'desc'
          },
          dataQuality: {
            subgraphPositions: 1,
            snapshotPositions: 0,
            upgradedPositions: 0
          }
        }
      });
    });

    it('should handle null chain filter in response', async () => {
      mockPositionService.getPositionsWithPnL.mockResolvedValue({
        positions: [],
        total: 0,
        hasMore: false
      });

      const request = createRequest(); // No chain specified
      const response = await GET(request);
      const data = await response.json();

      expect(data.meta.filters.chain).toBe(null);
    });
  });
});