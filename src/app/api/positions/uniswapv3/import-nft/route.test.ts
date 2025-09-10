import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';

// Setup comprehensive mocking BEFORE importing routes that need it
import { setupViemMocks } from '@/__tests__/mocks/viemMocks';
import { setupApiRouteTestEnvironment } from '@/__tests__/mocks/nextRequestContext';
import { createTestFactorySuite } from '@/__tests__/factories';

setupViemMocks();
const apiTestEnv = setupApiRouteTestEnvironment();

// Import route handlers AFTER mocking setup
import { POST, GET } from './route';
import { mockNFTPositions } from '@/__tests__/fixtures/nftPositions';

// Mock the NFT position service
vi.mock('@/services/uniswap/nftPosition', () => ({
  fetchNFTPosition: vi.fn(),
  fetchNFTPositionWithOwner: vi.fn(),
}));

import { fetchNFTPosition, fetchNFTPositionWithOwner } from '@/services/uniswap/nftPosition';
import { getServerSession } from 'next-auth/next';

// Mock PoolService to avoid viem mocking complexity
vi.mock('@/services/uniswap/poolService', async () => {
  const actual = await vi.importActual('@/services/uniswap/poolService');
  return {
    ...actual,
    PoolService: vi.fn().mockImplementation(() => ({
      findOrCreatePool: vi.fn().mockImplementation(async (chain, token0, token1, fee, userId) => {
        // Get the global test factories to create a real pool in the database
        const testFactories = (globalThis as any).__testFactories;
        if (testFactories) {
          // Create a real pool using the factories
          const rawPool = await testFactories.pools.createWethUsdcPool(userId, chain);
          
          // Add the resolved token data fields that the route expects
          const poolWithTokenData = {
            ...rawPool,
            token0Data: {
              symbol: chain === 'arbitrum' ? 'WETH' : 'USDC', // Token0 should be WETH for Arbitrum
              name: chain === 'arbitrum' ? 'Wrapped Ether' : 'USD Coin',
              address: token0,
              decimals: chain === 'arbitrum' ? 18 : 6
            },
            token1Data: {
              symbol: chain === 'arbitrum' ? 'USDC' : 'WETH', // Token1 should be USDC for Arbitrum 
              name: chain === 'arbitrum' ? 'USD Coin' : 'Wrapped Ether',
              address: token1,
              decimals: chain === 'arbitrum' ? 6 : 18
            }
          };
          
          return poolWithTokenData;
        }
        
        // Fallback - return a mock pool that matches the expected structure
        return {
          id: 'mock-pool-id',
          chain: chain,
          poolAddress: '0x17c14D2c404D167802b16C450d3c99F88F2c4F4d', // Arbitrum WETH/USDC pool address
          fee: fee,
          token0Data: { symbol: 'WETH', address: token0, decimals: 18 },
          token1Data: { symbol: 'USDC', address: token1, decimals: 6 },
          token0Ref: { id: 'token0-ref' },
          token1Ref: { id: 'token1-ref' }
        };
      }),
      disconnect: vi.fn().mockResolvedValue(undefined) // Add missing disconnect method
    }))
  };
});

