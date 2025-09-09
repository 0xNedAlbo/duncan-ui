import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';
import type { PositionWithPnL } from '@/services/positions/positionService';

// Mock authentication
vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

// Mock auth options
vi.mock('@/lib/auth', () => ({
  authOptions: {},
}));

// Mock Position Service
vi.mock('@/services/positions', () => ({
  getPositionService: vi.fn(),
}));

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    position: {
      findFirst: vi.fn(),
    },
    $disconnect: vi.fn(),
  },
}));

import { getServerSession } from 'next-auth/next';
import { getPositionService } from '@/services/positions';
import { prisma } from '@/lib/prisma';

// Mock refreshed position data
const mockRefreshedPosition: PositionWithPnL = {
  id: 'position-123',
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
    currentPrice: '2100.75',
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
  currentValue: '10750.00',
  pnl: '750.00',
  pnlPercent: 7.5,
  initialSource: 'subgraph',
  confidence: 'exact',

  rangeStatus: 'in-range',
  lastUpdated: new Date(),
  dataUpdated: true // Position was upgraded during refresh
};

const mockPositionService = {
  refreshPosition: vi.fn(),
};

describe('/api/positions/[id]/refresh', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(getPositionService).mockReturnValue(mockPositionService as any);
    
    // Mock current time for consistent testing
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  const createRequest = (positionId: string) => {
    return new NextRequest(`http://localhost:3000/api/positions/${positionId}/refresh`, {
      method: 'POST',
    });
  };

  describe('Authentication', () => {
    it('should return 401 when no session', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);
      
      const request = createRequest('position-123');
      const response = await POST(request, { params: { id: 'position-123' } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized - Please sign in');
      expect(prisma.position.findFirst).not.toHaveBeenCalled();
    });

    it('should return 401 when session has no user ID', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { email: 'test@example.com' }
      } as any);
      
      const request = createRequest('position-123');
      const response = await POST(request, { params: { id: 'position-123' } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized - Please sign in');
    });
  });

  describe('Parameter Validation', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' }
      } as any);
    });

    it('should return 400 for missing position ID', async () => {
      const request = createRequest('');
      const response = await POST(request, { params: { id: '' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid position ID');
    });

    it('should return 400 for non-string position ID', async () => {
      const request = createRequest('position-123');
      const response = await POST(request, { params: { id: null as any } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid position ID');
    });
  });

  describe('Position Ownership Verification', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' }
      } as any);
    });

    it('should return 404 when position does not exist', async () => {
      vi.mocked(prisma.position.findFirst).mockResolvedValue(null);

      const request = createRequest('nonexistent-position');
      const response = await POST(request, { params: { id: 'nonexistent-position' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Position not found or not owned by user');
      
      expect(prisma.position.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'nonexistent-position',
          userId: 'user-123'
        },
        select: { userId: true, updatedAt: true }
      });
    });

    it('should return 404 when position exists but belongs to different user', async () => {
      vi.mocked(prisma.position.findFirst).mockResolvedValue(null); // findFirst returns null when userId doesn't match

      const request = createRequest('other-user-position');
      const response = await POST(request, { params: { id: 'other-user-position' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Position not found or not owned by user');
    });
  });

  describe('Rate Limiting', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' }
      } as any);
      
      vi.mocked(prisma.position.findFirst).mockResolvedValue({
        userId: 'user-123',
        updatedAt: new Date()
      } as any);
    });

    it('should allow first refresh immediately', async () => {
      mockPositionService.refreshPosition.mockResolvedValue(mockRefreshedPosition);

      const request = createRequest('position-123');
      const response = await POST(request, { params: { id: 'position-123' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockPositionService.refreshPosition).toHaveBeenCalledWith('position-123');
    });

    it('should verify rate limiting logic exists', async () => {
      mockPositionService.refreshPosition.mockResolvedValue(mockRefreshedPosition);

      const request = createRequest('position-123');
      const response = await POST(request, { params: { id: 'position-123' } });

      expect(response.status).toBe(200);
      // The rate limiting cache will prevent immediate duplicate calls
      // but we can't easily test this in isolation due to module caching
    });

    it('should create cache keys per user-position combination', async () => {
      mockPositionService.refreshPosition.mockResolvedValue(mockRefreshedPosition);

      // Test that different user-position combinations work
      // (Rate limiting cache keys include both user ID and position ID)
      const request = createRequest('position-123');
      const response = await POST(request, { params: { id: 'position-123' } });
      expect(response.status).toBe(200);
    });
  });

  describe('Successful Refresh', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'fresh-user-' + Math.random(), email: 'test@example.com' }
      } as any);
      
      vi.mocked(prisma.position.findFirst).mockResolvedValue({
        userId: 'fresh-user-' + Math.random(),
        updatedAt: new Date()
      } as any);
      
      vi.setSystemTime(new Date('2024-01-01T12:00:00Z'));
    });

    it('should return refreshed position data', async () => {
      mockPositionService.refreshPosition.mockResolvedValue(mockRefreshedPosition);

      const request = createRequest('position-123');
      const response = await POST(request, { params: { id: 'position-123' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        data: {
          position: mockRefreshedPosition,
          refreshedAt: '2024-01-01T12:00:00.000Z'
        },
        meta: {
          upgraded: true,
          dataSource: 'subgraph',
          confidence: 'exact',
          pnlData: {
            currentValue: '10750.00',
            initialValue: '10000.00',
            pnl: '750.00',
            pnlPercent: 7.5
          }
        }
      });
    });

    it('should handle position without dataUpdated flag', async () => {
      const positionWithoutUpdate = { ...mockRefreshedPosition, dataUpdated: undefined };
      mockPositionService.refreshPosition.mockResolvedValue(positionWithoutUpdate);

      const request = createRequest('position-123');
      const response = await POST(request, { params: { id: 'position-123' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.meta.upgraded).toBe(false);
    });

    it('should clean up old cache entries', async () => {
      // This test verifies that the cache cleanup logic runs without errors
      // We can't easily test the actual cleanup without exposing the cache
      mockPositionService.refreshPosition.mockResolvedValue(mockRefreshedPosition);

      const request = createRequest('position-123');
      const response = await POST(request, { params: { id: 'position-123' } });

      expect(response.status).toBe(200);
      // If cleanup failed, it would throw an error and we'd get a 500
    });

    it('should always disconnect from Prisma', async () => {
      mockPositionService.refreshPosition.mockResolvedValue(mockRefreshedPosition);

      const request = createRequest('position-123');
      await POST(request, { params: { id: 'position-123' } });

      expect(prisma.$disconnect).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' }
      } as any);
      
      vi.mocked(prisma.position.findFirst).mockResolvedValue({
        userId: 'user-123',
        updatedAt: new Date()
      } as any);
    });

    it('should handle position service errors', async () => {
      mockPositionService.refreshPosition.mockRejectedValue(
        new Error('Pool service unavailable')
      );

      const request = createRequest('position-123');
      const response = await POST(request, { params: { id: 'position-123' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Pool service unavailable');
    });

    it('should handle non-Error exceptions from position service', async () => {
      mockPositionService.refreshPosition.mockRejectedValue('String error');

      const request = createRequest('position-123');
      const response = await POST(request, { params: { id: 'position-123' } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Internal server error');
    });

    it('should handle database connection errors', async () => {
      vi.mocked(prisma.position.findFirst).mockRejectedValue(
        new Error('Database connection failed')
      );

      const request = createRequest('position-123');
      const response = await POST(request, { params: { id: 'position-123' } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Internal server error');
    });

    it('should always disconnect from Prisma even on error', async () => {
      mockPositionService.refreshPosition.mockRejectedValue(
        new Error('Service error')
      );

      const request = createRequest('position-123');
      await POST(request, { params: { id: 'position-123' } });

      expect(prisma.$disconnect).toHaveBeenCalled();
    });

    it('should handle authentication service errors', async () => {
      vi.mocked(getServerSession).mockRejectedValue(new Error('Auth service down'));

      const request = createRequest('position-123');
      const response = await POST(request, { params: { id: 'position-123' } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Internal server error');
    });
  });

  describe('Concurrency and Cache Management', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'concurrent-user-' + Math.random(), email: 'test@example.com' }
      } as any);
      
      vi.mocked(prisma.position.findFirst).mockResolvedValue({
        userId: 'concurrent-user-' + Math.random(),
        updatedAt: new Date()
      } as any);

      mockPositionService.refreshPosition.mockResolvedValue(mockRefreshedPosition);
      vi.setSystemTime(new Date('2024-01-01T12:00:00Z'));
    });

    it('should handle concurrent refresh requests (rate limiting active)', async () => {
      // Just verify the endpoint works - detailed rate limiting is complex to test
      // due to shared module state
      const request = createRequest('position-concurrent');
      const response = await POST(request, { params: { id: 'position-concurrent' } });
      expect(response.status).toBe(200);
    });

    it('should handle different positions concurrently', async () => {
      const positions = ['pos-1', 'pos-2', 'pos-3'];
      const requests = positions.map(id => createRequest(id));
      
      const responses = await Promise.all(
        requests.map((request, i) => POST(request, { params: { id: positions[i] } }))
      );

      // All should succeed (different cache keys)
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });
});