import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { TokenResolutionService } from './tokenResolutionService';
import { mockTokens } from '../../__tests__/fixtures/tokens';
import { mockUserTokens } from '../../__tests__/fixtures/pools';
import { server } from '../../__tests__/mocks/server';
import { mockViemCalls } from '../../__tests__/mocks/poolHandlers';

// Mock viem functions
vi.mock('viem', () => ({
  createPublicClient: vi.fn(() => ({
    readContract: vi.fn((params: any) => {
      const { functionName, address } = params;
      
      switch (functionName) {
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

describe('TokenResolutionService', () => {
  let prisma: PrismaClient;
  let service: TokenResolutionService;
  const testUserId = 'user_test_1';

  beforeAll(() => {
    server.listen();
  });

  afterAll(() => {
    server.close();
  });

  beforeEach(async () => {
    // Use PostgreSQL test database
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: 'postgresql://duncan:dev123@localhost:5432/duncan_test'
        }
      }
    });
    
    service = new TokenResolutionService(prisma);
    
    // Reset database state
    await prisma.$executeRaw`DELETE FROM positions`;
    await prisma.$executeRaw`DELETE FROM pools`;
    await prisma.$executeRaw`DELETE FROM token_references`;
    await prisma.$executeRaw`DELETE FROM user_tokens`;
    await prisma.$executeRaw`DELETE FROM tokens`;
    await prisma.$executeRaw`DELETE FROM users`;

    // Create test user for foreign key constraints
    await prisma.user.create({
      data: {
        id: testUserId,
        email: 'test@example.com',
        name: 'Test User',
        password: 'test123'
      }
    });
    
    // Seed test data
    await prisma.token.createMany({
      data: [mockTokens.WETH_ETHEREUM, mockTokens.USDC_ETHEREUM]
    });
  });

  afterEach(async () => {
    server.resetHandlers();
    await service.disconnect();
  });

  describe('resolveToken', () => {
    it('should return global token if verified', async () => {
      const result = await service.resolveToken(
        'ethereum',
        mockTokens.WETH_ETHEREUM.address,
        testUserId
      );

      expect(result.isGlobal).toBe(true);
      expect(result.isVerified).toBe(true);
      expect(result.symbol).toBe('WETH');
      expect(result.source).toBe('alchemy');
    });

    it('should return user token if exists in custom list', async () => {
      // Add custom token
      await prisma.userToken.create({
        data: mockUserTokens.CUSTOM_TOKEN
      });

      const result = await service.resolveToken(
        'ethereum',
        mockUserTokens.CUSTOM_TOKEN.address,
        testUserId
      );

      expect(result.isGlobal).toBe(false);
      expect(result.isVerified).toBe(false);
      expect(result.symbol).toBe('CUSTOM');
      expect(result.userLabel).toBe('My Test Token');
    });

    it('should create new token from Alchemy if available', async () => {
      const newTokenAddress = '0x6B175474E89094C44Da98b954EedeAC495271d0F'; // DAI
      
      const result = await service.resolveToken(
        'ethereum',
        newTokenAddress,
        testUserId
      );

      expect(result.isGlobal).toBe(true);
      expect(result.isVerified).toBe(true);
      
      // Verify token was created in database
      const createdToken = await prisma.token.findUnique({
        where: {
          chain_address: {
            chain: 'ethereum',
            address: newTokenAddress.toLowerCase()
          }
        }
      });
      
      expect(createdToken).not.toBeNull();
    });

    it('should create user token from contract if Alchemy fails', async () => {
      const customTokenAddress = '0x0123456789012345678901234567890123456789';
      
      const result = await service.resolveToken(
        'ethereum',
        customTokenAddress,
        testUserId
      );

      expect(result.isGlobal).toBe(false);
      expect(result.isVerified).toBe(false);
      expect(result.symbol).toBe('CUSTOM');
      expect(result.source).toBe('contract');
      
      // Verify user token was created
      const userToken = await prisma.userToken.findFirst({
        where: {
          userId: testUserId,
          address: customTokenAddress.toLowerCase()
        }
      });
      
      expect(userToken).not.toBeNull();
    });

    it('should create placeholder if both Alchemy and contract fail', async () => {
      const unknownTokenAddress = '0xffffffffffffffffffffffffffffffffffffffff';
      
      const result = await service.resolveToken(
        'ethereum',
        unknownTokenAddress,
        testUserId
      );

      expect(result.isGlobal).toBe(false);
      expect(result.isVerified).toBe(false);
      expect(result.symbol).toBe('0xffff...ffff');
      expect(result.source).toBe('placeholder');
    });

    it('should update lastUsedAt for existing user tokens', async () => {
      // Add custom token
      const originalToken = await prisma.userToken.create({
        data: mockUserTokens.CUSTOM_TOKEN
      });

      const originalLastUsed = originalToken.lastUsedAt;
      
      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));
      
      await service.resolveToken(
        'ethereum',
        mockUserTokens.CUSTOM_TOKEN.address,
        testUserId
      );

      const updatedToken = await prisma.userToken.findUnique({
        where: { id: originalToken.id }
      });

      expect(updatedToken!.lastUsedAt).not.toEqual(originalLastUsed);
    });

    it('should handle address normalization correctly', async () => {
      const upperCaseAddress = mockTokens.WETH_ETHEREUM.address.toUpperCase();
      
      const result = await service.resolveToken(
        'ethereum',
        upperCaseAddress,
        testUserId
      );

      expect(result.address).toBe(mockTokens.WETH_ETHEREUM.address.toLowerCase());
    });

    it('should throw error for invalid address format', async () => {
      await expect(
        service.resolveToken('ethereum', 'invalid-address', testUserId)
      ).rejects.toThrow('Invalid Ethereum address');
    });

    it('should throw error for unsupported chain', async () => {
      await expect(
        service.resolveToken('unsupported-chain', mockTokens.WETH_ETHEREUM.address, testUserId)
      ).rejects.toThrow('Unsupported chain');
    });
  });

  describe('resolveTokens', () => {
    it('should resolve multiple tokens efficiently', async () => {
      const tokens = [
        { chain: 'ethereum', address: mockTokens.WETH_ETHEREUM.address },
        { chain: 'ethereum', address: mockTokens.USDC_ETHEREUM.address },
      ];

      const results = await service.resolveTokens(tokens, testUserId);

      expect(results).toHaveLength(2);
      expect(results[0].symbol).toBe('WETH');
      expect(results[1].symbol).toBe('USDC');
      expect(results.every(r => r.isGlobal)).toBe(true);
    });
  });

  describe('addCustomToken', () => {
    it('should add custom token successfully', async () => {
      const tokenData = {
        chain: 'ethereum',
        address: '0x1111111111111111111111111111111111111111',
        symbol: 'TEST',
        name: 'Test Token',
        decimals: 18,
        userLabel: 'My Test Token',
        notes: 'Added manually',
      };

      const result = await service.addCustomToken(testUserId, tokenData);

      expect(result.symbol).toBe('TEST');
      expect(result.userLabel).toBe('My Test Token');
      expect(result.source).toBe('manual');
    });

    it('should throw error if token already exists', async () => {
      await prisma.userToken.create({
        data: mockUserTokens.CUSTOM_TOKEN
      });

      const tokenData = {
        chain: mockUserTokens.CUSTOM_TOKEN.chain,
        address: mockUserTokens.CUSTOM_TOKEN.address,
        symbol: 'DUPLICATE',
        name: 'Duplicate Token',
        decimals: 18,
      };

      await expect(
        service.addCustomToken(testUserId, tokenData)
      ).rejects.toThrow('Token already exists in your custom list');
    });
  });

  describe('updateUserToken', () => {
    it('should update user token successfully', async () => {
      const token = await prisma.userToken.create({
        data: mockUserTokens.CUSTOM_TOKEN
      });

      const updates = {
        userLabel: 'Updated Label',
        notes: 'Updated notes',
      };

      const result = await service.updateUserToken(
        testUserId,
        token.id,
        updates
      );

      expect(result.userLabel).toBe('Updated Label');
      expect(result.notes).toBe('Updated notes');
    });

    it('should throw error if token not found or not owned', async () => {
      await expect(
        service.updateUserToken(testUserId, 'non-existent-id', {})
      ).rejects.toThrow('Token not found or not owned by user');
    });
  });

  describe('removeUserToken', () => {
    it('should remove user token successfully', async () => {
      const token = await prisma.userToken.create({
        data: mockUserTokens.CUSTOM_TOKEN
      });

      await service.removeUserToken(testUserId, token.id);

      const deletedToken = await prisma.userToken.findUnique({
        where: { id: token.id }
      });

      expect(deletedToken).toBeNull();
    });

    it('should throw error if token is used in pools', async () => {
      const token = await prisma.userToken.create({
        data: mockUserTokens.CUSTOM_TOKEN
      });

      // Create TokenReferences first
      const token0Ref = await prisma.tokenReference.create({
        data: {
          tokenType: 'user',
          userTokenId: token.id,
          chain: 'ethereum',
          address: token.address,
          symbol: token.symbol,
        },
      });
      const token1Ref = await prisma.tokenReference.create({
        data: {
          tokenType: 'global',
          globalTokenId: mockTokens.USDC_ETHEREUM.id,
          chain: 'ethereum',
          address: mockTokens.USDC_ETHEREUM.address,
          symbol: 'USDC',
        },
      });

      // Create a pool that uses this token
      await prisma.pool.create({
        data: {
          chain: 'ethereum',
          poolAddress: '0x1234567890123456789012345678901234567890',
          token0RefId: token0Ref.id,
          token1RefId: token1Ref.id,
          token0Address: token.address,
          token1Address: mockTokens.USDC_ETHEREUM.address,
          fee: 3000,
          tickSpacing: 60,
          ownerId: testUserId,
        }
      });

      await expect(
        service.removeUserToken(testUserId, token.id)
      ).rejects.toThrow('Cannot remove token that is used in pools');
    });
  });

  describe('getUserTokens', () => {
    it('should get user tokens filtered by chain', async () => {
      await prisma.userToken.createMany({
        data: [
          { ...mockUserTokens.CUSTOM_TOKEN },
          { ...mockUserTokens.PLACEHOLDER_TOKEN }
        ]
      });

      const tokens = await service.getUserTokens(testUserId, 'ethereum');

      expect(tokens).toHaveLength(2);
      expect(tokens.every(t => t.chain === 'ethereum')).toBe(true);
    });

    it('should get all user tokens if no chain filter', async () => {
      await prisma.userToken.createMany({
        data: [
          { ...mockUserTokens.CUSTOM_TOKEN },
          { ...mockUserTokens.PLACEHOLDER_TOKEN, id: 'usertoken_placeholder_2', chain: 'arbitrum' }
        ]
      });

      const tokens = await service.getUserTokens(testUserId);

      expect(tokens).toHaveLength(2);
    });
  });

  describe('enrichUserTokens', () => {
    it('should upgrade custom tokens to global when they become available', async () => {
      // Add a placeholder token for a known address that will be found by Alchemy (WETH)
      const wethAddress = mockTokens.WETH_ETHEREUM.address;
      await prisma.userToken.create({
        data: {
          ...mockUserTokens.PLACEHOLDER_TOKEN,
          address: wethAddress,
          source: 'placeholder',
          symbol: 'UNKNOWN',
          name: 'Unknown Token'
        }
      });

      const enrichedCount = await service.enrichUserTokens(testUserId);

      expect(enrichedCount).toBe(1);

      // Verify token was moved to global (should already exist from seed data)
      const globalToken = await prisma.token.findUnique({
        where: {
          chain_address: {
            chain: 'ethereum',
            address: wethAddress
          }
        }
      });

      expect(globalToken).not.toBeNull();
      expect(globalToken!.verified).toBe(true);

      // Verify user token was removed
      const userToken = await prisma.userToken.findFirst({
        where: {
          userId: testUserId,
          address: wethAddress
        }
      });

      expect(userToken).toBeNull();
    });
  });
});