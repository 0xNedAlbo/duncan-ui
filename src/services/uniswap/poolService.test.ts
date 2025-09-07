import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { PoolService } from './poolService';
import { mockTokens } from '../../__tests__/fixtures/tokens';
import { mockPools, mockUserTokens, mockFactoryResponses } from '../../__tests__/fixtures/pools';
import { server } from '../../__tests__/mocks/server';
import { mockViemCalls } from '../../__tests__/mocks/poolHandlers';

// Mock viem functions
vi.mock('viem', () => ({
  createPublicClient: vi.fn(() => ({
    readContract: vi.fn((params: any) => {
      const { functionName, address, args } = params;
      
      switch (functionName) {
        case 'getPool':
          return mockViemCalls.mockGetPool(args[0], args[1], args[2]);
        case 'slot0':
          return mockViemCalls.mockSlot0(address);
        case 'liquidity':
          return mockViemCalls.mockLiquidity(address);
        case 'token0':
          return mockViemCalls.mockToken0(address);
        case 'token1':
          return mockViemCalls.mockToken1(address);
        case 'fee':
          return mockViemCalls.mockFee(address);
        case 'tickSpacing':
          return mockViemCalls.mockTickSpacing(address);
        case 'name':
          return mockViemCalls.mockTokenName(address);
        case 'symbol':
          return mockViemCalls.mockTokenSymbol(address);
        case 'decimals':
          return mockViemCalls.mockTokenDecimals(address);
        default:
          throw new Error(`Unknown function: ${functionName}`);
      }
    }),
  })),
  http: vi.fn(),
}));

vi.mock('viem/chains', () => ({
  mainnet: { id: 1, name: 'Ethereum' },
  arbitrum: { id: 42161, name: 'Arbitrum' },
  base: { id: 8453, name: 'Base' },
}));

