import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { GET } from './route';
import { getPositionService } from '@/services/positions';

// Mock dependencies
vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/services/positions', () => ({
  getPositionService: vi.fn(),
}));

describe('/api/positions/uniswapv3/list', () => {
  const mockPositionService = {
    getPositionsWithPnL: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getPositionService).mockReturnValue(mockPositionService as any);
  });

  it('should return 401 if user is not authenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/positions/uniswapv3/list');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized - Please sign in');
  });

  it('should return position list for authenticated user', async () => {
    const mockSession = { user: { id: 'user1' } };
    const mockPositions = {
      positions: [{
        id: 'pos1',
        tokenPair: 'WETH/USDC',
        pnl: '1000',
        status: 'active'
      }],
      total: 1,
      hasMore: false
    };

    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    mockPositionService.getPositionsWithPnL.mockResolvedValue(mockPositions);

    const request = new NextRequest('http://localhost:3000/api/positions/uniswapv3/list');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.positions).toHaveLength(1);
    expect(data.data.positions[0].id).toBe('pos1');
    expect(mockPositionService.getPositionsWithPnL).toHaveBeenCalledWith({
      userId: 'user1',
      status: 'active',
      chain: undefined,
      limit: 20,
      offset: 0,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  });

  it('should handle query parameters correctly', async () => {
    const mockSession = { user: { id: 'user1' } };
    const mockPositions = { positions: [], total: 0, hasMore: false };

    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    mockPositionService.getPositionsWithPnL.mockResolvedValue(mockPositions);

    const request = new NextRequest('http://localhost:3000/api/positions/uniswapv3/list?status=closed&chain=ethereum&limit=10&offset=5&sortBy=pnl&sortOrder=asc');
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockPositionService.getPositionsWithPnL).toHaveBeenCalledWith({
      userId: 'user1',
      status: 'closed',
      chain: 'ethereum',
      limit: 10,
      offset: 5,
      sortBy: 'pnl',
      sortOrder: 'asc',
    });
  });

  it('should handle service errors', async () => {
    const mockSession = { user: { id: 'user1' } };
    
    vi.mocked(getServerSession).mockResolvedValue(mockSession);
    mockPositionService.getPositionsWithPnL.mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/positions/uniswapv3/list');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Internal server error');
    expect(data.message).toBe('Database error');
  });
});