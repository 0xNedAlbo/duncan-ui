import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as tokensGET, POST as tokensPOST } from '../tokens/route';
import { GET as searchGET } from '../tokens/search/route';
import { POST as importNFTPOST } from '../positions/import-nft/route';
import { POST as batchPOST, GET as batchGET } from '../tokens/batch/route';

// Mock getSession
vi.mock('@/lib/auth', () => ({
  getSession: vi.fn(),
}));

// Mock dependencies to prevent database/network calls
vi.mock('@/services/tokens/tokenService', () => ({
  TokenService: vi.fn(() => ({
    getToken: vi.fn().mockResolvedValue(null),
    upsertToken: vi.fn().mockResolvedValue({}),
    searchTokens: vi.fn().mockResolvedValue([]),
    getTokensByAddresses: vi.fn().mockResolvedValue([]),
    createTokensFromAddresses: vi.fn().mockResolvedValue([]),
  })),
}));

vi.mock('@/services/uniswap/nftPosition', () => ({
  fetchNFTPosition: vi.fn(),
}));

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => ({})),
}));

import { getSession } from '@/lib/auth';

describe('API Authentication Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createRequest = (method: string, url: string, body?: any) => {
    const request = new NextRequest(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    return request;
  };

  describe('Unauthorized Access (No Session)', () => {
    beforeEach(() => {
      // Mock no session (unauthenticated)
      vi.mocked(getSession).mockResolvedValue(null);
    });

    it('should return 401 for GET /api/tokens without session', async () => {
      const request = createRequest('GET', 'http://localhost:3000/api/tokens?chain=ethereum&address=0x123');
      const response = await tokensGET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized - Please sign in');
    });

    it('should return 401 for POST /api/tokens without session', async () => {
      const request = createRequest('POST', 'http://localhost:3000/api/tokens', {
        chain: 'ethereum',
        address: '0x123',
      });
      const response = await tokensPOST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized - Please sign in');
    });

    it('should return 401 for GET /api/tokens/search without session', async () => {
      const request = createRequest('GET', 'http://localhost:3000/api/tokens/search');
      const response = await searchGET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized - Please sign in');
    });

    it('should return 401 for POST /api/tokens/batch without session', async () => {
      const request = createRequest('POST', 'http://localhost:3000/api/tokens/batch', {
        chain: 'ethereum',
        addresses: ['0x123'],
      });
      const response = await batchPOST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized - Please sign in');
    });

    it('should return 401 for GET /api/tokens/batch without session', async () => {
      const request = createRequest('GET', 'http://localhost:3000/api/tokens/batch?chain=ethereum&addresses=0x123');
      const response = await batchGET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized - Please sign in');
    });

    it('should return 401 for POST /api/positions/import-nft without session', async () => {
      const request = createRequest('POST', 'http://localhost:3000/api/positions/import-nft', {
        chain: 'ethereum',
        nftId: '12345',
      });
      const response = await importNFTPOST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Unauthorized - Please sign in');
    });
  });

  describe('Authorized Access (With Session)', () => {
    beforeEach(() => {
      // Mock authenticated session
      vi.mocked(getSession).mockResolvedValue({
        user: { id: 'test-user', email: 'test@example.com', name: 'Test User' }
      } as any);
    });

    it('should proceed to validation for authenticated GET /api/tokens', async () => {
      const request = createRequest('GET', 'http://localhost:3000/api/tokens'); // Missing required params
      const response = await tokensGET(request);
      const data = await response.json();

      // Should pass auth check and reach validation error (not 401)
      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required parameters: chain and address');
    });

    it('should proceed to validation for authenticated POST /api/tokens', async () => {
      const request = createRequest('POST', 'http://localhost:3000/api/tokens', {}); // Missing required params
      const response = await tokensPOST(request);
      const data = await response.json();

      // Should pass auth check and reach validation error (not 401)
      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required parameters: chain, address, symbol, name, and decimals');
    });

    it('should proceed to business logic for authenticated GET /api/tokens/search', async () => {
      const request = createRequest('GET', 'http://localhost:3000/api/tokens/search');
      const response = await searchGET(request);

      // Should pass auth check and reach business logic (not 401)
      expect(response.status).not.toBe(401);
    });

    it('should proceed to validation for authenticated POST /api/positions/import-nft', async () => {
      const request = createRequest('POST', 'http://localhost:3000/api/positions/import-nft', {}); // Missing required params
      const response = await importNFTPOST(request);
      const data = await response.json();

      // Should pass auth check and reach validation error (not 401)
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Chain and NFT ID are required');
    });
  });

  describe('Session Service Integration', () => {
    it('should call getSession exactly once per request', async () => {
      vi.mocked(getSession).mockResolvedValue({
        user: { id: 'test-user', email: 'test@example.com', name: 'Test User' }
      } as any);

      const request = createRequest('GET', 'http://localhost:3000/api/tokens/search');
      await searchGET(request);

      expect(getSession).toHaveBeenCalledTimes(1);
    });

    it('should handle getSession errors gracefully', async () => {
      vi.mocked(getSession).mockRejectedValue(new Error('Session service error'));

      const request = createRequest('GET', 'http://localhost:3000/api/tokens/search');
      
      // Should handle the error and return 500 or similar, not crash
      await expect(searchGET(request)).resolves.toBeDefined();
    });
  });
});