describe('PoolService', () => {
  let prisma: PrismaClient;
  let service: PoolService;
  const testUserId = 'user_test_1';

  beforeAll(() => {
    server.listen();
  });

  afterAll(() => {
    server.close();
  });

  beforeEach(async () => {
    // Use in-memory SQLite database for tests
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: 'file:./test-poolservice.db'
        }
      }
    });
    
    service = new PoolService(prisma);
    
    // Reset database state
    await prisma.$executeRaw`DELETE FROM positions`;
    await prisma.$executeRaw`DELETE FROM pools`;
    await prisma.$executeRaw`DELETE FROM user_tokens`;
    await prisma.$executeRaw`DELETE FROM tokens`;
    
    // Seed test data
    await prisma.token.createMany({
      data: [mockTokens.WETH, mockTokens.USDC]
    });
  });

  afterEach(async () => {
    server.resetHandlers();
    await service.disconnect();
  });

  describe('findOrCreatePoolLegacy', () => {
    it('should return existing pool if found', async () => {
      // Create existing pool
      const existingPool = await prisma.pool.create({
        data: mockPools.WETH_USDC_3000,
        include: { token0: true, token1: true }
      });

      const result = await service.findOrCreatePoolLegacy(
        'ethereum',
        mockTokens.WETH.address,
        mockTokens.USDC.address,
        3000,
        testUserId
      );

      expect(result.id).toBe(existingPool.id);
      expect(result.fee).toBe(3000);
      expect(result.token0Info?.symbol).toBe('WETH');
      expect(result.token1Info?.symbol).toBe('USDC');
    });

    it('should create new pool if not found', async () => {
      const result = await service.findOrCreatePoolLegacy(
        'ethereum',
        mockTokens.WETH.address,
        mockTokens.USDC.address,
        3000,
        testUserId
      );

      expect(result.poolAddress).toBe(mockFactoryResponses.WETH_USDC_3000);
      expect(result.fee).toBe(3000);
      expect(result.tickSpacing).toBe(60);
      expect(result.token0Info?.isGlobal).toBe(true);
      expect(result.token1Info?.isGlobal).toBe(true);

      // Verify pool was created in database
      const createdPool = await prisma.pool.findUnique({
        where: { id: result.id }
      });
      expect(createdPool).not.toBeNull();
    });

    it('should sort token addresses correctly', async () => {
      // Pass tokens in reverse order (USDC, WETH)
      const result = await service.findOrCreatePoolLegacy(
        'ethereum',
        mockTokens.USDC.address,
        mockTokens.WETH.address,
        3000,
        testUserId
      );

      // Should still result in WETH as token0 (lower address)
      expect(result.token0Address.toLowerCase()).toBe(mockTokens.WETH.address);
      expect(result.token1Address.toLowerCase()).toBe(mockTokens.USDC.address);
    });

    it('should throw error for invalid fee tier', async () => {
      await expect(
        service.findOrCreatePoolLegacy(
          'ethereum',
          mockTokens.WETH.address,
          mockTokens.USDC.address,
          1234, // Invalid fee
          testUserId
        )
      ).rejects.toThrow('Invalid fee tier: 1234');
    });

    it('should throw error if pool does not exist on-chain', async () => {
      // Mock a non-existent pool
      const nonExistentToken = '0x1111111111111111111111111111111111111111';
      
      await expect(
        service.findOrCreatePoolLegacy(
          'ethereum',
          mockTokens.WETH.address,
          nonExistentToken,
          3000,
          testUserId
        )
      ).rejects.toThrow('Pool does not exist on-chain');
    });

    it('should create pool with custom tokens', async () => {
      // Add custom token for user
      await prisma.userToken.create({
        data: mockUserTokens.CUSTOM_TOKEN
      });

      const result = await service.findOrCreatePoolLegacy(
        'ethereum',
        mockUserTokens.CUSTOM_TOKEN.address,
        mockTokens.USDC.address,
        3000,
        testUserId
      );

      expect(result.ownerId).toBe(testUserId);
      expect(result.token0Id).toBeNull(); // Custom token not in global table
      expect(result.token1Id).toBe(mockTokens.USDC.id); // USDC is global
      expect(result.token0Info?.isGlobal).toBe(false);
      expect(result.token1Info?.isGlobal).toBe(true);
    });
  });

  describe('getPoolById', () => {
    it('should return pool with token info when userId provided', async () => {
      const pool = await prisma.pool.create({
        data: mockPools.WETH_USDC_3000
      });

      const result = await service.getPoolById(pool.id, testUserId);

      expect(result).not.toBeNull();
      expect(result!.id).toBe(pool.id);
      expect(result!.token0Info?.symbol).toBe('WETH');
      expect(result!.token1Info?.symbol).toBe('USDC');
    });

    it('should return null for non-existent pool', async () => {
      const result = await service.getPoolById('non-existent-id', testUserId);
      expect(result).toBeNull();
    });
  });

  describe('getPoolsForTokenPair', () => {
    it('should return all pools for token pair', async () => {
      // Create multiple pools with different fees
      await prisma.pool.createMany({
        data: [
          mockPools.WETH_USDC_3000,
          mockPools.WETH_USDC_500
        ]
      });

      const results = await service.getPoolsForTokenPair(
        'ethereum',
        mockTokens.WETH.address,
        mockTokens.USDC.address,
        testUserId
      );

      expect(results).toHaveLength(2);
      expect(results.map(r => r.fee).sort()).toEqual([500, 3000]);
      expect(results[0].token0Info?.symbol).toBe('WETH');
    });

    it('should handle reversed token order', async () => {
      await prisma.pool.create({
        data: mockPools.WETH_USDC_3000
      });

      // Search with reversed token order
      const results = await service.getPoolsForTokenPair(
        'ethereum',
        mockTokens.USDC.address, // Reversed
        mockTokens.WETH.address, // Reversed
        testUserId
      );

      expect(results).toHaveLength(1);
      expect(results[0].fee).toBe(3000);
    });

    it('should return empty array for non-existent token pair', async () => {
      const results = await service.getPoolsForTokenPair(
        'ethereum',
        '0x1111111111111111111111111111111111111111',
        '0x2222222222222222222222222222222222222222',
        testUserId
      );

      expect(results).toHaveLength(0);
    });
  });

  describe('searchPools', () => {
    beforeEach(async () => {
      // Create test pools
      await prisma.pool.createMany({
        data: [
          mockPools.WETH_USDC_3000,
          mockPools.WETH_USDC_500,
          { ...mockPools.CUSTOM_TOKEN_POOL, ownerId: testUserId }
        ]
      });
    });

    it('should search pools by chain', async () => {
      const results = await service.searchPools({
        chain: 'ethereum'
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results.every(r => r.chain === 'ethereum')).toBe(true);
    });

    it('should search pools by single token', async () => {
      const results = await service.searchPools({
        token0: mockTokens.WETH.address
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results.every(r => 
        r.token0Address === mockTokens.WETH.address || 
        r.token1Address === mockTokens.WETH.address
      )).toBe(true);
    });

    it('should search pools by token pair', async () => {
      const results = await service.searchPools({
        token0: mockTokens.WETH.address,
        token1: mockTokens.USDC.address
      });

      expect(results.length).toBeGreaterThanOrEqual(2); // Both 500 and 3000 fee pools
    });

    it('should exclude user pools by default', async () => {
      const results = await service.searchPools({
        includeUserPools: false
      });

      expect(results.every(r => r.ownerId === null)).toBe(true);
    });

    it('should include user pools when requested', async () => {
      const results = await service.searchPools({
        includeUserPools: true,
        userId: testUserId
      });

      const hasUserPools = results.some(r => r.ownerId === testUserId);
      expect(hasUserPools).toBe(true);
    });
  });

  describe('updatePoolState', () => {
    it('should update pool state from blockchain', async () => {
      const pool = await prisma.pool.create({
        data: {
          ...mockPools.WETH_USDC_3000,
          currentPrice: null,
          currentTick: null
        }
      });

      await service.updatePoolState(pool.id);

      const updatedPool = await prisma.pool.findUnique({
        where: { id: pool.id }
      });

      expect(updatedPool!.currentPrice).not.toBeNull();
      expect(updatedPool!.currentTick).not.toBeNull();
      expect(updatedPool!.sqrtPriceX96).not.toBeNull();
    });

    it('should throw error for non-existent pool', async () => {
      await expect(
        service.updatePoolState('non-existent-id')
      ).rejects.toThrow('Pool not found');
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle address normalization', async () => {
      const upperCaseAddress = mockTokens.WETH.address.toUpperCase();
      
      const result = await service.findOrCreatePoolLegacy(
        'ethereum',
        upperCaseAddress,
        mockTokens.USDC.address,
        3000,
        testUserId
      );

      expect(result.token0Address).toBe(mockTokens.WETH.address.toLowerCase());
    });

    it('should handle unsupported chain', async () => {
      await expect(
        service.findOrCreatePoolLegacy(
          'unsupported-chain',
          mockTokens.WETH.address,
          mockTokens.USDC.address,
          3000,
          testUserId
        )
      ).rejects.toThrow('Unsupported chain');
    });

    it('should handle identical token addresses', async () => {
      await expect(
        service.findOrCreatePoolLegacy(
          'ethereum',
          mockTokens.WETH.address,
          mockTokens.WETH.address, // Same token
          3000,
          testUserId
        )
      ).rejects.toThrow();
    });

    it('should limit search results', async () => {
      // Create many pools (would exceed limit in real scenario)
      const results = await service.searchPools({});
      
      expect(results.length).toBeLessThanOrEqual(50); // Limit defined in service
    });
  });

  describe('integration with TokenResolutionService', () => {
    it('should resolve both global and custom tokens correctly', async () => {
      // Add custom token
      await prisma.userToken.create({
        data: mockUserTokens.CUSTOM_TOKEN
      });

      const result = await service.findOrCreatePoolLegacy(
        'ethereum',
        mockUserTokens.CUSTOM_TOKEN.address,
        mockTokens.USDC.address,
        3000,
        testUserId
      );

      expect(result.token0Info?.isGlobal).toBe(false); // Custom token
      expect(result.token1Info?.isGlobal).toBe(true);  // Global USDC
      expect(result.token0Info?.userLabel).toBe('My Test Token');
    });
  });
});