describe('/api/positions/uniswapv3/import-nft', () => {
  let testPrisma: PrismaClient;
  let factories: ReturnType<typeof createTestFactorySuite>;

  beforeAll(async () => {
    // Set up test database
    testPrisma = new PrismaClient({
      datasources: {
        db: {
          url: 'postgresql://duncan:dev123@localhost:5432/duncan_test',
        },
      },
    });

    await testPrisma.$connect();
    
    // Initialize factories
    factories = createTestFactorySuite(testPrisma);
    
    // Inject test prisma client for API routes
    globalThis.__testPrisma = testPrisma;
    
    // Expose factories globally for PoolService mock
    (globalThis as any).__testFactories = factories;
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Clean up database before each test
    await factories.cleanup();
    
    // Create test user and mock session
    const { user, sessionData } = await factories.users.createUserForApiTest('nft-test-user');
    
    // Mock valid session for all tests - ensure it uses the same user ID
    vi.mocked(getServerSession).mockResolvedValue(sessionData as any);
    
    // Also update the mocked auth service to use the same user ID
    const { getSession } = await import('@/lib/auth');
    vi.mocked(getSession).mockResolvedValue(sessionData as any);
  });

  afterAll(async () => {
    // Final cleanup and disconnect
    await factories.cleanup();
    await testPrisma.$disconnect();
    
    // Clean up global reference and API test environment
    globalThis.__testPrisma = undefined;
    apiTestEnv.cleanup();
  });

  describe('POST', () => {
    const createRequest = (body: any) => {
      return new NextRequest('http://localhost:3000/api/positions/uniswapv3/import-nft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
    };

    it('should successfully import NFT position from Ethereum', async () => {
      const mockPosition = mockNFTPositions.ACTIVE_WETH_USDC_ETHEREUM;
      vi.mocked(fetchNFTPositionWithOwner).mockResolvedValue(mockPosition);

      const request = createRequest({
        chain: 'ethereum',
        nftId: '12345',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockPosition);
      expect(data.error).toBeUndefined();
      
      expect(fetchNFTPositionWithOwner).toHaveBeenCalledWith('ethereum', '12345');
    });

    it('should successfully import NFT position from Arbitrum', async () => {
      const mockPosition = mockNFTPositions.ACTIVE_POSITION_ARBITRUM;
      vi.mocked(fetchNFTPositionWithOwner).mockResolvedValue(mockPosition);

      const request = createRequest({
        chain: 'arbitrum',
        nftId: '54321',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockPosition);
      
      expect(fetchNFTPositionWithOwner).toHaveBeenCalledWith('arbitrum', '54321');
    });

    it('should successfully import NFT position from Base', async () => {
      const mockPosition = mockNFTPositions.ACTIVE_POSITION_BASE;
      vi.mocked(fetchNFTPositionWithOwner).mockResolvedValue(mockPosition);

      const request = createRequest({
        chain: 'base',
        nftId: '98765',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockPosition);
      
      expect(fetchNFTPositionWithOwner).toHaveBeenCalledWith('base', '98765');
    });

    it('should handle case-insensitive chain names', async () => {
      const mockPosition = mockNFTPositions.ACTIVE_WETH_USDC_ETHEREUM;
      vi.mocked(fetchNFTPositionWithOwner).mockResolvedValue(mockPosition);

      const request = createRequest({
        chain: 'ETHEREUM',
        nftId: '12345',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      
      // Should convert to lowercase before calling service
      expect(fetchNFTPositionWithOwner).toHaveBeenCalledWith('ethereum', '12345');
    });

    it('should return 400 when chain is missing', async () => {
      const request = createRequest({
        nftId: '12345',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Chain and NFT ID are required');
      expect(fetchNFTPosition).not.toHaveBeenCalled();
    });

    it('should return 400 when nftId is missing', async () => {
      const request = createRequest({
        chain: 'ethereum',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Chain and NFT ID are required');
      expect(fetchNFTPosition).not.toHaveBeenCalled();
    });

    it('should return 400 when both chain and nftId are missing', async () => {
      const request = createRequest({});

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Chain and NFT ID are required');
    });

    it('should return 400 when chain is empty string', async () => {
      const request = createRequest({
        chain: '',
        nftId: '12345',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Chain and NFT ID are required');
    });

    it('should return 400 when nftId is empty string', async () => {
      const request = createRequest({
        chain: 'ethereum',
        nftId: '',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Chain and NFT ID are required');
    });

    it('should return 400 for invalid NFT ID format (non-numeric)', async () => {
      const request = createRequest({
        chain: 'ethereum',
        nftId: 'invalid-id',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('NFT ID must be a valid positive number');
      expect(fetchNFTPosition).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid NFT ID format (zero)', async () => {
      const request = createRequest({
        chain: 'ethereum',
        nftId: '0',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('NFT ID must be a valid positive number');
    });

    it('should return 400 for invalid NFT ID format (negative)', async () => {
      const request = createRequest({
        chain: 'ethereum',
        nftId: '-123',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('NFT ID must be a valid positive number');
    });

    it('should accept valid numeric NFT ID as string', async () => {
      const mockPosition = mockNFTPositions.ACTIVE_WETH_USDC_ETHEREUM;
      vi.mocked(fetchNFTPositionWithOwner).mockResolvedValue(mockPosition);

      const request = createRequest({
        chain: 'ethereum',
        nftId: '12345',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return 400 for unsupported chain', async () => {
      const request = createRequest({
        chain: 'polygon',
        nftId: '12345',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Unsupported chain: polygon. Supported chains: ethereum, arbitrum, base');
      expect(fetchNFTPosition).not.toHaveBeenCalled();
    });

    it('should return 400 for multiple unsupported chains', async () => {
      const unsupportedChains = ['polygon', 'optimism', 'bsc', 'avalanche'];
      
      for (const chain of unsupportedChains) {
        const request = createRequest({
          chain,
          nftId: '12345',
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.success).toBe(false);
        expect(data.error).toContain(`Unsupported chain: ${chain}`);
      }
    });

    it('should return 404 when NFT does not exist', async () => {
      vi.mocked(fetchNFTPositionWithOwner).mockRejectedValue(
        new Error('NFT with ID 99999999 does not exist on ethereum')
      );

      const request = createRequest({
        chain: 'ethereum',
        nftId: '99999999',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('NFT with ID 99999999 does not exist on ethereum');
      
      expect(fetchNFTPositionWithOwner).toHaveBeenCalledWith('ethereum', '99999999');
    });

    it('should return 404 for network errors', async () => {
      vi.mocked(fetchNFTPositionWithOwner).mockRejectedValue(
        new Error('Network error while fetching position from ethereum')
      );

      const request = createRequest({
        chain: 'ethereum',
        nftId: '12345',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Network error while fetching position from ethereum');
    });

    it('should handle generic service errors', async () => {
      vi.mocked(fetchNFTPositionWithOwner).mockRejectedValue(
        new Error('Failed to fetch NFT position: Contract call failed')
      );

      const request = createRequest({
        chain: 'ethereum',
        nftId: '12345',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to fetch NFT position: Contract call failed');
    });

    it('should handle non-Error exceptions', async () => {
      vi.mocked(fetchNFTPositionWithOwner).mockRejectedValue('String error');

      const request = createRequest({
        chain: 'ethereum',
        nftId: '12345',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('String error');
    });

    it('should handle invalid JSON in request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/positions/uniswapv3/import-nft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid-json',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid request format');
      expect(fetchNFTPosition).not.toHaveBeenCalled();
    });

    it('should handle null values in request', async () => {
      const request = createRequest({
        chain: null,
        nftId: null,
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Chain and NFT ID are required');
    });
  });

  describe('GET', () => {
    it('should return 405 Method Not Allowed', async () => {
      const request = new NextRequest('http://localhost:3000/api/positions/uniswapv3/import-nft', {
        method: 'GET',
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(405);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Method not allowed');
    });
  });
});